"""
Notification Payload Schemas — TalentGraph V2
==============================================
Standardized payload structures for notification actions and context.
All notifications must use these schemas to ensure consistency.
"""

from typing import Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, validator
import json


class NotificationAction(BaseModel):
    """Standardized action structure for notifications"""
    
    type: Literal["navigate", "open_modal", "open_drawer", "external_link"] = Field(
        description="Type of action to perform"
    )
    
    route: str = Field(
        description="Target route or URL (e.g., '/applications/123')"
    )
    
    label: str = Field(
        default="View",
        description="Button/link label shown to user"
    )
    
    params: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional parameters for the action"
    )
    
    @validator("route")
    def validate_route(cls, v):
        """Ensure route is not empty"""
        if not v or v.strip() == "":
            raise ValueError("Route cannot be empty")
        return v


class NotificationContextData(BaseModel):
    """Context data for notification (entity IDs, metadata)"""
    
    job_posting_id: Optional[int] = None
    application_id: Optional[int] = None
    candidate_id: Optional[int] = None
    recruiter_id: Optional[int] = None
    meeting_id: Optional[int] = None
    message_id: Optional[int] = None
    match_id: Optional[int] = None
    
    # Additional metadata
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    candidate_name: Optional[str] = None
    recruiter_name: Optional[str] = None
    status: Optional[str] = None
    
    class Config:
        extra = "allow"  # Allow additional fields


class NotificationPayload(BaseModel):
    """Complete notification payload structure
    
    This is the standardized format stored in Notification.payload (as JSON string).
    All new notifications MUST use this structure.
    """
    
    action: NotificationAction = Field(
        description="Primary action for the notification"
    )
    
    secondary_action: Optional[NotificationAction] = Field(
        default=None,
        description="Optional secondary action (e.g., 'Dismiss')"
    )
    
    context: NotificationContextData = Field(
        default_factory=NotificationContextData,
        description="Entity IDs and metadata"
    )
    
    # Legacy support
    route: Optional[str] = Field(
        default=None,
        description="DEPRECATED: Use action.route instead"
    )
    route_context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="DEPRECATED: Use context instead"
    )
    
    def to_json_string(self) -> str:
        """Convert to JSON string for database storage"""
        return self.model_dump_json(exclude_none=True)
    
    @classmethod
    def from_json_string(cls, json_str: str) -> "NotificationPayload":
        """Parse from JSON string"""
        try:
            data = json.loads(json_str)
            return cls(**data)
        except Exception as e:
            # Return minimal valid payload if parsing fails
            return cls(
                action=NotificationAction(
                    type="navigate",
                    route="/",
                    label="View"
                )
            )
    
    @classmethod
    def from_legacy_format(cls, route: str, route_context: Optional[Dict] = None) -> "NotificationPayload":
        """Create payload from legacy format for backward compatibility"""
        return cls(
            action=NotificationAction(
                type="navigate",
                route=route,
                label="View",
                params=route_context
            ),
            context=NotificationContextData(**route_context) if route_context else NotificationContextData(),
            route=route,
            route_context=route_context
        )


# ==========================================
# BUILDER HELPERS
# ==========================================

def build_application_payload(
    application_id: int,
    job_title: Optional[str] = None,
    company_name: Optional[str] = None,
    status: Optional[str] = None
) -> NotificationPayload:
    """Build payload for application-related notifications"""
    return NotificationPayload(
        action=NotificationAction(
            type="navigate",
            route=f"/applications/{application_id}",
            label="View Application"
        ),
        context=NotificationContextData(
            application_id=application_id,
            job_title=job_title,
            company_name=company_name,
            status=status
        )
    )


def build_interview_payload(
    meeting_id: int,
    job_title: Optional[str] = None,
    company_name: Optional[str] = None
) -> NotificationPayload:
    """Build payload for interview-related notifications"""
    return NotificationPayload(
        action=NotificationAction(
            type="navigate",
            route=f"/interviews",
            label="View Interview",
            params={"meeting_id": meeting_id}
        ),
        context=NotificationContextData(
            meeting_id=meeting_id,
            job_title=job_title,
            company_name=company_name
        )
    )


def build_message_payload(
    message_id: int,
    sender_name: Optional[str] = None,
    conversation_id: Optional[int] = None
) -> NotificationPayload:
    """Build payload for message notifications"""
    return NotificationPayload(
        action=NotificationAction(
            type="open_drawer",
            route=f"/messages",
            label="View Message",
            params={"message_id": message_id, "conversation_id": conversation_id}
        ),
        context=NotificationContextData(
            message_id=message_id
        )
    )


def build_match_payload(
    job_posting_id: int,
    match_id: Optional[int] = None,
    job_title: Optional[str] = None,
    company_name: Optional[str] = None
) -> NotificationPayload:
    """Build payload for match notifications"""
    return NotificationPayload(
        action=NotificationAction(
            type="navigate",
            route=f"/jobs/{job_posting_id}",
            label="View Job"
        ),
        context=NotificationContextData(
            job_posting_id=job_posting_id,
            match_id=match_id,
            job_title=job_title,
            company_name=company_name
        )
    )


def build_invitation_payload(
    job_posting_id: int,
    job_title: Optional[str] = None,
    company_name: Optional[str] = None,
    recruiter_name: Optional[str] = None
) -> NotificationPayload:
    """Build payload for invitation notifications"""
    return NotificationPayload(
        action=NotificationAction(
            type="navigate",
            route=f"/invites",
            label="View Invitation",
            params={"job_posting_id": job_posting_id}
        ),
        secondary_action=NotificationAction(
            type="navigate",
            route=f"/jobs/{job_posting_id}",
            label="View Job"
        ),
        context=NotificationContextData(
            job_posting_id=job_posting_id,
            job_title=job_title,
            company_name=company_name,
            recruiter_name=recruiter_name
        )
    )
