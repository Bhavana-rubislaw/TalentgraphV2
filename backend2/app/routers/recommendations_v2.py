"""
Recommendations v2 — stable endpoint contract backed by RecommendationGateway.

All endpoints call gateway.* only; no model imports from this module.

Routes:
    GET  /recommendations/v2/job/{job_id}             — recruiter: rank candidates
    GET  /recommendations/v2/profile/{job_profile_id} — candidate: rank jobs
    GET  /recommendations/v2/explain                  — explain a (job, profile) pair
    POST /recommendations/v2/feedback                 — record recruiter/candidate signal
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.database import get_session
from app.models import Company, JobPosting, JobProfile, User
from app.recommender.database import get_recommender_session
from app.recommender.gateway import get_gateway
from app.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/recommendations/v2",
    tags=["Recommendations V2"],
)


# ──────────────────────────────────────────────────────────────────────────────
# Request / response schemas
# ──────────────────────────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    job_id: int
    job_profile_id: int
    candidate_id: int
    company_id: int
    signal: str = Field(
        ...,
        pattern="^(liked|dismissed|shortlisted|applied|hired)$",
        description="Feedback signal type",
    )
    score_at_feedback: Optional[int] = Field(default=None, ge=0, le=100)


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _resolve_company(current_user: dict, session: Session) -> Company:
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="Recruiter profile not found")
    return company


def _resolve_job_profile(current_user: dict, session: Session) -> JobProfile:
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    profile = session.exec(
        select(JobProfile).where(JobProfile.candidate_id == user.id)
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Job profile not found")
    return profile


# ──────────────────────────────────────────────────────────────────────────────
# Recruiter: rank candidates for a job posting
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/job/{job_id}")
def get_candidate_rankings(
    job_id: int,
    min_score: int = Query(default=35, ge=0, le=100),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Return ranked candidates for a specific job posting.

    Recruiter / HR / Admin only.  Serves via the active gateway adapter.
    """
    company = _resolve_company(current_user, session)

    job_posting = session.get(JobPosting, job_id)
    if not job_posting or job_posting.company_id != company.id:
        raise HTTPException(status_code=404, detail="Job posting not found")

    gateway = get_gateway()
    logger.info(
        f"[RECS-V2] rank_candidates job={job_id} company={company.id} "
        f"adapter={gateway.adapter_name}"
    )

    candidates = gateway.rank_candidates_for_job(
        job_id=job_id,
        company_id=company.id,
        session=session,
        min_score=min_score,
        limit=limit,
    )

    return {
        "job_id": job_id,
        "job_title": job_posting.job_title,
        "total_recommendations": len(candidates),
        "adapter": gateway.adapter_name,
        "recommendations": candidates,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Candidate: rank jobs for a job profile
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/profile/{job_profile_id}")
def get_job_rankings(
    job_profile_id: int,
    min_score: int = Query(default=35, ge=0, le=100),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Return ranked job postings for a candidate job profile.

    Candidate only.
    """
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = session.get(JobProfile, job_profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Job profile not found")

    # Security: candidate can only query their own profile
    if profile.candidate_id != user.id and current_user.get("role") not in ("admin",):
        raise HTTPException(status_code=403, detail="Access denied")

    gateway = get_gateway()
    logger.info(
        f"[RECS-V2] rank_jobs profile={job_profile_id} "
        f"adapter={gateway.adapter_name}"
    )

    jobs = gateway.rank_jobs_for_profile(
        job_profile_id=job_profile_id,
        candidate_id=user.id,
        session=session,
        min_score=min_score,
        limit=limit,
    )

    return {
        "job_profile_id": job_profile_id,
        "total_jobs": len(jobs),
        "adapter": gateway.adapter_name,
        "jobs": jobs,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Explainability
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/explain")
def explain_match(
    job_id: int = Query(...),
    job_profile_id: int = Query(...),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Return detailed match breakdown for a (job_posting, job_profile) pair."""
    gateway = get_gateway()
    result = gateway.explain_pair(job_id, job_profile_id, session)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ──────────────────────────────────────────────────────────────────────────────
# Feedback
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/feedback", status_code=status.HTTP_204_NO_CONTENT)
def record_feedback(
    body: FeedbackRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
    rec_session: Session = Depends(get_recommender_session),
):
    """Record a recruiter or candidate interaction signal for a recommendation pair."""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    gateway = get_gateway()
    gateway.record_feedback(
        job_id=body.job_id,
        job_profile_id=body.job_profile_id,
        candidate_id=body.candidate_id,
        company_id=body.company_id,
        actor_user_id=user.id,
        signal=body.signal,
        score_at_feedback=body.score_at_feedback,
        rec_session=rec_session,
    )
