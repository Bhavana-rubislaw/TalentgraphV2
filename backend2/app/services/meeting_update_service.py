"""Service layer orchestration for meeting update endpoint."""

import logging
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import and_, delete as sql_delete
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.models import Meeting, MeetingParticipant, MeetingStatus, User
from app.services.meeting_dispatch_service import MeetingDispatchService
from app.schemas import MeetingRead
from app.services.meeting_conflict_service import MeetingConflictService
from app.services.meeting_email_service import MeetingEmailService
from app.services.meeting_service import MeetingService
from app.services.user_context_service import UserContextService

logger = logging.getLogger(__name__)


class MeetingUpdateService:
    @staticmethod
    def update_meeting(*, meeting_id: int, update_data, current_user: dict, session: Session):
        logger.info(
            f"PATCH /meetings/{meeting_id} - User: {current_user['email']} (ID: {current_user['user_id']})"
        )

        try:
            meeting = session.get(Meeting, meeting_id)
            if not meeting:
                raise HTTPException(status_code=404, detail="Meeting not found")

            current_user_obj = UserContextService.get_user_by_email_or_404(
                session,
                current_user["email"],
            )
            if current_user_obj.role == "candidate":
                raise HTTPException(status_code=403, detail="Candidates cannot edit meeting details")

            if meeting.organizer_user_id != current_user["user_id"]:
                raise HTTPException(status_code=403, detail="Only organizer can update meeting")

            if meeting.status != MeetingStatus.SCHEDULED:
                raise HTTPException(status_code=400, detail="Can only update scheduled meetings")

            new_start = update_data.scheduled_start or meeting.scheduled_start
            new_end = update_data.scheduled_end or meeting.scheduled_end

            if new_start != meeting.scheduled_start or new_end != meeting.scheduled_end:
                for participant in meeting.participants:
                    has_conflict = MeetingConflictService.check_availability_conflict(
                        session,
                        participant.user_id,
                        new_start,
                        new_end,
                        exclude_meeting_id=meeting.id,
                    )
                    if has_conflict:
                        raise HTTPException(
                            status_code=409,
                            detail=f"User {participant.user_id} has a scheduling conflict",
                        )

            if update_data.participants is not None:
                new_participant_ids = []
                for participant_spec in update_data.participants:
                    user = session.exec(select(User).where(User.email == participant_spec.email)).first()
                    if not user:
                        raise HTTPException(
                            status_code=404,
                            detail=f"User with email '{participant_spec.email}' not found",
                        )
                    if user.full_name.lower() != participant_spec.name.lower():
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                f"Name mismatch for email '{participant_spec.email}': expected "
                                f"'{participant_spec.name}' but found '{user.full_name}'"
                            ),
                        )
                    new_participant_ids.append(user.id)

                existing_participant_ids = {p.user_id for p in meeting.participants}
                new_participant_ids_set = set(new_participant_ids)
                participants_to_remove = existing_participant_ids - new_participant_ids_set
                participants_to_add = new_participant_ids_set - existing_participant_ids

                if participants_to_remove:
                    stmt = sql_delete(MeetingParticipant).where(
                        and_(
                            MeetingParticipant.meeting_id == meeting.id,
                            MeetingParticipant.user_id.in_(participants_to_remove),
                        )
                    ).execution_options(synchronize_session=False)
                    session.exec(stmt)

                if participants_to_add:
                    for user_id in participants_to_add:
                        session.add(
                            MeetingParticipant(
                                meeting_id=meeting.id,
                                user_id=user_id,
                                is_required=True,
                                has_confirmed=(user_id == meeting.organizer_user_id),
                            )
                        )

                session.commit()

                meeting = session.exec(
                    select(Meeting)
                    .where(Meeting.id == meeting.id)
                    .options(selectinload(Meeting.participants).selectinload(MeetingParticipant.user))
                ).first()

                email_service = MeetingEmailService(queue_mode=True)

                if participants_to_add:
                    for user_id in participants_to_add:
                        recipient = UserContextService.get_user_by_id_optional(session, user_id)
                        if recipient and user_id != current_user["user_id"]:
                            confirm_token = MeetingService.generate_action_token(
                                session, meeting.id, user_id, "confirm"
                            )
                            cancel_token = MeetingService.generate_action_token(
                                session, meeting.id, user_id, "cancel"
                            )
                            reschedule_token = MeetingService.generate_action_token(
                                session, meeting.id, user_id, "reschedule"
                            )
                            email_service.send_interview_scheduled_email(
                                session=session,
                                meeting=meeting,
                                recipient_user=recipient,
                                organizer_user=current_user_obj,
                                confirm_token=confirm_token,
                                cancel_token=cancel_token,
                                reschedule_token=reschedule_token,
                            )

                if participants_to_remove:
                    for user_id in participants_to_remove:
                        recipient = UserContextService.get_user_by_id_optional(session, user_id)
                        if recipient and user_id != current_user["user_id"]:
                            email_service.send_interview_cancelled_email(
                                session=session,
                                meeting=meeting,
                                recipient_user=recipient,
                                cancelled_by_user=current_user_obj,
                                cancellation_reason=(
                                    f"You have been removed from this meeting by "
                                    f"{current_user_obj.full_name}."
                                ),
                            )

            meeting = session.exec(
                select(Meeting)
                .where(Meeting.id == meeting_id)
                .options(selectinload(Meeting.participants).selectinload(MeetingParticipant.user))
            ).first()

            update_dict = update_data.model_dump(exclude_unset=True, exclude={"participants"})
            time_or_detail_changed = any(
                k in update_dict
                for k in (
                    "scheduled_start",
                    "scheduled_end",
                    "duration_minutes",
                    "timezone",
                    "title",
                    "description",
                    "video_meeting_url",
                    "location",
                )
            )

            for key, value in update_dict.items():
                setattr(meeting, key, value)

            meeting.updated_at = datetime.utcnow()
            session.commit()

            meeting = session.exec(
                select(Meeting)
                .where(Meeting.id == meeting.id)
                .options(selectinload(Meeting.participants).selectinload(MeetingParticipant.user))
            ).first()

            current_user_obj_notify = UserContextService.get_user_by_id_optional(
                session,
                current_user["user_id"],
            )
            user_full_name_notify = (
                current_user_obj_notify.full_name if current_user_obj_notify else "Organizer"
            )
            participant_ids = [p.user_id for p in meeting.participants]
            MeetingDispatchService.notify_user_ids(
                session=session,
                user_ids=participant_ids,
                title="Meeting Updated",
                message=f"{user_full_name_notify} updated meeting '{meeting.title}'",
                event_type="meeting_updated",
                route=f"/meetings/{meeting.id}",
            )

            organizer_in_participants = any(
                p.user_id == meeting.organizer_user_id for p in meeting.participants
            )
            if not organizer_in_participants:
                MeetingDispatchService.notify_user_ids(
                    session=session,
                    user_ids=[meeting.organizer_user_id],
                    title="Meeting Updated",
                    message=f"Meeting '{meeting.title}' has been updated",
                    event_type="meeting_updated",
                    route=f"/meetings/{meeting.id}",
                )

            if time_or_detail_changed:
                email_service = MeetingEmailService(queue_mode=True)
                all_notify_ids = {p.user_id for p in meeting.participants}
                all_notify_ids.add(meeting.organizer_user_id)
                for uid in all_notify_ids:
                    recipient = UserContextService.get_user_by_id_optional(session, uid)
                    if recipient:
                        try:
                            confirm_token = MeetingService.generate_action_token(
                                session, meeting.id, recipient.id, "confirm"
                            )
                            cancel_token = MeetingService.generate_action_token(
                                session, meeting.id, recipient.id, "cancel"
                            )
                            email_service.send_meeting_updated_email(
                                session=session,
                                meeting=meeting,
                                recipient_user=recipient,
                                editor_user=current_user_obj,
                                confirm_token=confirm_token,
                                cancel_token=cancel_token,
                            )
                        except Exception as email_err:
                            logger.warning(
                                f"Could not send updated-meeting email to {recipient.email}: {email_err}"
                            )

            return MeetingRead.from_orm_with_participants(meeting)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(
                f"ERROR in PATCH /meetings/{meeting_id}: {type(e).__name__}: {str(e)}",
                exc_info=True,
            )
            session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to update meeting: {str(e)}")
