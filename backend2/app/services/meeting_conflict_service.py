# """Shared availability conflict and slot search logic for meetings workflows."""

# import logging
# from datetime import datetime, timedelta
# from typing import List, Optional

# from sqlalchemy import and_
# from sqlmodel import Session, select

# from app.models import Meeting, MeetingParticipant, MeetingStatus

# logger = logging.getLogger(__name__)


# class MeetingConflictService:
#     @staticmethod
#     def check_availability_conflict(
#         session: Session,
#         user_id: int,
#         start_time: datetime,
#         end_time: datetime,
#         exclude_meeting_id: Optional[int] = None,
#     ) -> bool:
#         logger.debug(
#             f"[MEETING_CONFLICT] check user_id={user_id} start={start_time} end={end_time} exclude={exclude_meeting_id}"
#         )
#         query = select(Meeting).join(MeetingParticipant).where(
#             and_(
#                 MeetingParticipant.user_id == user_id,
#                 Meeting.status == MeetingStatus.SCHEDULED,
#                 Meeting.scheduled_start < end_time,
#                 Meeting.scheduled_end > start_time,
#             )
#         )

#         if exclude_meeting_id:
#             query = query.where(Meeting.id != exclude_meeting_id)

#         has_conflict = len(session.exec(query).all()) > 0
#         logger.debug(f"[MEETING_CONFLICT] result user_id={user_id} has_conflict={has_conflict}")
#         return has_conflict

#     @staticmethod
#     def find_available_slots(
#         session: Session,
#         user_ids: List[int],
#         duration_minutes: int,
#         start_range: datetime,
#         end_range: datetime,
#         max_slots: int = 10,
#     ) -> List[dict]:
#         logger.info(
#             f"[MEETING_CONFLICT] find_slots users={user_ids} duration={duration_minutes} start={start_range} end={end_range} max={max_slots}"
#         )
#         slots = []
#         current_slot = start_range
#         slot_duration = timedelta(minutes=duration_minutes)

#         while current_slot + slot_duration <= end_range and len(slots) < max_slots:
#             slot_end = current_slot + slot_duration
#             all_available = True

#             for user_id in user_ids:
#                 if MeetingConflictService.check_availability_conflict(
#                     session,
#                     user_id,
#                     current_slot,
#                     slot_end,
#                 ):
#                     all_available = False
#                     break

#             if all_available:
#                 slots.append(
#                     {
#                         "start": current_slot,
#                         "end": slot_end,
#                         "available": True,
#                     }
#                 )

#             current_slot += timedelta(hours=1)

#         logger.info(f"[MEETING_CONFLICT] find_slots result count={len(slots)}")
#         return slots
"""Shared availability conflict and slot search logic for meetings workflows."""

import logging
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy import and_
from sqlmodel import Session, select

from app.models import Meeting, MeetingParticipant, MeetingStatus

logger = logging.getLogger(__name__)


class MeetingConflictService:
    @staticmethod
    def check_availability_conflict(
        session: Session,
        user_id: int,
        start_time: datetime,
        end_time: datetime,
        exclude_meeting_id: Optional[int] = None,
    ) -> bool:
        logger.debug(
            "[MEETING_CONFLICT] check user_id=%s start=%s end=%s exclude_meeting_id=%s",
            user_id, start_time, end_time, exclude_meeting_id,
        )
        query = select(Meeting).join(MeetingParticipant).where(
            and_(
                MeetingParticipant.user_id == user_id,
                Meeting.status == MeetingStatus.SCHEDULED,
                Meeting.scheduled_start < end_time,
                Meeting.scheduled_end > start_time,
            )
        )

        if exclude_meeting_id:
            query = query.where(Meeting.id != exclude_meeting_id)

        has_conflict = len(session.exec(query).all()) > 0
        logger.debug("[MEETING_CONFLICT] result user_id=%s has_conflict=%s", user_id, has_conflict)
        return has_conflict

    @staticmethod
    def find_available_slots(
        session: Session,
        user_ids: List[int],
        duration_minutes: int,
        start_range: datetime,
        end_range: datetime,
        max_slots: int = 10,
    ) -> List[dict]:
        logger.info(
            "[MEETING_CONFLICT] find_slots user_ids=%s duration_minutes=%s start=%s end=%s max_slots=%s",
            user_ids, duration_minutes, start_range, end_range, max_slots,
        )
        slots = []
        current_slot = start_range
        slot_duration = timedelta(minutes=duration_minutes)

        while current_slot + slot_duration <= end_range and len(slots) < max_slots:
            slot_end = current_slot + slot_duration
            all_available = True

            for user_id in user_ids:
                if MeetingConflictService.check_availability_conflict(
                    session,
                    user_id,
                    current_slot,
                    slot_end,
                ):
                    all_available = False
                    break

            if all_available:
                slots.append(
                    {
                        "start": current_slot,
                        "end": slot_end,
                        "available": True,
                    }
                )

            current_slot += timedelta(hours=1)

        logger.info("[MEETING_CONFLICT] find_slots result count=%s", len(slots))
        return slots