# """Interview scheduling orchestration for application workflows."""

# import logging
# import os
# from datetime import datetime
# from typing import Any, Optional

# from fastapi import HTTPException
# from sqlmodel import Session, select

# from app.emailer import EmailConfigError, send_interview_schedule_email
# from app.models import (
#     Application,
#     Candidate,
#     Company,
#     JobPosting,
#     Meeting,
#     MeetingParticipant,
#     MeetingStatus,
#     User,
#     VideoProvider,
# )
# from app.routers.notifications import push_notification
# from app.services.audit import log_activity_event
# from app.services.user_context_service import UserContextService
# from app.services.video_providers import VideoProviderError, VideoProviderFactory

# logger = logging.getLogger(__name__)


# class InterviewSchedulingService:
#     """Service for scheduling interviews for application flows."""

#     @staticmethod
#     def schedule_interview(
#         *,
#         application_id: int,
#         payload: dict[str, Any],
#         current_user: dict,
#         session: Session,
#         request_id: Optional[str] = None,
#     ) -> dict[str, Any]:
#         logger.info(f"[INTERVIEW] === ENDPOINT CALLED === Application ID: {application_id}")

#         start_time = payload.get("start_time")
#         end_time = payload.get("end_time")
#         legacy_time = payload.get("time")
#         date_value = payload.get("date")
#         timezone_value = payload.get("timezone")
#         meeting_provider = payload.get("meeting_provider")
#         meeting_link_payload = payload.get("meeting_link")
#         notes_for_candidate = payload.get("notes_for_candidate")
#         email_subject = payload.get("email_subject")

#         # Support both old 'time' field and new 'start_time/end_time' fields.
#         time_display = legacy_time or f"{start_time} - {end_time}" if start_time and end_time else "N/A"
#         logger.info(
#             f"[INTERVIEW] Received payload: date={date_value}, time={time_display}, "
#             f"timezone={timezone_value}, meeting_provider={meeting_provider}, meeting_link={meeting_link_payload}"
#         )
#         logger.info(f"[INTERVIEW] Current user: {current_user.get('email')}")

#         user = UserContextService.get_user_by_email_or_404(session, current_user["email"])
#         company = UserContextService.get_company_for_user_or_403(
#             session,
#             user.id,
#             detail="Only recruiters can schedule interviews",
#         )

#         application = session.get(Application, application_id)
#         if not application:
#             raise HTTPException(status_code=404, detail="Application not found")

#         job_posting = session.get(JobPosting, application.job_posting_id)
#         if not job_posting or job_posting.company_id != company.id:
#             raise HTTPException(
#                 status_code=403,
#                 detail="You can only schedule interviews for your own job postings",
#             )

#         candidate = session.get(Candidate, application.candidate_id)
#         if not candidate:
#             raise HTTPException(status_code=404, detail="Candidate not found")

#         candidate_email = candidate.user.email if candidate.user else None
#         if not candidate_email or "@" not in candidate_email:
#             raise HTTPException(status_code=400, detail="Candidate email not found")

#         candidate_name = getattr(candidate, "name", None) or candidate_email.split("@")[0]

#         interview_start_time = start_time or legacy_time
#         interview_end_time = end_time
#         if not interview_start_time:
#             raise HTTPException(status_code=400, detail="Interview start time is required")

#         interview_dt_obj = None
#         interview_end_dt_obj = None
#         if interview_end_time:
#             interview_datetime_str = f"{date_value} from {interview_start_time} to {interview_end_time}"
#         else:
#             interview_datetime_str = f"{date_value} at {interview_start_time}"

#         try:
#             from dateutil import parser as date_parser

#             datetime_str = f"{date_value} {interview_start_time}"
#             interview_dt_obj = date_parser.parse(datetime_str)
#             logger.info(f"[INTERVIEW] Parsed start datetime: {interview_dt_obj}")

#             if interview_end_time:
#                 end_datetime_str = f"{date_value} {interview_end_time}"
#                 interview_end_dt_obj = date_parser.parse(end_datetime_str)
#                 logger.info(f"[INTERVIEW] Parsed end datetime: {interview_end_dt_obj}")
#         except ImportError:
#             logger.warning("[INTERVIEW] python-dateutil not installed, using basic datetime parsing")
#             try:
#                 from datetime import datetime as dt

#                 datetime_str = f"{date_value} {interview_start_time}"
#                 interview_dt_obj = dt.strptime(datetime_str, "%B %d, %Y %I:%M %p")
#                 logger.info(f"[INTERVIEW] Parsed start datetime with strptime: {interview_dt_obj}")

#                 if interview_end_time:
#                     end_datetime_str = f"{date_value} {interview_end_time}"
#                     interview_end_dt_obj = dt.strptime(end_datetime_str, "%B %d, %Y %I:%M %p")
#                     logger.info(f"[INTERVIEW] Parsed end datetime with strptime: {interview_end_dt_obj}")
#             except Exception as fallback_error:
#                 logger.error(
#                     f"[INTERVIEW] Failed to parse datetime with fallback: {date_value} {legacy_time} - {fallback_error}"
#                 )
#         except Exception as e:
#             logger.error(f"[INTERVIEW] Error parsing datetime: {e}")

#         meeting_link = None
#         video_provider_used = None

#         if meeting_link_payload:
#             meeting_link = meeting_link_payload.strip()
#             if not (meeting_link.startswith("http://") or meeting_link.startswith("https://")):
#                 raise HTTPException(status_code=400, detail="Invalid meeting link - must be a valid URL")
#             logger.info("[INTERVIEW] Using manual meeting link")
#         elif meeting_provider:
#             logger.info(f"[INTERVIEW] Auto-generating meeting link using {meeting_provider}")

#             provider_map = {
#                 "zoom": VideoProvider.ZOOM,
#                 "google_meet": VideoProvider.GOOGLE_MEET,
#                 "microsoft_teams": VideoProvider.MICROSOFT_TEAMS,
#             }

#             if meeting_provider not in provider_map:
#                 raise HTTPException(
#                     status_code=400,
#                     detail=(
#                         f"Invalid meeting provider: {meeting_provider}. Must be 'zoom', "
#                         "'google_meet', or 'microsoft_teams'"
#                     ),
#                 )

#             provider_enum = provider_map[meeting_provider]
#             api_key = None
#             api_secret = None
#             access_token = None
#             account_id = None

#             if provider_enum == VideoProvider.ZOOM:
#                 api_key = os.getenv("ZOOM_API_KEY") or os.getenv("ZOOM_CLIENT_ID")
#                 api_secret = os.getenv("ZOOM_API_SECRET") or os.getenv("ZOOM_CLIENT_SECRET")
#                 account_id = os.getenv("ZOOM_ACCOUNT_ID")
#             elif provider_enum == VideoProvider.GOOGLE_MEET:
#                 api_key = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("GOOGLE_MEET_CLIENT_ID")
#                 api_secret = os.getenv("GOOGLE_CLIENT_SECRET") or os.getenv("GOOGLE_MEET_CLIENT_SECRET")
#                 access_token = os.getenv("GOOGLE_MEET_ACCESS_TOKEN")
#             elif provider_enum == VideoProvider.MICROSOFT_TEAMS:
#                 api_key = os.getenv("MICROSOFT_CLIENT_ID")
#                 api_secret = os.getenv("MICROSOFT_CLIENT_SECRET")

#             if provider_enum == VideoProvider.ZOOM:
#                 if not api_key or not api_secret:
#                     raise HTTPException(
#                         status_code=400,
#                         detail=(
#                             "Zoom requires ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET in .env file. "
#                             "Please configure them or provide a manual meeting link."
#                         ),
#                     )
#                 if not account_id:
#                     raise HTTPException(
#                         status_code=400,
#                         detail=(
#                             "Zoom OAuth requires ZOOM_ACCOUNT_ID to be configured in .env file. "
#                             "Please add it or provide a manual meeting link."
#                         ),
#                     )
#             elif provider_enum == VideoProvider.GOOGLE_MEET:
#                 if not access_token:
#                     raise HTTPException(
#                         status_code=400,
#                         detail=(
#                             "Google Meet integration requires GOOGLE_MEET_ACCESS_TOKEN in .env file. "
#                             "Note: Google access tokens expire hourly and need refresh tokens. "
#                             "For production use, consider using Zoom (which supports Server-to-Server OAuth) "
#                             "or provide a manual meeting link. See: "
#                             "https://developers.google.com/identity/protocols/oauth2"
#                         ),
#                     )
#             elif provider_enum == VideoProvider.MICROSOFT_TEAMS:
#                 if not api_key or not api_secret:
#                     raise HTTPException(
#                         status_code=400,
#                         detail=(
#                             "Microsoft Teams requires MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in .env file. "
#                             "Please configure them or provide a manual meeting link."
#                         ),
#                     )

#             logger.info(f"[INTERVIEW] Using {meeting_provider} credentials from .env")

#             try:
#                 provider = VideoProviderFactory.get_provider(
#                     provider=provider_enum,
#                     api_key=api_key,
#                     api_secret=api_secret,
#                     access_token=access_token,
#                     account_id=account_id,
#                 )

#                 meeting_start_time = interview_dt_obj if interview_dt_obj else interview_datetime_str

#                 duration_minutes = 60
#                 if interview_dt_obj and interview_end_dt_obj:
#                     time_diff = interview_end_dt_obj - interview_dt_obj
#                     duration_minutes = int(time_diff.total_seconds() / 60)
#                     logger.info(f"[INTERVIEW] Calculated duration: {duration_minutes} minutes")

#                 meeting_details = provider.create_meeting(
#                     title=f"{job_posting.job_title} Interview - {candidate_name}",
#                     start_time=meeting_start_time,
#                     duration_minutes=duration_minutes,
#                     description=f"Interview for {job_posting.job_title} position at {company.company_name}",
#                     waiting_room=True,
#                     timezone=timezone_value,
#                 )

#                 logger.info(f"[INTERVIEW] Meeting details returned: {meeting_details}")

#                 meeting_link = meeting_details.get("meeting_url")
#                 video_provider_used = provider_enum.value

#                 if not meeting_link:
#                     logger.error(f"[INTERVIEW] No meeting_url in response! Keys: {list(meeting_details.keys())}")
#                     raise HTTPException(
#                         status_code=502,
#                         detail=(
#                             f"Failed to generate {meeting_provider} meeting link. "
#                             "The provider did not return a valid meeting URL. "
#                             "Please use a manual link instead."
#                         ),
#                     )

#                 logger.info(f"[INTERVIEW] Auto-generated {video_provider_used} meeting link: {meeting_link}")
#             except VideoProviderError as e:
#                 logger.error(f"[INTERVIEW] Video provider error: {e}")
#                 raise HTTPException(
#                     status_code=500,
#                     detail=f"Failed to generate {meeting_provider} meeting link: {str(e)}",
#                 )
#             except Exception as e:
#                 logger.error(f"[INTERVIEW] Unexpected error generating meeting link: {e}")
#                 raise HTTPException(
#                     status_code=500,
#                     detail=(
#                         f"Failed to generate {meeting_provider} meeting link. "
#                         f"Please check your {meeting_provider.upper()} API credentials in .env file "
#                         "or provide a manual link."
#                     ),
#                 )
#         else:
#             raise HTTPException(
#                 status_code=400,
#                 detail=(
#                     "Meeting link is required. Either provide a manual link "
#                     "or select a meeting provider for auto-generation."
#                 ),
#             )

#         if not meeting_link:
#             logger.error("[INTERVIEW] Meeting link is None after all processing")
#             raise HTTPException(
#                 status_code=502,
#                 detail="Meeting link generation failed. Please try providing a manual link instead.",
#             )

#         recruiter_name = (
#             getattr(user, "full_name", None)
#             or getattr(user, "name", None)
#             or getattr(company, "company_name", "Recruiter")
#         )
#         recruiter_email = user.email
#         company_name = getattr(company, "company_name", "Our Company")
#         job_title = getattr(job_posting, "job_title", "the position")

#         email_sent = False
#         email_error = None

#         logger.info(f"[INTERVIEW] Starting interview scheduling for application {application_id}")
#         logger.info(f"[INTERVIEW] Candidate: {candidate_name} ({candidate_email})")
#         logger.info(f"[INTERVIEW] Recruiter: {recruiter_name} ({recruiter_email})")
#         logger.info(f"[INTERVIEW] Job: {job_title} at {company_name}")

#         try:
#             email_sent = send_interview_schedule_email(
#                 candidate_email=candidate_email,
#                 candidate_name=candidate_name,
#                 recruiter_name=recruiter_name,
#                 recruiter_email=recruiter_email,
#                 company_name=company_name,
#                 job_title=job_title,
#                 interview_datetime=interview_datetime_str,
#                 timezone=timezone_value,
#                 meeting_link=meeting_link,
#                 notes=notes_for_candidate,
#                 custom_subject=email_subject,
#             )
#             logger.info(f"[INTERVIEW] Email sent successfully for application {application_id}")
#         except EmailConfigError:
#             email_error = "SMTP credentials not configured"
#             logger.warning(f"[INTERVIEW] Email not sent for application {application_id}: {email_error}")
#         except Exception as e:
#             email_error = str(e)
#             logger.error(f"[INTERVIEW] Failed to send email for application {application_id}: {email_error}")
#             logger.error(f"[INTERVIEW] Exception type: {type(e).__name__}")
#             import traceback

#             logger.error(f"[INTERVIEW] Traceback: {traceback.format_exc()}")

#         candidate_user = session.exec(select(User).where(User.id == candidate.user_id)).first()

#         if candidate_user:
#             try:
#                 push_notification(
#                     session,
#                     user_id=candidate_user.id,
#                     title=f"📅 Interview Scheduled: {job_title}",
#                     message=(
#                         f"Your interview with {company_name} has been scheduled for "
#                         f"{interview_datetime_str} ({timezone_value})"
#                     ),
#                     event_type="interview_scheduled",
#                     route="/candidate-dashboard",
#                     route_context={
#                         "tab": "applications",
#                         "applicationId": application.id,
#                         "meeting_link": meeting_link,
#                         "interview_datetime": interview_datetime_str,
#                         "timezone": timezone_value,
#                         "entity_type": "application",
#                         "entity_id": application.id,
#                     },
#                 )
#                 logger.info(f"[INTERVIEW] In-app notification created for user {candidate_user.id}")
#             except Exception as e:
#                 logger.error(f"[INTERVIEW] Failed to create notification: {e}")

#         try:
#             log_activity_event(
#                 session,
#                 entity_type="application",
#                 entity_id=application.id,
#                 action="interview_scheduled",
#                 performed_by_user=user,
#                 before_value=None,
#                 after_value={
#                     "interview_datetime": interview_datetime_str,
#                     "timezone": timezone_value,
#                     "meeting_link": meeting_link,
#                     "candidate_email": candidate_email,
#                     "recruiter_name": recruiter_name,
#                     "notes": notes_for_candidate,
#                 },
#                 request_id=request_id,
#             )
#         except Exception as e:
#             logger.error(f"[INTERVIEW] Failed to log audit event: {e}")

#         if email_sent:
#             try:
#                 old_status = application.status
#                 application.status = "scheduled"
#                 application.last_status_updated_at = datetime.utcnow()
#                 application.last_status_updated_by_user_id = user.id
#                 session.add(application)
#                 session.flush()

#                 logger.info(
#                     f"[INTERVIEW] Updated application {application_id} status from '{old_status}' to 'scheduled'"
#                 )

#                 log_activity_event(
#                     session,
#                     entity_type="application",
#                     entity_id=application.id,
#                     action="status_changed",
#                     performed_by_user=user,
#                     before_value={"status": old_status},
#                     after_value={"status": "scheduled"},
#                     request_id=request_id,
#                 )

#                 try:
#                     scheduled_start = None
#                     scheduled_end = None
#                     if interview_dt_obj:
#                         scheduled_start = interview_dt_obj
#                         if interview_end_dt_obj:
#                             scheduled_end = interview_end_dt_obj
#                         else:
#                             from datetime import timedelta

#                             scheduled_end = interview_dt_obj + timedelta(minutes=60)

#                     candidate_user = session.exec(select(User).where(User.id == candidate.user_id)).first()

#                     duration_minutes = 60
#                     if interview_dt_obj and interview_end_dt_obj:
#                         time_diff = interview_end_dt_obj - interview_dt_obj
#                         duration_minutes = int(time_diff.total_seconds() / 60)

#                     meeting = Meeting(
#                         title=f"Interview: {candidate_name} - {job_posting.job_title}",
#                         description=(
#                             notes_for_candidate
#                             or f"Interview with {candidate_name} for {job_posting.job_title}"
#                         ),
#                         scheduled_start=scheduled_start or datetime.utcnow(),
#                         scheduled_end=scheduled_end or datetime.utcnow(),
#                         duration_minutes=duration_minutes,
#                         timezone=timezone_value or "UTC",
#                         location=meeting_link,
#                         video_meeting_url=meeting_link,
#                         status=MeetingStatus.SCHEDULED,
#                         organizer_user_id=user.id,
#                         application_id=application.id,
#                         video_provider=video_provider_used,
#                     )
#                     session.add(meeting)
#                     session.flush()

#                     logger.info(f"[INTERVIEW] Created Meeting record ID: {meeting.id}")

#                     recruiter_participant = MeetingParticipant(
#                         meeting_id=meeting.id,
#                         user_id=user.id,
#                         is_required=True,
#                         has_confirmed=True,
#                     )
#                     session.add(recruiter_participant)

#                     if candidate_user:
#                         candidate_participant = MeetingParticipant(
#                             meeting_id=meeting.id,
#                             user_id=candidate_user.id,
#                             is_required=True,
#                             has_confirmed=False,
#                         )
#                         session.add(candidate_participant)
#                         logger.info("[INTERVIEW] Created MeetingParticipant records for recruiter and candidate")

#                     session.flush()
#                 except Exception as e:
#                     logger.error(f"[INTERVIEW] Failed to create Meeting record: {e}")
#             except Exception as e:
#                 logger.error(f"[INTERVIEW] Failed to update application status: {e}")

#         session.commit()

#         if email_sent:
#             message = (
#                 f"Interview scheduled! Emails sent to candidate ({candidate_email}) and recruiter "
#                 f"({recruiter_email}) from TalentGraph Interviews"
#             )
#             success = True
#         elif email_error:
#             message = f"Interview scheduled. In-app notification sent, but email failed: {email_error}"
#             success = True
#         else:
#             message = "Interview scheduled but notifications may have failed"
#             success = True

#         return {
#             "success": success,
#             "message": message,
#             "application_id": application.id,
#             "candidate_email": candidate_email,
#             "recruiter_email": recruiter_email,
#             "from_email": os.getenv(
#                 "SMTP_FROM_EMAIL", os.getenv("MAIL_FROM", "talentgraph.interviews@gmail.com")
#             ),
#             "scheduled_by": recruiter_email,
#             "interview_datetime": interview_datetime_str,
#             "timezone": timezone_value,
#             "meeting_link": meeting_link,
#             "video_provider": video_provider_used,
#             "auto_generated": video_provider_used is not None,
#             "email_sent": email_sent,
#             "email_error": email_error,
#             "notification_sent": candidate_user is not None,
#         }
"""Interview scheduling orchestration for application workflows."""

import logging
import os
from datetime import datetime
from typing import Any, Optional

from fastapi import HTTPException
from sqlmodel import Session, select

from app.emailer import EmailConfigError, send_interview_schedule_email
from app.models import (
    Application,
    Candidate,
    Company,
    JobPosting,
    Meeting,
    MeetingParticipant,
    MeetingStatus,
    User,
    VideoProvider,
)
from app.routers.notifications import push_notification
from app.services.audit import log_activity_event
from app.services.user_context_service import UserContextService
from app.services.video_providers import VideoProviderError, VideoProviderFactory

logger = logging.getLogger(__name__)


class InterviewSchedulingService:
    """Service for scheduling interviews for application flows."""

    @staticmethod
    def schedule_interview(
        *,
        application_id: int,
        payload: dict[str, Any],
        current_user: dict,
        session: Session,
        request_id: Optional[str] = None,
    ) -> dict[str, Any]:
        logger.info(
            "[INTERVIEW] endpoint_called application_id=%s request_id=%s",
            application_id, request_id,
        )

        start_time = payload.get("start_time")
        end_time = payload.get("end_time")
        legacy_time = payload.get("time")
        date_value = payload.get("date")
        timezone_value = payload.get("timezone")
        meeting_provider = payload.get("meeting_provider")
        meeting_link_payload = payload.get("meeting_link")
        notes_for_candidate = payload.get("notes_for_candidate")
        email_subject = payload.get("email_subject")

        # Support both old 'time' field and new 'start_time/end_time' fields.
        time_display = legacy_time or f"{start_time} - {end_time}" if start_time and end_time else "N/A"
        logger.info(
            "[INTERVIEW] received_payload application_id=%s date=%s time=%s timezone=%s meeting_provider=%s meeting_link=%s",
            application_id, date_value, time_display, timezone_value, meeting_provider, meeting_link_payload,
        )
        logger.info("[INTERVIEW] current_user application_id=%s email=%s", application_id, current_user.get('email'))

        user = UserContextService.get_user_by_email_or_404(session, current_user["email"])
        company = UserContextService.get_company_for_user_or_403(
            session,
            user.id,
            detail="Only recruiters can schedule interviews",
        )

        application = session.get(Application, application_id)
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        job_posting = session.get(JobPosting, application.job_posting_id)
        if not job_posting or job_posting.company_id != company.id:
            raise HTTPException(
                status_code=403,
                detail="You can only schedule interviews for your own job postings",
            )

        candidate = session.get(Candidate, application.candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        candidate_email = candidate.user.email if candidate.user else None
        if not candidate_email or "@" not in candidate_email:
            raise HTTPException(status_code=400, detail="Candidate email not found")

        candidate_name = getattr(candidate, "name", None) or candidate_email.split("@")[0]

        interview_start_time = start_time or legacy_time
        interview_end_time = end_time
        if not interview_start_time:
            raise HTTPException(status_code=400, detail="Interview start time is required")

        interview_dt_obj = None
        interview_end_dt_obj = None
        if interview_end_time:
            interview_datetime_str = f"{date_value} from {interview_start_time} to {interview_end_time}"
        else:
            interview_datetime_str = f"{date_value} at {interview_start_time}"

        try:
            from dateutil import parser as date_parser

            datetime_str = f"{date_value} {interview_start_time}"
            interview_dt_obj = date_parser.parse(datetime_str)
            logger.info("[INTERVIEW] parsed_start_datetime application_id=%s value=%s", application_id, interview_dt_obj)

            if interview_end_time:
                end_datetime_str = f"{date_value} {interview_end_time}"
                interview_end_dt_obj = date_parser.parse(end_datetime_str)
                logger.info("[INTERVIEW] parsed_end_datetime application_id=%s value=%s", application_id, interview_end_dt_obj)
        except ImportError:
            logger.warning("[INTERVIEW] dateutil_missing application_id=%s using_fallback_parser=True", application_id)
            try:
                from datetime import datetime as dt

                datetime_str = f"{date_value} {interview_start_time}"
                interview_dt_obj = dt.strptime(datetime_str, "%B %d, %Y %I:%M %p")
                logger.info(
                    "[INTERVIEW] parsed_start_datetime_fallback application_id=%s value=%s",
                    application_id, interview_dt_obj,
                )

                if interview_end_time:
                    end_datetime_str = f"{date_value} {interview_end_time}"
                    interview_end_dt_obj = dt.strptime(end_datetime_str, "%B %d, %Y %I:%M %p")
                    logger.info(
                        "[INTERVIEW] parsed_end_datetime_fallback application_id=%s value=%s",
                        application_id, interview_end_dt_obj,
                    )
            except Exception as fallback_error:
                logger.error(
                    "[INTERVIEW] datetime_parse_fallback_failed application_id=%s date=%s time=%s error=%s",
                    application_id, date_value, legacy_time, fallback_error,
                )
        except Exception as e:
            logger.error("[INTERVIEW] datetime_parse_failed application_id=%s error=%s", application_id, e)

        meeting_link = None
        video_provider_used = None

        if meeting_link_payload:
            meeting_link = meeting_link_payload.strip()
            if not (meeting_link.startswith("http://") or meeting_link.startswith("https://")):
                raise HTTPException(status_code=400, detail="Invalid meeting link - must be a valid URL")
            logger.info("[INTERVIEW] using_manual_meeting_link application_id=%s", application_id)
        elif meeting_provider:
            logger.info(
                "[INTERVIEW] auto_generating_meeting_link application_id=%s provider=%s",
                application_id, meeting_provider,
            )

            provider_map = {
                "zoom": VideoProvider.ZOOM,
                "google_meet": VideoProvider.GOOGLE_MEET,
                "microsoft_teams": VideoProvider.MICROSOFT_TEAMS,
            }

            if meeting_provider not in provider_map:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Invalid meeting provider: {meeting_provider}. Must be 'zoom', "
                        "'google_meet', or 'microsoft_teams'"
                    ),
                )

            provider_enum = provider_map[meeting_provider]
            api_key = None
            api_secret = None
            access_token = None
            account_id = None

            if provider_enum == VideoProvider.ZOOM:
                api_key = os.getenv("ZOOM_API_KEY") or os.getenv("ZOOM_CLIENT_ID")
                api_secret = os.getenv("ZOOM_API_SECRET") or os.getenv("ZOOM_CLIENT_SECRET")
                account_id = os.getenv("ZOOM_ACCOUNT_ID")
            elif provider_enum == VideoProvider.GOOGLE_MEET:
                api_key = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("GOOGLE_MEET_CLIENT_ID")
                api_secret = os.getenv("GOOGLE_CLIENT_SECRET") or os.getenv("GOOGLE_MEET_CLIENT_SECRET")
                access_token = os.getenv("GOOGLE_MEET_ACCESS_TOKEN")
            elif provider_enum == VideoProvider.MICROSOFT_TEAMS:
                api_key = os.getenv("MICROSOFT_CLIENT_ID")
                api_secret = os.getenv("MICROSOFT_CLIENT_SECRET")

            if provider_enum == VideoProvider.ZOOM:
                if not api_key or not api_secret:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Zoom requires ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET in .env file. "
                            "Please configure them or provide a manual meeting link."
                        ),
                    )
                if not account_id:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Zoom OAuth requires ZOOM_ACCOUNT_ID to be configured in .env file. "
                            "Please add it or provide a manual meeting link."
                        ),
                    )
            elif provider_enum == VideoProvider.GOOGLE_MEET:
                if not access_token:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Google Meet integration requires GOOGLE_MEET_ACCESS_TOKEN in .env file. "
                            "Note: Google access tokens expire hourly and need refresh tokens. "
                            "For production use, consider using Zoom (which supports Server-to-Server OAuth) "
                            "or provide a manual meeting link. See: "
                            "https://developers.google.com/identity/protocols/oauth2"
                        ),
                    )
            elif provider_enum == VideoProvider.MICROSOFT_TEAMS:
                if not api_key or not api_secret:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Microsoft Teams requires MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in .env file. "
                            "Please configure them or provide a manual meeting link."
                        ),
                    )

            logger.info("[INTERVIEW] using_env_credentials application_id=%s provider=%s", application_id, meeting_provider)

            try:
                provider = VideoProviderFactory.get_provider(
                    provider=provider_enum,
                    api_key=api_key,
                    api_secret=api_secret,
                    access_token=access_token,
                    account_id=account_id,
                )

                meeting_start_time = interview_dt_obj if interview_dt_obj else interview_datetime_str

                duration_minutes = 60
                if interview_dt_obj and interview_end_dt_obj:
                    time_diff = interview_end_dt_obj - interview_dt_obj
                    duration_minutes = int(time_diff.total_seconds() / 60)
                    logger.info(
                        "[INTERVIEW] calculated_duration application_id=%s duration_minutes=%s",
                        application_id, duration_minutes,
                    )

                meeting_details = provider.create_meeting(
                    title=f"{job_posting.job_title} Interview - {candidate_name}",
                    start_time=meeting_start_time,
                    duration_minutes=duration_minutes,
                    description=f"Interview for {job_posting.job_title} position at {company.company_name}",
                    waiting_room=True,
                    timezone=timezone_value,
                )

                logger.info("[INTERVIEW] provider_meeting_details application_id=%s details=%s", application_id, meeting_details)

                meeting_link = meeting_details.get("meeting_url")
                video_provider_used = provider_enum.value

                if not meeting_link:
                    logger.error(
                        "[INTERVIEW] meeting_url_missing application_id=%s response_keys=%s",
                        application_id, list(meeting_details.keys()),
                    )
                    raise HTTPException(
                        status_code=502,
                        detail=(
                            f"Failed to generate {meeting_provider} meeting link. "
                            "The provider did not return a valid meeting URL. "
                            "Please use a manual link instead."
                        ),
                    )

                logger.info(
                    "[INTERVIEW] meeting_link_generated application_id=%s provider=%s meeting_link=%s",
                    application_id, video_provider_used, meeting_link,
                )
            except VideoProviderError as e:
                logger.error("[INTERVIEW] video_provider_error application_id=%s error=%s", application_id, e)
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to generate {meeting_provider} meeting link: {str(e)}",
                )
            except Exception as e:
                logger.error("[INTERVIEW] meeting_link_generation_error application_id=%s error=%s", application_id, e)
                raise HTTPException(
                    status_code=500,
                    detail=(
                        f"Failed to generate {meeting_provider} meeting link. "
                        f"Please check your {meeting_provider.upper()} API credentials in .env file "
                        "or provide a manual link."
                    ),
                )
        else:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Meeting link is required. Either provide a manual link "
                    "or select a meeting provider for auto-generation."
                ),
            )

        if not meeting_link:
            logger.error("[INTERVIEW] meeting_link_still_none application_id=%s", application_id)
            raise HTTPException(
                status_code=502,
                detail="Meeting link generation failed. Please try providing a manual link instead.",
            )

        recruiter_name = (
            getattr(user, "full_name", None)
            or getattr(user, "name", None)
            or getattr(company, "company_name", "Recruiter")
        )
        recruiter_email = user.email
        company_name = getattr(company, "company_name", "Our Company")
        job_title = getattr(job_posting, "job_title", "the position")

        email_sent = False
        email_error = None

        logger.info("[INTERVIEW] starting_interview_scheduling application_id=%s request_id=%s", application_id, request_id)
        logger.info("[INTERVIEW] candidate application_id=%s name=%s email=%s", application_id, candidate_name, candidate_email)
        logger.info("[INTERVIEW] recruiter application_id=%s name=%s email=%s", application_id, recruiter_name, recruiter_email)
        logger.info("[INTERVIEW] job application_id=%s title=%s company=%s", application_id, job_title, company_name)

        try:
            email_sent = send_interview_schedule_email(
                candidate_email=candidate_email,
                candidate_name=candidate_name,
                recruiter_name=recruiter_name,
                recruiter_email=recruiter_email,
                company_name=company_name,
                job_title=job_title,
                interview_datetime=interview_datetime_str,
                timezone=timezone_value,
                meeting_link=meeting_link,
                notes=notes_for_candidate,
                custom_subject=email_subject,
            )
            logger.info("[INTERVIEW] email_sent application_id=%s", application_id)
        except EmailConfigError:
            email_error = "SMTP credentials not configured"
            logger.warning("[INTERVIEW] email_not_sent application_id=%s reason=%s", application_id, email_error)
        except Exception as e:
            email_error = str(e)
            logger.error("[INTERVIEW] email_send_failed application_id=%s error=%s", application_id, email_error)
            logger.error(
                "[INTERVIEW] email_send_exception_type application_id=%s exception_type=%s",
                application_id, type(e).__name__,
            )
            import traceback

            logger.error(
                "[INTERVIEW] email_send_traceback application_id=%s traceback=%s",
                application_id, traceback.format_exc(),
            )

        candidate_user = session.exec(select(User).where(User.id == candidate.user_id)).first()

        if candidate_user:
            try:
                push_notification(
                    session,
                    user_id=candidate_user.id,
                    title=f"📅 Interview Scheduled: {job_title}",
                    message=(
                        f"Your interview with {company_name} has been scheduled for "
                        f"{interview_datetime_str} ({timezone_value})"
                    ),
                    event_type="interview_scheduled",
                    route="/candidate-dashboard",
                    route_context={
                        "tab": "applications",
                        "applicationId": application.id,
                        "meeting_link": meeting_link,
                        "interview_datetime": interview_datetime_str,
                        "timezone": timezone_value,
                        "entity_type": "application",
                        "entity_id": application.id,
                    },
                )
                logger.info(
                    "[INTERVIEW] in_app_notification_created application_id=%s user_id=%s",
                    application_id, candidate_user.id,
                )
            except Exception as e:
                logger.error("[INTERVIEW] notification_creation_failed application_id=%s error=%s", application_id, e)

        try:
            log_activity_event(
                session,
                entity_type="application",
                entity_id=application.id,
                action="interview_scheduled",
                performed_by_user=user,
                before_value=None,
                after_value={
                    "interview_datetime": interview_datetime_str,
                    "timezone": timezone_value,
                    "meeting_link": meeting_link,
                    "candidate_email": candidate_email,
                    "recruiter_name": recruiter_name,
                    "notes": notes_for_candidate,
                },
                request_id=request_id,
            )
        except Exception as e:
            logger.error(
                "[INTERVIEW] audit_log_failed application_id=%s request_id=%s error=%s",
                application_id, request_id, e,
            )

        if email_sent:
            try:
                old_status = application.status
                application.status = "scheduled"
                application.last_status_updated_at = datetime.utcnow()
                application.last_status_updated_by_user_id = user.id
                session.add(application)
                session.flush()

                logger.info(
                    "[INTERVIEW] application_status_updated application_id=%s old_status=%s new_status=scheduled",
                    application_id, old_status,
                )

                log_activity_event(
                    session,
                    entity_type="application",
                    entity_id=application.id,
                    action="status_changed",
                    performed_by_user=user,
                    before_value={"status": old_status},
                    after_value={"status": "scheduled"},
                    request_id=request_id,
                )

                try:
                    scheduled_start = None
                    scheduled_end = None
                    if interview_dt_obj:
                        scheduled_start = interview_dt_obj
                        if interview_end_dt_obj:
                            scheduled_end = interview_end_dt_obj
                        else:
                            from datetime import timedelta

                            scheduled_end = interview_dt_obj + timedelta(minutes=60)

                    candidate_user = session.exec(select(User).where(User.id == candidate.user_id)).first()

                    duration_minutes = 60
                    if interview_dt_obj and interview_end_dt_obj:
                        time_diff = interview_end_dt_obj - interview_dt_obj
                        duration_minutes = int(time_diff.total_seconds() / 60)

                    meeting = Meeting(
                        title=f"Interview: {candidate_name} - {job_posting.job_title}",
                        description=(
                            notes_for_candidate
                            or f"Interview with {candidate_name} for {job_posting.job_title}"
                        ),
                        scheduled_start=scheduled_start or datetime.utcnow(),
                        scheduled_end=scheduled_end or datetime.utcnow(),
                        duration_minutes=duration_minutes,
                        timezone=timezone_value or "UTC",
                        location=meeting_link,
                        video_meeting_url=meeting_link,
                        status=MeetingStatus.SCHEDULED,
                        organizer_user_id=user.id,
                        application_id=application.id,
                        video_provider=video_provider_used,
                    )
                    session.add(meeting)
                    session.flush()

                    logger.info("[INTERVIEW] meeting_created application_id=%s meeting_id=%s", application_id, meeting.id)

                    recruiter_participant = MeetingParticipant(
                        meeting_id=meeting.id,
                        user_id=user.id,
                        is_required=True,
                        has_confirmed=True,
                    )
                    session.add(recruiter_participant)

                    if candidate_user:
                        candidate_participant = MeetingParticipant(
                            meeting_id=meeting.id,
                            user_id=candidate_user.id,
                            is_required=True,
                            has_confirmed=False,
                        )
                        session.add(candidate_participant)
                        logger.info(
                            "[INTERVIEW] meeting_participants_created application_id=%s meeting_id=%s",
                            application_id, meeting.id,
                        )

                    session.flush()
                except Exception as e:
                    logger.error("[INTERVIEW] meeting_creation_failed application_id=%s error=%s", application_id, e)
            except Exception as e:
                logger.error("[INTERVIEW] application_status_update_failed application_id=%s error=%s", application_id, e)

        session.commit()

        if email_sent:
            message = (
                f"Interview scheduled! Emails sent to candidate ({candidate_email}) and recruiter "
                f"({recruiter_email}) from TalentGraph Interviews"
            )
            success = True
        elif email_error:
            message = f"Interview scheduled. In-app notification sent, but email failed: {email_error}"
            success = True
        else:
            message = "Interview scheduled but notifications may have failed"
            success = True

        return {
            "success": success,
            "message": message,
            "application_id": application.id,
            "candidate_email": candidate_email,
            "recruiter_email": recruiter_email,
            "from_email": os.getenv(
                "SMTP_FROM_EMAIL", os.getenv("MAIL_FROM", "talentgraph.interviews@gmail.com")
            ),
            "scheduled_by": recruiter_email,
            "interview_datetime": interview_datetime_str,
            "timezone": timezone_value,
            "meeting_link": meeting_link,
            "video_provider": video_provider_used,
            "auto_generated": video_provider_used is not None,
            "email_sent": email_sent,
            "email_error": email_error,
            "notification_sent": candidate_user is not None,
        }