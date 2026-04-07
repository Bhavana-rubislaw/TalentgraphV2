"""
Swipes routes
Like/Pass interactions from candidates
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, status, Body, Request
from pydantic import BaseModel
from sqlmodel import Session, select
from app.database import get_session
from app.models import Swipe, Candidate, Company, JobPosting, JobProfile, User, Match
from app.security import get_current_user
from app.routers.notifications import push_notification
from app.services.audit import log_activity_event, snap_swipe
from app.services.notification_service import NotificationService
from app.services.user_service import UserService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/swipes", tags=["Swipes"])


class CandidateSwipeRequest(BaseModel):
    job_profile_id: int
    job_posting_id: int


class RecruiterSwipeRequest(BaseModel):
    candidate_id: int
    job_profile_id: int
    job_posting_id: int


@router.post("/like")
def swipe_like(
    data: CandidateSwipeRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Candidate likes a job posting"""
    job_profile_id = data.job_profile_id
    job_posting_id = data.job_posting_id
    logger.info(f"[CANDIDATE LIKE] job_profile_id={job_profile_id}, job_posting_id={job_posting_id}")
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    job_profile = session.get(JobProfile, job_profile_id)
    if not job_profile or job_profile.candidate_id != candidate.id:
        raise HTTPException(status_code=404, detail="Job profile not found")
    
    job_posting = session.get(JobPosting, job_posting_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Check for duplicate swipe
    existing_swipe = session.exec(
        select(Swipe)
        .where(Swipe.candidate_id == candidate.id)
        .where(Swipe.job_posting_id == job_posting_id)
        .where(Swipe.action == "like")
        .where(Swipe.action_by == "candidate")
    ).first()
    if existing_swipe:
        return {"message": "Already liked this job posting", "action": "like"}
    
    # Create swipe
    swipe = Swipe(
        candidate_id=candidate.id,
        company_id=job_posting.company_id,
        job_profile_id=job_profile_id,
        job_posting_id=job_posting_id,
        action="like",
        action_by="candidate"
    )
    
    # Create or update match
    existing_match = session.exec(
        select(Match)
        .where(Match.candidate_id == candidate.id)
        .where(Match.company_id == job_posting.company_id)
        .where(Match.job_posting_id == job_posting_id)
    ).first()
    
    if existing_match:
        existing_match.candidate_liked = True
    else:
        match = Match(
            candidate_id=candidate.id,
            company_id=job_posting.company_id,
            job_profile_id=job_profile_id,
            job_posting_id=job_posting_id,
            candidate_liked=True,
            match_percentage=80
        )
        session.add(match)
    
    session.add(swipe)
    session.commit()
    
    # Check for mutual match and notify both parties
    refreshed_match = session.exec(
        select(Match)
        .where(Match.candidate_id == candidate.id)
        .where(Match.job_posting_id == job_posting_id)
    ).first()
    if refreshed_match and refreshed_match.candidate_liked and refreshed_match.company_liked:
        # Notify candidate of mutual match
        push_notification(
            session, user.id,
            title="🎉 It's a Match!",
            message=f"You and {job_posting.job_title} have mutually matched. Check your matches!",
            event_type="match",
            route="/candidate-dashboard",
            route_context={"tab": "matches", "jobPostingId": job_posting_id},
        )
        # Notify recruiter company user
        company_user = session.exec(
            select(User).where(User.id == job_posting.company.user_id)
        ).first() if job_posting.company else None
        if company_user:
            push_notification(
                session, company_user.id,
                title="🎉 New Mutual Match!",
                message=f"A candidate matched your posting: {job_posting.job_title}",
                event_type="match",
                route="/recruiter-dashboard",
                route_context={"tab": "matches", "jobPostingId": job_posting_id},
            )
    
    return {"message": "Liked job posting", "action": "like"}


@router.post("/pass")
def swipe_pass(
    data: CandidateSwipeRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Candidate passes on a job posting"""
    job_profile_id = data.job_profile_id
    job_posting_id = data.job_posting_id
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    job_profile = session.get(JobProfile, job_profile_id)
    if not job_profile or job_profile.candidate_id != candidate.id:
        raise HTTPException(status_code=404, detail="Job profile not found")
    
    job_posting = session.get(JobPosting, job_posting_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Idempotency: skip duplicate pass swipe
    existing_pass = session.exec(
        select(Swipe)
        .where(Swipe.candidate_id == candidate.id)
        .where(Swipe.job_posting_id == job_posting_id)
        .where(Swipe.action == "pass")
        .where(Swipe.action_by == "candidate")
    ).first()
    if existing_pass:
        return {"message": "Already passed on this job posting", "action": "pass"}
    
    # Create swipe
    swipe = Swipe(
        candidate_id=candidate.id,
        company_id=job_posting.company_id,
        job_profile_id=job_profile_id,
        job_posting_id=job_posting_id,
        action="pass",
        action_by="candidate"
    )
    
    session.add(swipe)
    session.flush()

    log_activity_event(
        session,
        entity_type="swipe",
        entity_id=swipe.id,
        action="passed",
        performed_by_user=user,
        after_value=snap_swipe(swipe),
        request_id=getattr(request.state, "request_id", None),
        dedupe_key=f"swipe:candidate:pass:{candidate.id}:{job_posting_id}",
    )

    session.commit()
    
    return {"message": "Passed on job posting", "action": "pass"}


@router.delete("/undo/{job_posting_id}")
def undo_swipe(
    job_posting_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Candidate undoes a swipe (like or pass) on a job posting"""
    logger.info(f"[UNDO SWIPE] job_posting_id={job_posting_id}")
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Find existing swipe
    existing_swipe = session.exec(
        select(Swipe)
        .where(Swipe.candidate_id == candidate.id)
        .where(Swipe.job_posting_id == job_posting_id)
        .where(Swipe.action_by == "candidate")
    ).first()
    
    if not existing_swipe:
        raise HTTPException(status_code=404, detail="No swipe found to undo")
    
    swipe_action = existing_swipe.action
    
    # Delete the swipe
    session.delete(existing_swipe)
    
    # If it was a like, update or remove the match
    if swipe_action == "like":
        existing_match = session.exec(
            select(Match)
            .where(Match.candidate_id == candidate.id)
            .where(Match.job_posting_id == job_posting_id)
        ).first()
        
        if existing_match:
            existing_match.candidate_liked = False
            # If neither side liked anymore, delete the match
            if not existing_match.company_liked:
                session.delete(existing_match)
    
    session.commit()
    
    return {"message": f"Undone {swipe_action} action", "action": "undo"}


@router.get("/check-invite-status/{candidate_id}/{job_posting_id}")
def check_invite_status(
    candidate_id: int,
    job_posting_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Check if recruiter has already invited this candidate for this job"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="Recruiters only")
    
    # Get all existing invites
    existing_invites = session.exec(
        select(Swipe)
        .where(Swipe.candidate_id == candidate_id)
        .where(Swipe.job_posting_id == job_posting_id)
        .where(Swipe.action == "ask_to_apply")
        .where(Swipe.action_by == "recruiter")
        .order_by(Swipe.created_at.desc())
    ).all()
    
    if not existing_invites:
        return {
            "already_invited": False,
            "invite_count": 0,
            "last_invite_date": None
        }
    
    return {
        "already_invited": True,
        "invite_count": len(existing_invites),
        "last_invite_date": existing_invites[0].created_at.isoformat(),
        "first_invite_date": existing_invites[-1].created_at.isoformat()
    }


@router.post("/ask-to-apply")
def ask_to_apply(
    data: CandidateSwipeRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Candidate asks to apply for a job"""
    job_profile_id = data.job_profile_id
    job_posting_id = data.job_posting_id
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    job_profile = session.get(JobProfile, job_profile_id)
    if not job_profile or job_profile.candidate_id != candidate.id:
        raise HTTPException(status_code=404, detail="Job profile not found")
    
    job_posting = session.get(JobPosting, job_posting_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Check if already asked to apply for this job
    existing_ask = session.exec(
        select(Swipe)
        .where(Swipe.candidate_id == candidate.id)
        .where(Swipe.job_posting_id == job_posting_id)
        .where(Swipe.action == "ask_to_apply")
        .where(Swipe.action_by == "candidate")
    ).first()
    
    if existing_ask:
        logger.info(f"[DUPLICATE ASK PREVENTED] Candidate {candidate.id} already asked to apply for job {job_posting_id}")
        return {"message": "Already asked to apply for this job", "action": "ask_to_apply", "duplicate_prevented": True}
    
    # Create swipe
    swipe = Swipe(
        candidate_id=candidate.id,
        company_id=job_posting.company_id,
        job_profile_id=job_profile_id,
        job_posting_id=job_posting_id,
        action="ask_to_apply",
        action_by="candidate"
    )
    
    # Create or update match
    existing_match = session.exec(
        select(Match)
        .where(Match.candidate_id == candidate.id)
        .where(Match.company_id == job_posting.company_id)
        .where(Match.job_posting_id == job_posting_id)
    ).first()
    
    if existing_match:
        existing_match.candidate_asked_to_apply = True
    else:
        match = Match(
            candidate_id=candidate.id,
            company_id=job_posting.company_id,
            job_profile_id=job_profile_id,
            job_posting_id=job_posting_id,
            candidate_asked_to_apply=True,
            match_percentage=85
        )
        session.add(match)
    
    session.add(swipe)
    session.flush()

    log_activity_event(
        session,
        entity_type="swipe",
        entity_id=swipe.id,
        action="asked_to_apply",
        performed_by_user=user,
        after_value=snap_swipe(swipe),
        request_id=getattr(request.state, "request_id", None),
        dedupe_key=f"swipe:candidate:ask:{candidate.id}:{job_posting_id}",
    )

    session.commit()
    
    return {"message": "Asked to apply for job", "action": "ask_to_apply"}


# ============ RECRUITER SWIPE ACTIONS ============

@router.post("/recruiter/like")
def recruiter_like(
    data: RecruiterSwipeRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Recruiter likes a candidate"""
    logger.info(f"[RECRUITER LIKE] candidate_id={data.candidate_id}, job_profile_id={data.job_profile_id}, job_posting_id={data.job_posting_id}")
    user = UserService.get_user_from_token(session, current_user, required=True)
    
    company = UserService.get_company_profile(session, user, required=True)
    
    # Get all company IDs with the same company name
    company_ids = list(session.exec(
        select(Company.id).where(Company.company_name == company.company_name)
    ).all())
    
    candidate = session.get(Candidate, data.candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    job_posting = session.get(JobPosting, data.job_posting_id)
    if not job_posting or job_posting.company_id not in company_ids:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Duplicate protection: Check if already liked
    existing_like = session.exec(
        select(Swipe)
        .where(Swipe.candidate_id == data.candidate_id)
        .where(Swipe.job_posting_id == data.job_posting_id)
        .where(Swipe.action == "like")
        .where(Swipe.action_by == "recruiter")
    ).first()
    if existing_like:
        return {"message": "Already liked this candidate", "action": "like"}
    
    # Create swipe
    swipe = Swipe(
        candidate_id=data.candidate_id,
        company_id=company.id,
        job_profile_id=data.job_profile_id,
        job_posting_id=data.job_posting_id,
        action="like",
        action_by="recruiter"
    )
    
    # Create or update match
    existing_match = session.exec(
        select(Match)
        .where(Match.candidate_id == data.candidate_id)
        .where(Match.company_id == company.id)
        .where(Match.job_posting_id == data.job_posting_id)
    ).first()
    
    if existing_match:
        existing_match.company_liked = True
    else:
        match = Match(
            candidate_id=data.candidate_id,
            company_id=company.id,
            job_profile_id=data.job_profile_id,
            job_posting_id=data.job_posting_id,
            company_liked=True,
            match_percentage=80
        )
        session.add(match)
    
    session.add(swipe)
    session.flush()

    log_activity_event(
        session,
        entity_type="swipe",
        entity_id=swipe.id,
        action="liked",
        performed_by_user=user,
        after_value=snap_swipe(swipe),
        request_id=getattr(request.state, "request_id", None),
        dedupe_key=f"swipe:recruiter:like:{data.candidate_id}:{data.job_posting_id}",
    )

    session.commit()
    logger.info(f"[RECRUITER LIKE] Success - swipe recorded for candidate {data.candidate_id}")
    
    # Notify candidate they were shortlisted
    candidate_user = session.exec(
        select(User).where(User.id == candidate.user_id)
    ).first()
    if candidate_user:
        push_notification(
            session, candidate_user.id,
            title="⭐ You've been shortlisted!",
            message=f"A recruiter from {company.company_name} shortlisted you for {job_posting.job_title}",
            event_type="shortlisted",
            route="/candidate-dashboard",
            route_context={"tab": "invites", "jobPostingId": data.job_posting_id},
        )
    
    return {"message": "Liked candidate", "action": "like"}


@router.post("/recruiter/pass")
def recruiter_pass(
    data: RecruiterSwipeRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Recruiter passes on a candidate"""
    logger.info(f"[RECRUITER PASS] candidate_id={data.candidate_id}, job_profile_id={data.job_profile_id}, job_posting_id={data.job_posting_id}")
    user = UserService.get_user_from_token(session, current_user, required=True)
    
    company = UserService.get_company_profile(session, user, required=True)
    
    # Get all company IDs with the same company name
    company_ids = list(session.exec(
        select(Company.id).where(Company.company_name == company.company_name)
    ).all())
    
    job_posting = session.get(JobPosting, data.job_posting_id)
    if not job_posting or job_posting.company_id not in company_ids:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Idempotency: skip duplicate recruiter pass
    existing_pass = session.exec(
        select(Swipe)
        .where(Swipe.candidate_id == data.candidate_id)
        .where(Swipe.job_posting_id == data.job_posting_id)
        .where(Swipe.action == "pass")
        .where(Swipe.action_by == "recruiter")
    ).first()
    if existing_pass:
        return {"message": "Already passed on candidate", "action": "pass"}

    # Create swipe
    swipe = Swipe(
        candidate_id=data.candidate_id,
        company_id=company.id,
        job_profile_id=data.job_profile_id,
        job_posting_id=data.job_posting_id,
        action="pass",
        action_by="recruiter"
    )
    
    session.add(swipe)
    session.flush()

    log_activity_event(
        session,
        entity_type="swipe",
        entity_id=swipe.id,
        action="passed",
        performed_by_user=user,
        after_value=snap_swipe(swipe),
        request_id=getattr(request.state, "request_id", None),
        dedupe_key=f"swipe:recruiter:pass:{data.candidate_id}:{data.job_posting_id}",
    )

    session.commit()
    
    return {"message": "Passed on candidate", "action": "pass"}


@router.post("/recruiter/ask-to-apply")
def recruiter_ask_to_apply(
    data: RecruiterSwipeRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Recruiter asks candidate to apply"""
    logger.info(f"[RECRUITER ASK-TO-APPLY] candidate_id={data.candidate_id}, job_profile_id={data.job_profile_id}, job_posting_id={data.job_posting_id}")
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="Recruiters only")
    
    # Get all company IDs with the same company name
    company_ids = list(session.exec(
        select(Company.id).where(Company.company_name == company.company_name)
    ).all())
    
    job_posting = session.get(JobPosting, data.job_posting_id)
    if not job_posting or job_posting.company_id not in company_ids:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Check if already invited this candidate for this job
    existing_invites = session.exec(
        select(Swipe)
        .where(Swipe.candidate_id == data.candidate_id)
        .where(Swipe.job_posting_id == data.job_posting_id)
        .where(Swipe.action == "ask_to_apply")
        .where(Swipe.action_by == "recruiter")
        .order_by(Swipe.created_at.desc())
    ).all()
    
    previous_invite_count = len(existing_invites)
    last_invite_date = existing_invites[0].created_at if existing_invites else None
    
    # Create swipe (allow multiple invites as reminders)
    swipe = Swipe(
        candidate_id=data.candidate_id,
        company_id=company.id,
        job_profile_id=data.job_profile_id,
        job_posting_id=data.job_posting_id,
        action="ask_to_apply",
        action_by="recruiter"
    )
    
    # Create or update match
    existing_match = session.exec(
        select(Match)
        .where(Match.candidate_id == data.candidate_id)
        .where(Match.company_id == company.id)
        .where(Match.job_posting_id == data.job_posting_id)
    ).first()
    
    if existing_match:
        existing_match.company_asked_to_apply = True
    else:
        match = Match(
            candidate_id=data.candidate_id,
            company_id=company.id,
            job_profile_id=data.job_profile_id,
            job_posting_id=data.job_posting_id,
            company_asked_to_apply=True,
            match_percentage=85
        )
        session.add(match)
    
    session.add(swipe)
    session.flush()

    log_activity_event(
        session,
        entity_type="swipe",
        entity_id=swipe.id,
        action="invited",
        performed_by_user=user,
        after_value=snap_swipe(swipe),
        request_id=getattr(request.state, "request_id", None),
        dedupe_key=f"swipe:recruiter:ask:{data.candidate_id}:{data.job_posting_id}",
    )

    session.commit()
    
    # Notify candidate of the invitation (or reminder)
    candidate_obj = session.get(Candidate, data.candidate_id)
    if candidate_obj:
        candidate_user = session.exec(
            select(User).where(User.id == candidate_obj.user_id)
        ).first()
        if candidate_user:
            # Customize message based on invite count
            if previous_invite_count > 0:
                title = "🔔 Reminder: Recruiter wants you to apply!"
                message = f"{company.company_name} reminded you about {job_posting.job_title}"
            else:
                title = "📩 Recruiter invited you to apply!"
                message = f"{company.company_name} wants you to apply for {job_posting.job_title}"
            
            push_notification(
                session, candidate_user.id,
                title=title,
                message=message,
                event_type="invite",
                route="/candidate-dashboard",
                route_context={"tab": "invites", "jobPostingId": data.job_posting_id},
            )
    
    return {
        "message": "Reminder sent to candidate" if previous_invite_count > 0 else "Asked candidate to apply",
        "action": "ask_to_apply",
        "is_reminder": previous_invite_count > 0,
        "invite_count": previous_invite_count + 1,
        "last_invite_date": last_invite_date.isoformat() if last_invite_date else None
    }


@router.delete("/recruiter/undo/{candidate_id}/{job_posting_id}")
def recruiter_undo_swipe(
    candidate_id: int,
    job_posting_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Recruiter undoes a swipe (like, pass, or invite) on a candidate"""
    logger.info(f"[RECRUITER UNDO SWIPE] candidate_id={candidate_id}, job_posting_id={job_posting_id}")
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = UserService.get_company_profile(session, user, required=True)
    
    # Get all company IDs with the same company name
    company_ids = list(session.exec(
        select(Company.id).where(Company.company_name == company.company_name)
    ).all())
    
    # Find existing swipe
    existing_swipe = session.exec(
        select(Swipe)
        .where(Swipe.candidate_id == candidate_id)
        .where(Swipe.job_posting_id == job_posting_id)
        .where(Swipe.action_by == "recruiter")
        .where(Swipe.company_id.in_(company_ids))
    ).first()
    
    if not existing_swipe:
        raise HTTPException(status_code=404, detail="No swipe found to undo")
    
    swipe_action = existing_swipe.action
    
    # Delete the swipe
    session.delete(existing_swipe)
    
    # If it was a like, update or remove the match
    if swipe_action == "like":
        existing_match = session.exec(
            select(Match)
            .where(Match.candidate_id == candidate_id)
            .where(Match.job_posting_id == job_posting_id)
        ).first()
        
        if existing_match:
            existing_match.company_liked = False
            # If neither side liked anymore, delete the match
            if not existing_match.candidate_liked:
                session.delete(existing_match)
    
    session.commit()
    
    return {"message": f"Undone {swipe_action} action", "action": "undo"}
