"""Test what Meeting Type enum value is"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.models import MeetingType, MeetingStatus

print("MeetingType.INTERVIEW =", repr(MeetingType.INTERVIEW))
print("MeetingType.INTERVIEW.value =", repr(MeetingType.INTERVIEW.value))
print("str(MeetingType.INTERVIEW) =", repr(str(MeetingType.INTERVIEW)))

print("\nMeetingStatus.SCHEDULED =", repr(MeetingStatus.SCHEDULED))
print("MeetingStatus.SCHEDULED.value =", repr(MeetingStatus.SCHEDULED.value))
