"""
Swipes routes
Like/Pass interactions from candidates
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, status, Body
from pydantic import BaseModel
from sqlmodel import Session, select
from app.database import get_session
from app.models import Swipe, Candidate, Company, JobPosting, JobProfile, User, Match
from app.security import get_current_user

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
    
    mutual_match = False
    if existing_match:
        existing_match.candidate_liked = True
        if existing_match.company_liked:
            mutual_match = True
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

    # Notify on mutual match
    if mutual_match:
        from app.notify import create_notification
        company = session.get(Company, job_posting.company_id)
        company_user = session.get(User, company.user_id) if company else None
        # Notify candidate
        session.add(create_notification(
            user_id=user.id,
            notification_type="new_match",
            title="New Mutual Match!",
            message=f"You and {company.company_name if company else 'a recruiter'} both liked each other for '{job_posting.job_title}'.",
            job_posting_id=job_posting_id,
            job_title=job_posting.job_title,
            job_profile_id=job_profile_id,
        ))
        # Notify recruiter
        if company_user:
            session.add(create_notification(
                user_id=company_user.id,
                notification_type="new_match",
                title="New Mutual Match!",
                message=f"{candidate.name} and your company both liked each other for '{job_posting.job_title}'.",
                job_posting_id=job_posting_id,
                job_title=job_posting.job_title,
                candidate_id=candidate.id,
                candidate_name=candidate.name,
                job_profile_id=job_profile_id,
            ))
        session.commit()
    
    return {"message": "Liked job posting", "action": "like"}


@router.post("/pass")
def swipe_pass(
    data: CandidateSwipeRequest,
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
    session.commit()
    
    return {"message": "Passed on job posting", "action": "pass"}


@router.post("/ask-to-apply")
def ask_to_apply(
    data: CandidateSwipeRequest,
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
    session.commit()
    
    return {"message": "Asked to apply for job", "action": "ask_to_apply"}


# ============ RECRUITER SWIPE ACTIONS ============

@router.post("/recruiter/like")
def recruiter_like(
    data: RecruiterSwipeRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Recruiter likes a candidate"""
    logger.info(f"[RECRUITER LIKE] candidate_id={data.candidate_id}, job_profile_id={data.job_profile_id}, job_posting_id={data.job_posting_id}")
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
    
    candidate = session.get(Candidate, data.candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    job_posting = session.get(JobPosting, data.job_posting_id)
    if not job_posting or job_posting.company_id not in company_ids:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
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
    
    mutual_match = False
    if existing_match:
        existing_match.company_liked = True
        if existing_match.candidate_liked:
            mutual_match = True
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
    session.commit()
    logger.info(f"[RECRUITER LIKE] Success - swipe recorded for candidate {data.candidate_id}")

    from app.notify import create_notification
    job_profile = session.get(JobProfile, data.job_profile_id)
    # Notify candidate: recruiter liked their profile
    candidate_user = session.get(User, candidate.user_id)
    if candidate_user:
        session.add(create_notification(
            user_id=candidate_user.id,
            notification_type="recruiter_liked",
            title="A Recruiter Liked Your Profile",
            message=f"{company.company_name} liked your profile for '{job_posting.job_title}'.",
            job_posting_id=data.job_posting_id,
            job_title=job_posting.job_title,
            job_profile_id=data.job_profile_id,
            job_profile_name=job_profile.profile_name if job_profile else None,
        ))
    # Notify recruiter: candidate shortlisted
    session.add(create_notification(
        user_id=user.id,
        notification_type="candidate_shortlisted",
        title="Candidate Shortlisted",
        message=f"You shortlisted {candidate.name} for '{job_posting.job_title}'.",
        job_posting_id=data.job_posting_id,
        job_title=job_posting.job_title,
        candidate_id=candidate.id,
        candidate_name=candidate.name,
        job_profile_id=data.job_profile_id,
        job_profile_name=job_profile.profile_name if job_profile else None,
    ))
    if mutual_match:
        # Notify candidate: mutual match
        if candidate_user:
            session.add(create_notification(
                user_id=candidate_user.id,
                notification_type="new_match",
                title="New Mutual Match!",
                message=f"You and {company.company_name} both liked each other for '{job_posting.job_title}'.",
                job_posting_id=data.job_posting_id,
                job_title=job_posting.job_title,
                job_profile_id=data.job_profile_id,
                job_profile_name=job_profile.profile_name if job_profile else None,
            ))
        # Notify recruiter: mutual match
        session.add(create_notification(
            user_id=user.id,
            notification_type="new_match",
            title="New Mutual Match!",
            message=f"{candidate.name} and your company both liked each other for '{job_posting.job_title}'.",
            job_posting_id=data.job_posting_id,
            job_title=job_posting.job_title,
            candidate_id=candidate.id,
            candidate_name=candidate.name,
            job_profile_id=data.job_profile_id,
            job_profile_name=job_profile.profile_name if job_profile else None,
        ))
    session.commit()
    
    return {"message": "Liked candidate", "action": "like"}


@router.post("/recruiter/pass")
def recruiter_pass(
    data: RecruiterSwipeRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Recruiter passes on a candidate"""
    logger.info(f"[RECRUITER PASS] candidate_id={data.candidate_id}, job_profile_id={data.job_profile_id}, job_posting_id={data.job_posting_id}")
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
    session.commit()
    
    return {"message": "Passed on candidate", "action": "pass"}


@router.post("/recruiter/ask-to-apply")
def recruiter_ask_to_apply(
    data: RecruiterSwipeRequest,
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
    
    # Create swipe
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
    session.commit()

    # Notify candidate: recruiter invite (ask-to-apply)
    from app.notify import create_notification
    candidate = session.get(Candidate, data.candidate_id)
    job_profile = session.get(JobProfile, data.job_profile_id)
    if candidate:
        candidate_user = session.get(User, candidate.user_id)
        if candidate_user:
            session.add(create_notification(
                user_id=candidate_user.id,
                notification_type="recruiter_invite",
                title="Recruiter Invited You to Apply",
                message=f"{company.company_name} has invited you to apply for '{job_posting.job_title}'.",
                job_posting_id=data.job_posting_id,
                job_title=job_posting.job_title,
                job_profile_id=data.job_profile_id,
                job_profile_name=job_profile.profile_name if job_profile else None,
            ))
        session.commit()
    
    return {"message": "Asked candidate to apply", "action": "ask_to_apply"}
