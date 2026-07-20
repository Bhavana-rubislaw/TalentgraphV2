"""
Candidate-facing dashboard routes: recommendations, recruiter invites,
available jobs, applied/liked jobs, and matches.

Split out of the former monolithic dashboard.py alongside
dashboard_recruiter.py; both routers share the "/dashboard" prefix.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session, select, and_
from typing import List, Dict, Any
from app.database import get_session
from app.models import (
    User, Candidate, Company, JobPosting, JobProfile,
    Match, Application, Swipe, UserRole, JobPostingStatus, Meeting,
)
from app.security import get_current_user
from app.services.job_match_scoring import calculate_job_match_score

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ============ CANDIDATE DASHBOARD ============

@router.get("/candidate/recommendations", response_model=List[Dict[str, Any]])
def get_candidate_recommendations(
    job_profile_id: int = Query(..., description="Job profile ID to get recommendations for"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get recommended jobs for a specific candidate job profile"""
    logger.info(f"[CANDIDATE RECOMMENDATIONS] Getting recs for profile {job_profile_id}")
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user or user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    # Get the job profile
    job_profile = session.get(JobProfile, job_profile_id)
    if not job_profile or job_profile.candidate_id != candidate.id:
        raise HTTPException(status_code=404, detail="Job profile not found")
    
    # Get all active and reposted job postings (broader search)
    all_jobs = session.exec(
        select(JobPosting).where(
            JobPosting.status.in_([JobPostingStatus.ACTIVE, JobPostingStatus.REPOSTED])
        )
    ).all()
    logger.info(f"[CANDIDATE RECOMMENDATIONS] Evaluating {len(all_jobs)} active jobs")
    
    # BATCH OPTIMIZATION: Pre-fetch all related data to avoid N+1 queries
    # Instead of 4 queries per job, fetch once and build lookup maps
    
    # Batch fetch all swipes for this candidate
    candidate_swipes = session.exec(
        select(Swipe).where(
            and_(
                Swipe.candidate_id == candidate.id,
                Swipe.action_by == "candidate"
            )
        )
    ).all()
    # Key includes job_profile_id so swipes from different profiles don't bleed across
    swipe_map = {(s.candidate_id, s.job_posting_id, s.job_profile_id): s for s in candidate_swipes}

    # Batch fetch all applications for this candidate
    candidate_applications = session.exec(
        select(Application).where(Application.candidate_id == candidate.id)
    ).all()
    # Applications are global per candidate (not profile-scoped)
    app_map = {(a.candidate_id, a.job_posting_id): a for a in candidate_applications}

    # Batch fetch all matches for this candidate
    candidate_matches = session.exec(
        select(Match).where(Match.candidate_id == candidate.id)
    ).all()
    # Key includes job_profile_id for per-profile match isolation
    match_map = {(m.candidate_id, m.job_posting_id, m.job_profile_id): m for m in candidate_matches}
    
    # Batch fetch all companies for the jobs
    company_ids = set(j.company_id for j in all_jobs)
    companies = session.exec(
        select(Company).where(Company.id.in_(company_ids))
    ).all()
    company_map = {c.id: c for c in companies}
    
    # Format response with match info
    recommendations = []
    for job in all_jobs:
        # Calculate match score
        match_info = calculate_job_match_score(job, job_profile, session)
        
        # Only include jobs with some match (40%+ threshold)
        if match_info["score"] < 65:  # Candidate threshold: 65% to reduce noise
            continue
        
        # Lookup from pre-fetched maps (O(1) access)
        # Swipes and matches are scoped to the specific job_profile_id
        existing_swipe = swipe_map.get((candidate.id, job.id, job_profile_id))
        existing_application = app_map.get((candidate.id, job.id))
        match = match_map.get((candidate.id, job.id, job_profile_id))
        company = company_map.get(job.company_id)
        
        recommendations.append({
            "job_posting": {
                "id": job.id,
                "job_title": job.job_title,
                "company_id": job.company_id,
                "company_name": company.company_name if company else "Unknown",
                "location": job.location,
                "worktype": job.worktype.value if job.worktype else None,
                "employment_type": job.employment_type.value if job.employment_type else None,
                "salary_min": job.salary_min,
                "salary_max": job.salary_max,
                "salary_currency": job.salary_currency.value if job.salary_currency else None,
                "job_description": job.job_description,
                "seniority_level": job.seniority_level,
                "required_skills": job.required_skills,
                "product_vendor": job.product_vendor,
                "product_type": job.product_type
            },
            "match_percentage": match_info["score"],
            "match_details": match_info["details"],
            "already_swiped": existing_swipe is not None,
            "swipe_action": existing_swipe.action if existing_swipe else None,
            "already_applied": existing_application is not None,
            "is_match": match.candidate_liked and match.company_liked if match else False,
            "recruiter_interested": match.company_liked if match else False,
            "recruiter_invited": match.company_asked_to_apply if match else False
        })
    
    # Sort by match score
    recommendations.sort(key=lambda x: x["match_percentage"], reverse=True)
    logger.info(f"[CANDIDATE RECOMMENDATIONS] Returning {len(recommendations)} recommendations (threshold: 65%)")
    
    return recommendations


@router.get("/candidate/recruiter-invites", response_model=List[Dict[str, Any]])
def get_recruiter_invites(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get all recruiter invites (ask_to_apply actions from recruiters)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user or user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    # Get all ask_to_apply swipes from recruiters
    invites_query = select(Swipe).where(
        and_(
            Swipe.candidate_id == candidate.id,
            Swipe.action == "ask_to_apply",
            Swipe.action_by == "recruiter"
        )
    )
    invites = session.exec(invites_query).all()
    
    # Deduplicate: keep only the latest invite per (company, job_posting)
    # Count total invites per combo for the badge
    seen = {}
    invite_counts = {}
    for invite in invites:
        key = (invite.company_id, invite.job_posting_id)
        invite_counts[key] = invite_counts.get(key, 0) + 1
        if key not in seen or invite.created_at > seen[key].created_at:
            seen[key] = invite
    unique_invites = list(seen.values())
    
    result = []
    for invite in unique_invites:
        job_posting = session.get(JobPosting, invite.job_posting_id)
        company = session.get(Company, invite.company_id)
        
        # Check if already applied
        already_applied = session.exec(
            select(Application).where(
                Application.candidate_id == candidate.id,
                Application.job_posting_id == invite.job_posting_id
            )
        ).first() is not None
        
        # Get posting skills
        from app.models import JobPostingSkill
        posting_skills = session.exec(
            select(JobPostingSkill).where(JobPostingSkill.job_posting_id == job_posting.id)
        ).all()
        
        result.append({
            "invite_id": invite.id,
            "job_profile_id": invite.job_profile_id,
            "already_applied": already_applied,
            "job_posting": {
                "id": job_posting.id,
                "job_title": job_posting.job_title,
                "location": job_posting.location,
                "worktype": job_posting.worktype,
                "employment_type": job_posting.employment_type,
                "seniority_level": job_posting.seniority_level,
                "salary_min": job_posting.salary_min,
                "salary_max": job_posting.salary_max,
                "salary_currency": job_posting.salary_currency,
                "pay_type": job_posting.pay_type,
                "job_description": job_posting.job_description,
                "product_vendor": job_posting.product_vendor,
                "product_type": job_posting.product_type,
                "job_role": job_posting.job_role,
                "start_date": job_posting.start_date,
                "end_date": job_posting.end_date,
                "job_category": job_posting.job_category,
                "travel_requirements": job_posting.travel_requirements,
                "visa_info": job_posting.visa_info,
                "education_qualifications": job_posting.education_qualifications,
                "certifications_required": job_posting.certifications_required,
                "posting_skills": [
                    {"skill_name": s.skill_name, "skill_category": s.skill_category, "rating": s.rating}
                    for s in posting_skills
                ]
            },
            "company": {
                "id": company.id,
                "company_name": company.company_name,
                "employee_type": company.employee_type
            },
            "invite_count": invite_counts.get((invite.company_id, invite.job_posting_id), 1),
            "created_at": invite.created_at.isoformat()
        })
    
    return result


@router.get("/candidate/available-jobs", response_model=List[Dict[str, Any]])
def get_available_jobs(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get all available active jobs"""
    # Get current user as candidate
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    candidate = None
    if user and user.role == UserRole.CANDIDATE:
        candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    
    # Get all active and reposted job postings
    jobs = session.exec(
        select(JobPosting).where(
            JobPosting.status.in_([JobPostingStatus.ACTIVE, JobPostingStatus.REPOSTED])
        )
    ).all()
    
    result = []
    for job in jobs:
        company = session.get(Company, job.company_id)
        
        # Check if candidate has already applied
        already_applied = False
        if candidate:
            existing_app = session.exec(
                select(Application).where(
                    and_(
                        Application.candidate_id == candidate.id,
                        Application.job_posting_id == job.id
                    )
                )
            ).first()
            already_applied = existing_app is not None
        
        result.append({
            "id": job.id,
            "job_title": job.job_title,
            "company_name": company.company_name if company else "Unknown",
            "location": job.location,
            "worktype": job.worktype,
            "employment_type": job.employment_type,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "salary_currency": job.salary_currency,
            "job_description": job.job_description[:200] + "...",  # Preview
            "product_vendor": job.product_vendor,
            "product_type": job.product_type,
            "job_role": job.job_role,
            "created_at": job.created_at.isoformat(),
            "already_applied": already_applied
        })
    
    return result


@router.get("/candidate/applied-liked-jobs", response_model=Dict[str, Any])
def get_applied_liked_jobs(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get jobs the candidate has applied to or liked"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user or user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    # Get applications
    applications = session.exec(
        select(Application).where(Application.candidate_id == candidate.id)
    ).all()
    
    # Get liked jobs (swipes)
    liked_swipes = session.exec(
        select(Swipe).where(
            and_(
                Swipe.candidate_id == candidate.id,
                Swipe.action == "like",
                Swipe.action_by == "candidate"
            )
        )
    ).all()
    
    applied_jobs = []
    for app in applications:
        job = session.get(JobPosting, app.job_posting_id)
        if job:
            company = session.get(Company, job.company_id)
            
            # Check if there's a scheduled interview for this application
            interview_scheduled = session.exec(
                select(Meeting).where(
                    and_(
                        Meeting.application_id == app.id,
                        Meeting.status.in_(['scheduled', 'rescheduled'])
                    )
                )
            ).first() is not None
            
            # Skills
            posting_skills = []
            for sk in job.posting_skills:
                posting_skills.append({
                    "skill_name": sk.skill_name,
                    "skill_category": sk.skill_category,
                    "rating": sk.rating
                })
            applied_jobs.append({
                "application_id": app.id,
                "job_id": job.id,
                "job_title": job.job_title,
                "company_name": company.company_name if company else None,
                "product_vendor": job.product_vendor,
                "product_type": job.product_type,
                "job_role": job.job_role,
                "seniority_level": job.seniority_level,
                "worktype": job.worktype,
                "location": job.location,
                "employment_type": job.employment_type,
                "salary_min": job.salary_min,
                "salary_max": job.salary_max,
                "salary_currency": job.salary_currency,
                "pay_type": job.pay_type,
                "job_description": job.job_description,
                "required_skills": job.required_skills,
                "posting_skills": posting_skills,
                "start_date": job.start_date,
                "end_date": job.end_date,
                "travel_requirements": job.travel_requirements,
                "visa_info": job.visa_info,
                "education_qualifications": job.education_qualifications,
                "certifications_required": job.certifications_required,
                "status": app.status,
                "interview_scheduled": interview_scheduled,
                "applied_at": app.applied_at.isoformat()
            })
    
    liked_jobs = []
    for swipe in liked_swipes:
        job = session.get(JobPosting, swipe.job_posting_id)
        if job:
            company = session.get(Company, job.company_id)
            posting_skills = []
            for sk in job.posting_skills:
                posting_skills.append({
                    "skill_name": sk.skill_name,
                    "skill_category": sk.skill_category,
                    "rating": sk.rating
                })
            # Check if already applied
            already_applied = any(a.job_posting_id == job.id for a in applications)
            liked_jobs.append({
                "job_id": job.id,
                "job_title": job.job_title,
                "company_name": company.company_name if company else None,
                "product_vendor": job.product_vendor,
                "product_type": job.product_type,
                "job_role": job.job_role,
                "seniority_level": job.seniority_level,
                "worktype": job.worktype,
                "location": job.location,
                "employment_type": job.employment_type,
                "salary_min": job.salary_min,
                "salary_max": job.salary_max,
                "salary_currency": job.salary_currency,
                "pay_type": job.pay_type,
                "job_description": job.job_description,
                "required_skills": job.required_skills,
                "posting_skills": posting_skills,
                "start_date": job.start_date,
                "end_date": job.end_date,
                "travel_requirements": job.travel_requirements,
                "visa_info": job.visa_info,
                "education_qualifications": job.education_qualifications,
                "certifications_required": job.certifications_required,
                "already_applied": already_applied,
                "liked_at": swipe.created_at.isoformat()
            })
    
    return {
        "applied_jobs": applied_jobs,
        "liked_jobs": liked_jobs
    }


@router.get("/candidate/matches", response_model=List[Dict[str, Any]])
def get_candidate_matches(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get mutual matches (both candidate and recruiter liked)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user or user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    # Get mutual matches
    matches = session.exec(
        select(Match).where(
            and_(
                Match.candidate_id == candidate.id,
                Match.candidate_liked == True,
                Match.company_liked == True
            )
        )
    ).all()
    
    result = []
    for match in matches:
        job_posting = session.get(JobPosting, match.job_posting_id)
        company = session.get(Company, match.company_id)
        if job_posting is None or company is None:
            # Posting or company deleted since the match was made
            continue
        company_user = session.get(User, company.user_id)
        
        # Check if candidate already applied to this job
        already_applied = session.exec(
            select(Application).where(
                Application.candidate_id == candidate.id,
                Application.job_posting_id == match.job_posting_id
            )
        ).first() is not None

        # Get posting skills
        from app.models import JobPostingSkill
        posting_skills = session.exec(
            select(JobPostingSkill).where(JobPostingSkill.job_posting_id == job_posting.id)
        ).all()
        
        result.append({
            "match_id": match.id,
            "job_profile_id": match.job_profile_id,
            "job_posting": {
                "id": job_posting.id,
                "job_title": job_posting.job_title,
                "location": job_posting.location,
                "job_description": job_posting.job_description,
                "job_role": job_posting.job_role,
                "product_vendor": job_posting.product_vendor,
                "product_type": job_posting.product_type,
                "seniority_level": job_posting.seniority_level,
                "worktype": job_posting.worktype,
                "employment_type": job_posting.employment_type,
                "salary_min": job_posting.salary_min,
                "salary_max": job_posting.salary_max,
                "salary_currency": job_posting.salary_currency,
                "start_date": job_posting.start_date,
                "end_date": job_posting.end_date,
                "education_qualifications": job_posting.education_qualifications,
                "certifications_required": job_posting.certifications_required,
                "travel_requirements": job_posting.travel_requirements,
                "visa_info": job_posting.visa_info,
                "posting_skills": [{"skill_name": s.skill_name, "rating": s.rating} for s in posting_skills],
            },
            "company": {
                "id": company.id,
                "company_name": company.company_name,
                "email": company_user.email if company_user else None
            },
            "match_percentage": match.match_percentage,
            "matched_at": match.created_at.isoformat(),
            "already_applied": already_applied
        })

    return result

