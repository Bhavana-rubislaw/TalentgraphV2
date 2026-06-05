"""
Team management routes
Invite, manage, and remove team members
"""

import logging
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from app.database import get_session
from app.models import Company, User, UserRole, JobPosting
from app.schemas import TeamMemberRead, TeamInviteCreate, TeamInviteResponse
from app.security import get_current_user, hash_password

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/company/team", tags=["Team Management"])


@router.get("/members", response_model=list[TeamMemberRead])
def get_team_members(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get all team members for the current company"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Get primary company if this is a team member
    primary_company_id = company.id
    if company.parent_company_id:
        primary_company_id = company.parent_company_id
    
    # Get all team members (both primary and linked)
    team_companies = session.exec(
        select(Company).where(
            (Company.id == primary_company_id) |
            (Company.parent_company_id == primary_company_id)
        )
    ).all()
    
    team_members = []
    for comp in team_companies:
        comp_user = session.get(User, comp.user_id)
        if comp_user:
            # Count job postings for this user
            job_count = len(session.exec(
                select(JobPosting).where(JobPosting.company_id == comp.id)
            ).all())
            
            team_members.append(TeamMemberRead(
                id=comp.id,
                user_id=comp.user_id,
                email=comp_user.email,
                full_name=comp_user.full_name,
                employee_type=comp.employee_type,
                role=comp_user.role.value,
                jobs_posted=job_count
            ))
    
    return team_members


@router.post("/invite", response_model=dict)
def invite_team_member(
    invite_data: TeamInviteCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Invite a new team member (Admin/HR only)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Check if user is admin or hr
    if user.role not in [UserRole.ADMIN, UserRole.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and HR can invite team members"
        )
    
    # Get primary company if this is a team member
    if company.parent_company_id:
        company = session.get(Company, company.parent_company_id)
    
    # Check if email already exists
    existing_user = session.exec(select(User).where(User.email == invite_data.email.lower())).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered in the system"
        )
    
    # Validate role
    if invite_data.role.lower() not in ["admin", "hr", "recruiter"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be admin, hr, or recruiter"
        )
    
    # Generate invite token
    invite_token = secrets.token_urlsafe(32)
    
    # TODO: Store invite token in database or cache with expiration
    # For now, we'll just return the token
    # In production, you'd want to send this via email and store it temporarily
    
    logger.info(f"[TEAM] Invite generated for {invite_data.email} to company {company.id}")
    
    return {
        "message": f"Invitation sent to {invite_data.email}",
        "invite_token": invite_token,
        "note": "In production, this token would be sent via email"
    }


@router.post("/accept-invite", response_model=dict)
def accept_team_invite(
    invite_token: str,
    email: str,
    password: str,
    full_name: str,
    session: Session = Depends(get_session)
):
    """Accept a team invitation and create a new team member account"""
    # TODO: Validate invite token from database/cache
    # For now, we'll assume the token is valid
    
    # Check if email already exists
    existing_user = session.exec(select(User).where(User.email == email.lower())).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # TODO: Get company_id from invite token
    # For now, this is a placeholder
    
    logger.info(f"[TEAM] Team member {email} accepted invitation")
    
    return {
        "message": "Invitation accepted successfully",
        "note": "Full implementation requires invite token validation and storage"
    }


@router.put("/members/{member_id}/role", response_model=dict)
def update_member_role(
    member_id: int,
    new_role: str,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update a team member's role (Admin only)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Check if user is admin
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update member roles"
        )
    
    # Get primary company if this is a team member
    if company.parent_company_id:
        company = session.get(Company, company.parent_company_id)
    
    # Get member company
    member_company = session.get(Company, member_id)
    if not member_company:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    # Verify member belongs to the same company
    member_primary = member_company.parent_company_id or member_company.id
    if member_primary != company.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update member from different company"
        )
    
    # Validate new role
    if new_role.lower() not in ["admin", "hr", "recruiter"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be admin, hr, or recruiter"
        )
    
    # Update user role
    member_user = session.get(User, member_company.user_id)
    role_map = {
        "admin": UserRole.ADMIN,
        "hr": UserRole.HR,
        "recruiter": UserRole.RECRUITER
    }
    member_user.role = role_map[new_role.lower()]
    member_company.employee_type = new_role.upper()
    
    session.add(member_user)
    session.add(member_company)
    session.commit()
    
    logger.info(f"[TEAM] Member {member_company.id} role updated to {new_role}")
    
    return {
        "message": "Member role updated successfully",
        "member_id": member_id,
        "new_role": new_role
    }


@router.delete("/members/{member_id}", response_model=dict)
def remove_team_member(
    member_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Remove a team member from the company (Admin only)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Check if user is admin
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can remove team members"
        )
    
    # Get primary company if this is a team member
    if company.parent_company_id:
        company = session.get(Company, company.parent_company_id)
    
    # Get member company
    member_company = session.get(Company, member_id)
    if not member_company:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    # Verify member belongs to the same company
    member_primary = member_company.parent_company_id or member_company.id
    if member_primary != company.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove member from different company"
        )
    
    # Prevent removing the primary account
    if member_company.is_primary_account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the primary company account"
        )
    
    # Mark user as inactive instead of deleting
    member_user = session.get(User, member_company.user_id)
    member_user.is_active = False
    session.add(member_user)
    session.commit()
    
    logger.info(f"[TEAM] Member {member_company.id} removed from company {company.id}")
    
    return {
        "message": "Team member removed successfully",
        "member_id": member_id
    }
