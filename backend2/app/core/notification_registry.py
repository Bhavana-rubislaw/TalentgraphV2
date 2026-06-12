"""
Notification Taxonomy Registry — TalentGraph V2
================================================
Centralized registry of all notification event types with metadata.
This ensures consistency across the application and prevents drift.

DO NOT add new event types without updating this registry.
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from dataclasses import dataclass


class NotificationPriority(str, Enum):
    """Priority levels for notifications"""
    URGENT = "urgent"      # Immediate attention (offers, interviews)
    NORMAL = "normal"      # Standard notifications
    LOW = "low"           # Background updates


class NotificationCategory(str, Enum):
    """Logical grouping categories"""
    APPLICATIONS = "applications"
    MATCHES = "matches"
    INTERVIEWS = "interviews"
    MESSAGES = "messages"
    JOBS = "jobs"
    SYSTEM = "system"


class NotificationChannel(str, Enum):
    """Delivery channels"""
    IN_APP = "in_app"
    EMAIL = "email"


@dataclass
class NotificationSpec:
    """Specification for a notification event type"""
    event_type: str
    display_name: str
    priority: NotificationPriority
    category: NotificationCategory
    default_channels: List[NotificationChannel]
    action_route_template: str  # e.g., "/applications/{application_id}"
    dedup_window_minutes: int = 0  # 0 = no deduplication
    description: str = ""
    
    def get_action_route(self, **params) -> str:
        """Generate action route with parameters"""
        try:
            return self.action_route_template.format(**params)
        except KeyError as e:
            return self.action_route_template


# ================================
# CANDIDATE NOTIFICATION TYPES (9)
# ================================

CANDIDATE_NOTIFICATIONS = {
    "application_submitted": NotificationSpec(
        event_type="application_submitted",
        display_name="Application Submitted",
        priority=NotificationPriority.NORMAL,
        category=NotificationCategory.APPLICATIONS,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/candidate/applications",
        dedup_window_minutes=5,
        description="Confirmation that application was successfully submitted"
    ),
    
    "application_status": NotificationSpec(
        event_type="application_status",
        display_name="Application Status Update",
        priority=NotificationPriority.NORMAL,
        category=NotificationCategory.APPLICATIONS,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/candidate/applications",
        dedup_window_minutes=5,
        description="Application status changed (submitted, under review, shortlisted, rejected)"
    ),
    
    "match_found": NotificationSpec(
        event_type="match_found",
        display_name="New Job Match",
        priority=NotificationPriority.NORMAL,
        category=NotificationCategory.MATCHES,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/candidate/matches",
        dedup_window_minutes=30,
        description="New job matched based on profile and preferences"
    ),
    
    "shortlisted": NotificationSpec(
        event_type="shortlisted",
        display_name="Application Shortlisted",
        priority=NotificationPriority.URGENT,
        category=NotificationCategory.APPLICATIONS,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/candidate/applications",
        dedup_window_minutes=0,
        description="Application shortlisted by recruiter"
    ),
    
    "invitation": NotificationSpec(
        event_type="invitation",
        display_name="Job Invitation",
        priority=NotificationPriority.URGENT,
        category=NotificationCategory.APPLICATIONS,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/candidate/invites",
        dedup_window_minutes=0,
        description="Recruiter invited you to apply for a position"
    ),
    
    "interview_scheduled": NotificationSpec(
        event_type="interview_scheduled",
        display_name="Interview Scheduled",
        priority=NotificationPriority.URGENT,
        category=NotificationCategory.INTERVIEWS,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/candidate/interviews",
        dedup_window_minutes=0,
        description="Interview scheduled with recruiter"
    ),
    
    "interview_reminder": NotificationSpec(
        event_type="interview_reminder",
        display_name="Interview Reminder",
        priority=NotificationPriority.URGENT,
        category=NotificationCategory.INTERVIEWS,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/candidate/interviews",
        dedup_window_minutes=0,
        description="Reminder for upcoming interview"
    ),
    
    "message_received": NotificationSpec(
        event_type="message_received",
        display_name="New Message",
        priority=NotificationPriority.NORMAL,
        category=NotificationCategory.MESSAGES,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/candidate/messages",
        dedup_window_minutes=5,
        description="New message from recruiter"
    ),
    
    "job_recommendation": NotificationSpec(
        event_type="job_recommendation",
        display_name="Job Recommendation",
        priority=NotificationPriority.LOW,
        category=NotificationCategory.JOBS,
        default_channels=[NotificationChannel.IN_APP],
        action_route_template="/candidate/jobs",
        dedup_window_minutes=60,
        description="Personalized job recommendation"
    ),

    "conversation_started": NotificationSpec(
        event_type="conversation_started",
        display_name="Conversation Started",
        priority=NotificationPriority.NORMAL,
        category=NotificationCategory.MESSAGES,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/candidate/messages",
        dedup_window_minutes=5,
        description="A recruiter has started a conversation with you"
    ),
}


# =================================
# RECRUITER NOTIFICATION TYPES (6)
# =================================

RECRUITER_NOTIFICATIONS = {
    "application_received": NotificationSpec(
        event_type="application_received",
        display_name="New Application",
        priority=NotificationPriority.NORMAL,
        category=NotificationCategory.APPLICATIONS,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/recruiter/applications/{application_id}",
        dedup_window_minutes=5,
        description="New application received for job posting"
    ),
    
    "candidate_match": NotificationSpec(
        event_type="candidate_match",
        display_name="Candidate Match",
        priority=NotificationPriority.NORMAL,
        category=NotificationCategory.MATCHES,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/recruiter/matches",
        dedup_window_minutes=30,
        description="New candidate matched for job posting"
    ),
    
    "recruiter_interview_scheduled": NotificationSpec(
        event_type="recruiter_interview_scheduled",
        display_name="Interview Scheduled",
        priority=NotificationPriority.URGENT,
        category=NotificationCategory.INTERVIEWS,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/recruiter/interviews",
        dedup_window_minutes=0,
        description="Interview scheduled with candidate"
    ),
    
    "interview_confirmed": NotificationSpec(
        event_type="interview_confirmed",
        display_name="Interview Confirmed",
        priority=NotificationPriority.URGENT,
        category=NotificationCategory.INTERVIEWS,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/recruiter/interviews",
        dedup_window_minutes=0,
        description="Candidate confirmed interview"
    ),
    
    "recruiter_message_received": NotificationSpec(
        event_type="recruiter_message_received",
        display_name="New Message",
        priority=NotificationPriority.NORMAL,
        category=NotificationCategory.MESSAGES,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/recruiter/messages",
        dedup_window_minutes=5,
        description="New message from candidate"
    ),
    
    "job_update": NotificationSpec(
        event_type="job_update",
        display_name="Job Posting Update",
        priority=NotificationPriority.LOW,
        category=NotificationCategory.JOBS,
        default_channels=[NotificationChannel.IN_APP],
        action_route_template="/recruiter/jobs/{job_posting_id}",
        dedup_window_minutes=10,
        description="Update on job posting (applications, views, etc.)"
    ),

    "job_posting_frozen": NotificationSpec(
        event_type="job_posting_frozen",
        display_name="Job Posting Frozen",
        priority=NotificationPriority.NORMAL,
        category=NotificationCategory.JOBS,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/recruiter/job-postings",
        dedup_window_minutes=0,
        description="Job posting has been frozen and is no longer accepting applications"
    ),

    "job_posting_reactivated": NotificationSpec(
        event_type="job_posting_reactivated",
        display_name="Job Posting Reactivated",
        priority=NotificationPriority.NORMAL,
        category=NotificationCategory.JOBS,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/recruiter/job-postings",
        dedup_window_minutes=0,
        description="Job posting reactivated and now accepting applications again"
    ),

    "job_posting_reposted": NotificationSpec(
        event_type="job_posting_reposted",
        display_name="Job Posting Reposted",
        priority=NotificationPriority.NORMAL,
        category=NotificationCategory.JOBS,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/recruiter/job-postings",
        dedup_window_minutes=0,
        description="Job posting refreshed and relisted for increased visibility"
    ),

    "job_posting_cancelled": NotificationSpec(
        event_type="job_posting_cancelled",
        display_name="Job Posting Cancelled",
        priority=NotificationPriority.URGENT,
        category=NotificationCategory.JOBS,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/recruiter/job-postings",
        dedup_window_minutes=0,
        description="Job posting permanently cancelled"
    ),

    "team_invite_sent": NotificationSpec(
        event_type="team_invite_sent",
        display_name="Team Invitation Sent",
        priority=NotificationPriority.NORMAL,
        category=NotificationCategory.SYSTEM,
        default_channels=[NotificationChannel.IN_APP],
        action_route_template="/recruiter/team",
        dedup_window_minutes=2,
        description="Confirmation that a team invitation was sent successfully"
    ),

    "team_member_joined": NotificationSpec(
        event_type="team_member_joined",
        display_name="Team Member Joined",
        priority=NotificationPriority.NORMAL,
        category=NotificationCategory.SYSTEM,
        default_channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        action_route_template="/recruiter/team",
        dedup_window_minutes=0,
        description="An invited team member accepted the invitation and joined the team"
    ),
}


# =================================
# MASTER REGISTRY
# =================================

NOTIFICATION_REGISTRY: Dict[str, NotificationSpec] = {
    **CANDIDATE_NOTIFICATIONS,
    **RECRUITER_NOTIFICATIONS,
}


# =================================
# HELPER FUNCTIONS
# =================================

def get_notification_spec(event_type: str) -> Optional[NotificationSpec]:
    """Get notification specification by event type"""
    return NOTIFICATION_REGISTRY.get(event_type)


def validate_event_type(event_type: str) -> bool:
    """Check if event type is valid"""
    return event_type in NOTIFICATION_REGISTRY


def get_default_channels(event_type: str) -> List[NotificationChannel]:
    """Get default channels for an event type"""
    spec = get_notification_spec(event_type)
    return spec.default_channels if spec else [NotificationChannel.IN_APP]


def get_priority(event_type: str) -> NotificationPriority:
    """Get priority for an event type"""
    spec = get_notification_spec(event_type)
    return spec.priority if spec else NotificationPriority.NORMAL


def get_category(event_type: str) -> NotificationCategory:
    """Get category for an event type"""
    spec = get_notification_spec(event_type)
    return spec.category if spec else NotificationCategory.SYSTEM


def get_action_route(event_type: str, **params) -> str:
    """Get action route with parameters"""
    spec = get_notification_spec(event_type)
    return spec.get_action_route(**params) if spec else "/"


def should_deduplicate(event_type: str) -> bool:
    """Check if event type should be deduplicated"""
    spec = get_notification_spec(event_type)
    return spec.dedup_window_minutes > 0 if spec else False


def get_dedup_window(event_type: str) -> int:
    """Get deduplication window in minutes"""
    spec = get_notification_spec(event_type)
    return spec.dedup_window_minutes if spec else 0


def list_event_types_by_category(category: NotificationCategory) -> List[str]:
    """List all event types in a category"""
    return [
        spec.event_type 
        for spec in NOTIFICATION_REGISTRY.values() 
        if spec.category == category
    ]


def list_all_event_types() -> List[str]:
    """List all valid event types"""
    return list(NOTIFICATION_REGISTRY.keys())
