"""
Matches routes
Mutual matches between candidates and recruiters
"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from typing import List
from app.database import get_session
from app.models import Match, Swipe, Candidate, Company, JobProfile, JobPosting, User
from app.schemas import MatchRead
from app.security import get_current_user

router = APIRouter(prefix="/matches", tags=["Matches"])


@router.get("", response_model=List[MatchRead])
def get_matches(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get all matches for current user"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == "candidate":
        candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate profile not found")
        matches = session.exec(select(Match).where(Match.candidate_id == candidate.id)).all()
    else:
        company = session.exec(select(Company).where(Company.user_id == user.id)).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company profile not found")
        matches = session.exec(select(Match).where(Match.company_id == company.id)).all()
    
    return matches


@router.get("/mutual", response_model=List[MatchRead])
def get_mutual_matches(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get only mutual matches (both parties have interacted positively)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == "candidate":
        candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate profile not found")
        
        # Both candidate and company must have liked each other
        mutual = session.exec(
            select(Match)
            .where(Match.candidate_id == candidate.id)
            .where(Match.candidate_liked == True)
            .where(Match.company_liked == True)
        ).all()
    else:
        company = session.exec(select(Company).where(Company.user_id == user.id)).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company profile not found")
        
        mutual = session.exec(
            select(Match)
            .where(Match.company_id == company.id)
            .where(Match.candidate_liked == True)
            .where(Match.company_liked == True)
        ).all()
    
    return mutual


@router.post("/{match_id}/like", response_model=dict)
def like_match(
    match_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Like a match"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    match = session.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Verify ownership
    if user.role == "candidate":
        candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
        if not candidate or match.candidate_id != candidate.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        match.candidate_liked = True
    else:
        company = session.exec(select(Company).where(Company.user_id == user.id)).first()
        if not company or match.company_id != company.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        match.company_liked = True
    
    session.add(match)
    session.commit()
    
    return {"message": "Match liked", "match_id": match.id}


@router.post("/{match_id}/unlike", response_model=dict)
def unlike_match(
    match_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Unlike a match"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    match = session.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if user.role == "candidate":
        candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
        if not candidate or match.candidate_id != candidate.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        match.candidate_liked = False
    else:
        company = session.exec(select(Company).where(Company.user_id == user.id)).first()
        if not company or match.company_id != company.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        match.company_liked = False
    
    session.add(match)
    session.commit()
    
    return {"message": "Match unliked", "match_id": match.id}


@router.post("/{match_id}/ask-to-apply", response_model=dict)
def ask_to_apply(
    match_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Recruiter asks candidate to apply"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    match = session.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company or match.company_id != company.id:
        raise HTTPException(status_code=403, detail="Only recruiters can ask to apply")
    
    match.company_asked_to_apply = True
    session.add(match)
    session.commit()
    
    return {"message": "Asked candidate to apply", "match_id": match.id}
