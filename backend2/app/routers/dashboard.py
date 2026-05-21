"""
Dashboard routes for candidates and recruiters
Recommendations, matches, applications, invites, shortlists
"""

import logging
import json
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import FileResponse
from sqlmodel import Session, select, or_, and_
from typing import List, Dict, Any
from app.database import get_session
from app.models import (
    User, Candidate, Company, JobPosting, JobProfile, 
    Match, Application, Swipe, UserRole, Skill, LocationPreference, JobPostingStatus, Resume, Certification, Meeting,
    ProductVendor, ProductType, ProductRole
)
from app.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def get_taxonomy_names(job_profile: JobProfile, session: Session) -> dict:
    """Get taxonomy names from IDs for display, fallback to text fields"""
    vendor_name = None
    product_type_name = None
    role_name = None
    
    # Try FK IDs first
    if job_profile.vendor_id:
        vendor = session.get(ProductVendor, job_profile.vendor_id)
        vendor_name = vendor.name if vendor else None
    
    if job_profile.product_type_id:
        product_type = session.get(ProductType, job_profile.product_type_id)
        product_type_name = product_type.name if product_type else None
    
    if job_profile.role_id:
        role = session.get(ProductRole, job_profile.role_id)
        role_name = role.name if role else None
    
    # Fallback to text fields if FK IDs not available
    if not vendor_name:
        vendor_name = job_profile.product_vendor
    if not product_type_name:
        product_type_name = job_profile.product_type
    if not role_name:
        role_name = job_profile.job_role
    
    return {
        "product_vendor": vendor_name,
        "product_type": product_type_name,
        "job_role": role_name
    }


def merge_social_links(job_profile: JobProfile, candidate: Candidate) -> dict:
    """
    Merge social links with precedence: profile fields first, candidate fields as fallback.
    
    Returns a dict with: linkedin_url, github_url, portfolio_url, other_social_url
    """
    return {
        "linkedin_url": job_profile.linkedin_url or candidate.linkedin_url,
        "github_url": job_profile.github_url or candidate.github_url,
        "portfolio_url": job_profile.portfolio_url or candidate.portfolio_url,
        # Twitter/website from profile only (no candidate equivalent for "other")
        "other_social_url": job_profile.twitter_url or job_profile.website_url or None,
    }


# Role similarity groups — titles within the same group get partial credit
_ROLE_GROUPS = [
    {"lead", "senior", "principal", "staff", "expert"},
    {"junior", "associate", "entry", "graduate"},
    {"architect", "solution", "enterprise"},
    {"manager", "lead", "head"},
    {"consultant", "functional", "technical", "specialist"},
    {"developer", "engineer", "programmer"},
    {"analyst", "business"},
]


def _is_similar_role(role_a: str, role_b: str) -> bool:
    """Return True when two role titles share a professional category."""
    if not role_a or not role_b:
        return False
    words_a = set(role_a.lower().split())
    words_b = set(role_b.lower().split())
    for group in _ROLE_GROUPS:
        if words_a & group and words_b & group:
            return True
    return False


def calculate_job_match_score(job_posting: JobPosting, job_profile: JobProfile, session: Session) -> dict:
    """Calculate match score from candidate perspective.

    Optimized weights:
    - Product/Role match: 40%
    - Skills match: 30%  (first 40% treated as Must-Have @ 80% weight)
    - Experience match: 15%
    - Salary match: 10%
    - Location match: 5%

    Uses taxonomy FK IDs (vendor_id / product_type_id / role_id) when available
    for precise matching, falling back to normalised text comparison.
    """
    score = 0
    details = {
        "product_match": 0,
        "skills_match": 0,
        "experience_match": 0,
        "salary_match": 0,
        "location_match": 0
    }

    def _n(v) -> str:
        """Normalise a value to lowercase stripped string."""
        return (v or "").strip().lower()

    # ── Resolve canonical vendor / product-type / role names for the profile ──
    # Prefer taxonomy FK names; fall back to legacy text fields.
    profile_vendor = _n(job_profile.product_vendor)
    profile_type   = _n(job_profile.product_type)
    profile_role   = _n(job_profile.job_role)

    if job_profile.vendor_id:
        v_obj = session.get(ProductVendor, job_profile.vendor_id)
        if v_obj:
            profile_vendor = _n(v_obj.name)
    if job_profile.product_type_id:
        pt_obj = session.get(ProductType, job_profile.product_type_id)
        if pt_obj:
            profile_type = _n(pt_obj.name)
    if job_profile.role_id:
        r_obj = session.get(ProductRole, job_profile.role_id)
        if r_obj:
            profile_role = _n(r_obj.name)

    # Normalised posting fields (JobPosting has no FK taxonomy columns)
    posting_vendor = _n(job_posting.product_vendor)
    posting_type   = _n(job_posting.product_type)
    posting_role   = _n(job_posting.job_role)

    # ── Vendor match ──
    vendor_exact   = bool(profile_vendor and posting_vendor and profile_vendor == posting_vendor)
    vendor_partial = bool(profile_vendor and posting_vendor and not vendor_exact and
                         (profile_vendor in posting_vendor or posting_vendor in profile_vendor))

    # ── Product-type match ──
    type_exact   = bool(profile_type and posting_type and profile_type == posting_type)
    type_partial = bool(profile_type and posting_type and not type_exact and
                       (profile_type in posting_type or posting_type in profile_type))

    # ── Role match bonus (up to 5 pts) ──
    role_bonus = 0
    if profile_role and posting_role:
        if profile_role == posting_role:
            role_bonus = 5
        elif _is_similar_role(profile_role, posting_role):
            role_bonus = 3  # Partial credit for similar roles
        elif set(profile_role.split()) & set(posting_role.split()):
            role_bonus = 2

    # ── Combine: scaled to 40% max ──
    if vendor_exact or vendor_partial:
        base = 28 if vendor_exact else 14
        if type_exact:
            base = min(40, base + 12)
        elif type_partial:
            base = min(35, base + 6)
        details["product_match"] = min(40, base + role_bonus)
        score += details["product_match"]
    elif type_exact or type_partial:
        base = 12 if type_exact else 6
        details["product_match"] = min(17, base + role_bonus)
        score += details["product_match"]
    elif role_bonus:
        details["product_match"] = role_bonus
        score += role_bonus

    # Skills match (30%) — first 40% of required skills are Must-Have (80% weight)
    try:
        required_skills = json.loads(job_posting.required_skills) if job_posting.required_skills else []
        candidate_skills = session.exec(
            select(Skill).where(Skill.job_profile_id == job_profile.id)
        ).all()
        candidate_skill_names = [s.skill_name.lower() for s in candidate_skills]

        if required_skills and candidate_skills:
            split_idx = max(1, int(len(required_skills) * 0.4))
            must_have = required_skills[:split_idx]
            nice_to_have = required_skills[split_idx:]

            must_matched = 0
            for req_skill in must_have:
                skill_lower = req_skill.lower() if isinstance(req_skill, str) else str(req_skill).lower()
                for cand_skill in candidate_skill_names:
                    if skill_lower in cand_skill or cand_skill in skill_lower:
                        must_matched += 1
                        break

            nice_matched = 0
            for req_skill in nice_to_have:
                skill_lower = req_skill.lower() if isinstance(req_skill, str) else str(req_skill).lower()
                for cand_skill in candidate_skill_names:
                    if skill_lower in cand_skill or cand_skill in skill_lower:
                        nice_matched += 1
                        break

            must_score = (must_matched / len(must_have)) * 0.8 if must_have else 0
            nice_score = (nice_matched / len(nice_to_have)) * 0.2 if nice_to_have else 0
            skill_ratio = must_score + nice_score
            details["skills_match"] = int(30 * skill_ratio)
            score += details["skills_match"]
    except Exception as e:
        logger.debug(f"Skills match calculation failed: {e}")

    # Experience match (15%)
    try:
        seniority_parts = job_posting.seniority_level.split("-")
        min_years = int(seniority_parts[0].strip())
        if job_profile.years_of_experience >= min_years:
            details["experience_match"] = 15
            score += 15
        elif min_years > 0:
            experience_ratio = job_profile.years_of_experience / min_years
            details["experience_match"] = int(15 * min(experience_ratio, 1))
            score += details["experience_match"]
    except Exception as e:
        logger.debug(f"Experience match calculation failed: {e}")
        details["experience_match"] = 8
        score += 8

    # Salary match (10%)
    try:
        profile_min = float(job_profile.salary_min) if job_profile.salary_min else 0
        posting_max = float(job_posting.salary_max) if job_posting.salary_max else float('inf')
        if profile_min <= posting_max:
            details["salary_match"] = 10
            score += 10
    except Exception as e:
        logger.debug(f"Salary match calculation failed: {e}")

    # Location match (5%)
    location_prefs = session.exec(
        select(LocationPreference).where(LocationPreference.job_profile_id == job_profile.id)
    ).all()

    job_location = job_posting.location.lower() if job_posting.location else ""

    for loc_pref in location_prefs:
        loc_city = (loc_pref.city or "").lower()
        loc_state = (loc_pref.state or "").lower()
        if loc_city in job_location or loc_state in job_location or "remote" in job_location:
            details["location_match"] = 5
            score += 5
            break

    return {"score": min(score, 100), "details": details}


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
        company_user = session.get(User, company.user_id) if company else None
        
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


# ============ RECRUITER DASHBOARD ============

@router.get("/recruiter/recommendations", response_model=Dict[str, Any])
def get_recruiter_recommendations(
    job_posting_id: int = Query(..., description="Job posting ID to get candidate recommendations for"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get recommended candidates for a specific job posting with match analytics"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please log in again.")
    if user.role == UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Recruiters only")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Get all company IDs with the same company name
    company_ids = list(session.exec(
        select(Company.id).where(Company.company_name == company.company_name)
    ).all())
    
    # Get the job posting
    job_posting = session.get(JobPosting, job_posting_id)
    if not job_posting or job_posting.company_id not in company_ids:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # ── Tiered matching: score all profiles, keep those above minimum threshold ──
    # Tier 1 (best): exact vendor + type match
    # Tier 2: vendor-only match
    # Tier 3: role keyword overlap or experience-based
    # All profiles are evaluated; only those scoring >= 30 are returned.
    all_profiles = session.exec(select(JobProfile)).all()

    def _score_profile(profile: JobProfile) -> int:
        """Fast scoring without DB queries for the bulk scan."""
        score = 0
        job_vendor = (job_posting.product_vendor or "").strip().lower()
        job_type   = (job_posting.product_type   or "").strip().lower()
        job_role   = (job_posting.job_role        or "").strip().lower()

        pv = (profile.product_vendor or "").strip().lower()
        pt = (profile.product_type   or "").strip().lower()
        pr = (profile.job_role        or "").strip().lower()

        # Vendor match (35 pts)
        if job_vendor and pv == job_vendor:
            score += 35
            # Bonus: type match within same vendor (15 pts)
            if job_type and pt == job_type:
                score += 15
        elif job_vendor and (pv in job_vendor or job_vendor in pv):
            score += 15  # partial vendor match

        # Role match (25 pts)
        if job_role and pr:
            if pr == job_role:
                score += 25
            else:
                # Keyword overlap
                job_words = set(job_role.split())
                pr_words  = set(pr.split())
                overlap   = job_words & pr_words
                if overlap:
                    score += int(25 * len(overlap) / max(len(job_words), 1))

        # Experience bonus (up to 15 pts)
        if profile.years_of_experience and profile.years_of_experience >= 2:
            score += min(15, profile.years_of_experience)

        # Salary overlap (10 pts)
        try:
            if (profile.salary_min is not None and job_posting.salary_max is not None
                    and float(profile.salary_min) <= float(job_posting.salary_max) * 1.2):
                score += 10
        except (TypeError, ValueError):
            pass

        return min(score, 100)

    scored = [(profile, _score_profile(profile)) for profile in all_profiles]
    # Sort best-first; keep profiles scoring >= 30
    scored.sort(key=lambda x: x[1], reverse=True)
    matching_profiles = [p for p, s in scored if s >= 30]
    logger.info(
        "[RECOMMENDATIONS] job=%s: %d/%d profiles scored >=30 (tiered matching)",
        job_posting_id, len(matching_profiles), len(all_profiles)
    )
    # Map profile_id -> computed score for use in response
    score_lookup: dict = {p.id: s for p, s in scored if s >= 30}
    
    # Get analytics counts
    shortlisted_count = session.exec(
        select(Swipe).where(
            and_(
                Swipe.job_posting_id == job_posting_id,
                Swipe.action.in_(["like", "ask_to_apply"]),
                Swipe.action_by == "recruiter"
            )
        )
    ).all()
    
    applications_count = session.exec(
        select(Application).where(Application.job_posting_id == job_posting_id)
    ).all()
    
    recommendations = []
    for profile in matching_profiles:
        candidate = session.get(Candidate, profile.candidate_id)
        
        if not candidate or not profile or not job_posting:
            logger.warning(
                "Skipping orphaned profile id=%s (candidate=%s, profile=%s, posting=%s)",
                profile.id,
                bool(candidate),
                bool(profile),
                bool(job_posting),
            )
            continue
        
        # Check existing swipe
        existing_swipe = session.exec(
            select(Swipe).where(
                and_(
                    Swipe.candidate_id == candidate.id,
                    Swipe.job_posting_id == job_posting_id,
                    Swipe.action_by == "recruiter"
                )
            )
        ).first()
        
        # Get match
        match = session.exec(
            select(Match).where(
                and_(
                    Match.candidate_id == candidate.id,
                    Match.job_posting_id == job_posting_id
                )
            )
        ).first()
        
        # Check application status
        application = session.exec(
            select(Application).where(
                and_(
                    Application.candidate_id == candidate.id,
                    Application.job_posting_id == job_posting_id
                )
            )
        ).first()
        
        # Skills
        skills_list = []
        for sk in profile.skills:
            skills_list.append({
                "skill_name": sk.skill_name,
                "skill_category": sk.skill_category,
                "proficiency_level": sk.proficiency_level
            })
        
        # Location preferences
        location_prefs = []
        for lp in profile.location_preferences:
            location_prefs.append({
                "city": lp.city,
                "state": lp.state,
                "country": lp.country
            })
        
        # Resumes
        resumes_list = []
        for r in candidate.resumes:
            resumes_list.append({
                "id": r.id,
                "filename": r.filename,
                "storage_path": r.storage_path,
                "uploaded_at": r.uploaded_at.isoformat() if r.uploaded_at else None
            })
        
        # Certifications
        certs_list = []
        for ct in candidate.certifications:
            certs_list.append({
                "id": ct.id,
                "name": ct.name,
                "issuer": ct.issuer,
                "filename": ct.filename,
                "storage_path": ct.storage_path,
                "issued_date": ct.issued_date,
                "expiry_date": ct.expiry_date
            })
        
        # Get taxonomy names for display
        taxonomy = get_taxonomy_names(profile, session)
        
        recommendations.append({
            "candidate": {
                "id": candidate.id,
                "user_id": candidate.user_id,
                "name": candidate.name,
                "email": candidate.email,
                "phone": candidate.phone,
                "location_state": candidate.location_state,
                "linkedin_url": candidate.linkedin_url,
                "github_url": candidate.github_url,
                "portfolio_url": candidate.portfolio_url,
                "resumes": resumes_list,
                "certifications": certs_list
            },
            "job_profile": {
                "id": profile.id,
                "profile_name": profile.profile_name,
                "product_vendor": taxonomy["product_vendor"],
                "product_type": taxonomy["product_type"],
                "job_role": taxonomy["job_role"],
                "years_of_experience": profile.years_of_experience,
                "worktype": profile.worktype,
                "employment_type": profile.employment_type,
                "salary_min": profile.salary_min,
                "salary_max": profile.salary_max,
                "visa_status": profile.visa_status,
                "availability_date": profile.availability_date,
                "highest_education": profile.highest_education,
                "security_clearance": profile.security_clearance,
                "linkedin_url": profile.linkedin_url,
                "github_url": profile.github_url,
                "portfolio_url": profile.portfolio_url,
                "twitter_url": profile.twitter_url,
                "website_url": profile.website_url,
                "skills": skills_list,
                "location_preferences": location_prefs
            },
            "match_percentage": float(match.match_percentage) if (match and match.match_percentage) else float(score_lookup.get(profile.id, 50)),
            "already_actioned": existing_swipe is not None,
            "action_taken": existing_swipe.action if existing_swipe else None,
            "has_applied": application is not None,
            "application_status": application.status if application else None
        })
    
    # Deduplicate by candidate_id – keep only the best-matching profile per candidate
    best_by_candidate: dict = {}
    for rec in recommendations:
        cid = rec["candidate"]["id"]
        if cid not in best_by_candidate or rec["match_percentage"] > best_by_candidate[cid]["match_percentage"]:
            best_by_candidate[cid] = rec
    recommendations = list(best_by_candidate.values())
    
    return {
        "job_posting_id": job_posting_id,
        "job_title": job_posting.job_title,
        "analytics": {
            "shortlisted_count": len(shortlisted_count),
            "required_count": 0,  # Placeholder - can be set in job posting
            "interview_count": len([a for a in applications_count if a.status == "shortlisted"]),
            "offered_count": len([a for a in applications_count if a.status == "offered"])
        },
        "recommendations": recommendations
    }


@router.get("/recruiter/shortlist", response_model=List[Dict[str, Any]])
def get_recruiter_shortlist(
    job_posting_id: int = Query(None, description="Filter by specific job posting"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get shortlisted candidates (liked or asked to apply)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please log in again.")
    if user.role == UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Recruiters only")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Get all company IDs with the same company name
    company_ids = list(session.exec(
        select(Company.id).where(Company.company_name == company.company_name)
    ).all())
    
    # Build query
    query = select(Swipe).where(
        and_(
            Swipe.company_id.in_(company_ids),
            Swipe.action.in_(["like", "ask_to_apply"]),
            Swipe.action_by == "recruiter"
        )
    )
    
    if job_posting_id:
        query = query.where(Swipe.job_posting_id == job_posting_id)
    
    shortlisted = session.exec(query).all()
    
    # Deduplicate: keep only the latest swipe per (candidate, job_profile, job_posting)
    # This prevents duplicate cards when the same candidate is invited multiple times
    seen = {}
    for swipe in shortlisted:
        key = (swipe.candidate_id, swipe.job_profile_id, swipe.job_posting_id)
        if key not in seen or swipe.created_at > seen[key].created_at:
            seen[key] = swipe
    unique_shortlisted = list(seen.values())
    
    result = []
    for swipe in unique_shortlisted:
        candidate = session.get(Candidate, swipe.candidate_id)
        job_profile = session.get(JobProfile, swipe.job_profile_id)
        job_posting = session.get(JobPosting, swipe.job_posting_id)

        if not candidate or not job_profile or not job_posting:
            logger.warning(
                "Skipping orphaned shortlist swipe id=%s (candidate=%s, profile=%s, posting=%s)",
                swipe.id,
                bool(candidate),
                bool(job_profile),
                bool(job_posting),
            )
            continue

        # Skills
        skills_list = []
        if job_profile:
            for sk in job_profile.skills:
                skills_list.append({
                    "skill_name": sk.skill_name,
                    "skill_category": sk.skill_category,
                    "proficiency_level": sk.proficiency_level
                })

        # Location preferences
        location_prefs = []
        if job_profile:
            for lp in job_profile.location_preferences:
                location_prefs.append({
                    "city": lp.city,
                    "state": lp.state,
                    "country": lp.country
                })

        # Resumes
        resumes_list = []
        if candidate:
            for r in candidate.resumes:
                resumes_list.append({
                    "id": r.id,
                    "filename": r.filename,
                    "storage_path": r.storage_path,
                    "uploaded_at": r.uploaded_at.isoformat() if r.uploaded_at else None
                })

        # Certifications
        certs_list = []
        if candidate:
            for ct in candidate.certifications:
                certs_list.append({
                    "id": ct.id,
                    "name": ct.name,
                    "issuer": ct.issuer,
                    "filename": ct.filename,
                    "storage_path": ct.storage_path,
                    "issued_date": ct.issued_date,
                    "expiry_date": ct.expiry_date
                })

        # Merge social links with precedence: profile → candidate fallback
        social_links = merge_social_links(job_profile, candidate)

        # Count ask_to_apply invites for this candidate
        invite_swipes = session.exec(
            select(Swipe).where(
                and_(
                    Swipe.candidate_id == swipe.candidate_id,
                    Swipe.job_profile_id == swipe.job_profile_id,
                    Swipe.action == "ask_to_apply",
                    Swipe.action_by == "recruiter",
                    Swipe.company_id.in_(company_ids)
                )
            )
        ).all()
        invite_count = len(invite_swipes)
        already_invited = invite_count > 0

        # Get taxonomy names for display
        taxonomy = get_taxonomy_names(job_profile, session)

        result.append({
            "candidate": {
                "id": candidate.id,
                "user_id": candidate.user_id,
                "name": candidate.name,
                "email": candidate.email,
                "phone": candidate.phone,
                "location_state": candidate.location_state,
                "location_county": candidate.location_county,
                "profile_summary": candidate.profile_summary,
                "resumes": resumes_list,
                "certifications": certs_list
            },
            "job_profile": {
                "id": job_profile.id,
                "profile_name": job_profile.profile_name,
                "job_role": taxonomy["job_role"],
                "product_vendor": taxonomy["product_vendor"],
                "product_type": taxonomy["product_type"],
                "years_of_experience": job_profile.years_of_experience,
                "worktype": job_profile.worktype,
                "employment_type": job_profile.employment_type,
                "salary_min": job_profile.salary_min,
                "salary_max": job_profile.salary_max,
                "salary_currency": job_profile.salary_currency,
                "visa_status": job_profile.visa_status,
                "seniority_level": job_profile.seniority_level,
                "highest_education": job_profile.highest_education,
                "notice_period": job_profile.notice_period,
                "profile_summary": job_profile.profile_summary,
                "availability_date": job_profile.availability_date,
                "travel_willingness": job_profile.travel_willingness,
                "shift_preference": job_profile.shift_preference,
                "remote_acceptance": job_profile.remote_acceptance,
                "relocation_willingness": job_profile.relocation_willingness,
                "pay_type": job_profile.pay_type,
                "negotiability": job_profile.negotiability,
                "linkedin_url": social_links["linkedin_url"],
                "github_url": social_links["github_url"],
                "portfolio_url": social_links["portfolio_url"],
                "other_social_url": social_links["other_social_url"],
                "skills": skills_list,
                "location_preferences": location_prefs
            },
            "job_posting": {
                "id": job_posting.id,
                "job_title": job_posting.job_title,
                "location": job_posting.location,
                "seniority_level": job_posting.seniority_level
            },
            "action": swipe.action,
            "shortlisted_at": swipe.created_at.isoformat(),
            "already_invited": already_invited,
            "invite_count": invite_count
        })
    
    return result


@router.get("/recruiter/applications", response_model=List[Dict[str, Any]])
def get_recruiter_applications(
    job_posting_id: int = Query(None, description="Filter by specific job posting"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get all applications to recruiter's job postings.
    
    Returns application snapshot: only the selected job_profile (no sibling profiles),
    with certifications resolved from job_profile.certification_ids.
    """
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please log in again.")
    if user.role == UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Recruiters only")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Get all company IDs with the same company name
    company_ids = list(session.exec(
        select(Company.id).where(Company.company_name == company.company_name)
    ).all())
    
    # Get all job postings for this company
    if job_posting_id:
        job_postings = [session.get(JobPosting, job_posting_id)]
        if not job_postings[0] or job_postings[0].company_id not in company_ids:
            raise HTTPException(status_code=404, detail="Job posting not found")
    else:
        job_postings = session.exec(
            select(JobPosting).where(JobPosting.company_id.in_(company_ids))
        ).all()
    
    # Get applications for these postings
    job_ids = [jp.id for jp in job_postings]
    applications = session.exec(
        select(Application).where(Application.job_posting_id.in_(job_ids))
    ).all()
    
    result = []
    for app in applications:
        candidate = session.get(Candidate, app.candidate_id)
        job_profile = session.get(JobProfile, app.job_profile_id)
        job_posting = session.get(JobPosting, app.job_posting_id)
        
        if not candidate or not job_profile or not job_posting:
            logger.warning(
                "Skipping orphaned application id=%s (candidate=%s, profile=%s, posting=%s)",
                app.id,
                bool(candidate),
                bool(job_profile),
                bool(job_posting),
            )
            continue
        
        # Gather skills for the profile
        from app.models import Skill
        skills = session.exec(
            select(Skill).where(Skill.job_profile_id == job_profile.id)
        ).all()
        skills_list = [{"skill_name": s.skill_name, "skill_category": s.skill_category, "proficiency_level": s.proficiency_level} for s in skills]
        
        # Gather resumes: primary_resume_id + attached_resume_ids from job_profile
        resumes_list = []
        resume_ids_to_fetch = set()
        
        if job_profile.primary_resume_id:
            resume_ids_to_fetch.add(job_profile.primary_resume_id)
        
        if job_profile.attached_resume_ids:
            try:
                attached_ids = json.loads(job_profile.attached_resume_ids)
                if isinstance(attached_ids, list):
                    resume_ids_to_fetch.update(attached_ids)
            except (json.JSONDecodeError, TypeError):
                pass
        
        # Fetch selected resumes only (no fallback to all resumes)
        for resume_id in resume_ids_to_fetch:
            resume = session.get(Resume, resume_id)
            if resume and resume.candidate_id == candidate.id:
                resumes_list.append({
                    "id": resume.id,
                    "filename": resume.filename,
                    "uploaded_at": resume.uploaded_at.isoformat()
                })
        
        # Gather certifications: ONLY from job_profile.certification_ids (snapshot behavior)
        certifications_list = []
        if job_profile.certification_ids:
            try:
                cert_ids = json.loads(job_profile.certification_ids)
                if isinstance(cert_ids, list):
                    for cert_id in cert_ids:
                        cert = session.get(Certification, cert_id)
                        if cert and cert.candidate_id == candidate.id:
                            certifications_list.append({
                                "id": cert.id,
                                "name": cert.name,
                                "issuer": cert.issuer,
                                "filename": cert.filename,
                                "issued_date": cert.issued_date,
                                "expiry_date": cert.expiry_date,
                                "created_at": cert.created_at.isoformat() if cert.created_at else None
                            })
            except (json.JSONDecodeError, TypeError):
                pass
        
        # Merge social links with precedence: profile → candidate fallback
        social_links = merge_social_links(job_profile, candidate)
        
        # Get taxonomy names for display
        taxonomy = get_taxonomy_names(job_profile, session)
        
        result.append({
            "application_id": app.id,
            "status": app.status,
            "applied_at": app.applied_at.isoformat(),
            "recruiter_notes": app.recruiter_notes,
            "notes_updated_at": app.notes_updated_at.isoformat() if app.notes_updated_at else None,
            "candidate": {
                "id": candidate.id,
                "user_id": candidate.user_id,
                "name": candidate.name,
                "email": candidate.email,
                "phone": candidate.phone,
                "location": f"{candidate.location_county}, {candidate.location_state}" if candidate.location_county else candidate.location_state,
            },
            "job_posting": {
                "id": job_posting.id,
                "title": job_posting.job_title,
                "location": job_posting.location,
            },
            "job_profile": {
                "id": job_profile.id,
                "profile_name": job_profile.profile_name,
                "desired_role": taxonomy["job_role"],
                "desired_salary": f"{job_profile.salary_currency.upper() if job_profile.salary_currency else '$'} {int(job_profile.salary_min):,} - {int(job_profile.salary_max):,}" if job_profile.salary_min is not None else None,
                "desired_location": job_profile.worktype.value if job_profile.worktype else None,
                "work_preference": job_profile.worktype.value if job_profile.worktype else None,
                "linkedin_url": social_links["linkedin_url"],
                "github_url": social_links["github_url"],
                "portfolio_url": social_links["portfolio_url"],
                "other_social_url": social_links["other_social_url"],
                "skills": skills_list,
                "experience": job_profile.years_of_experience,
                "education": job_profile.highest_education,
                "certifications": certifications_list,
                # Additional fields for backward compatibility with existing UI
                "years_of_experience": job_profile.years_of_experience,
                "worktype": job_profile.worktype,
                "employment_type": job_profile.employment_type,
                "salary_min": job_profile.salary_min,
                "salary_max": job_profile.salary_max,
                "salary_currency": job_profile.salary_currency,
                "visa_status": job_profile.visa_status,
                "seniority_level": job_profile.seniority_level,
                "highest_education": job_profile.highest_education,
                "notice_period": job_profile.notice_period,
                "profile_summary": job_profile.profile_summary,
                "resumes": resumes_list,
            }
        })
    
    return result


@router.get("/recruiter/applications/{application_id}/resumes/{resume_id}/download")
def download_application_resume(
    application_id: int,
    resume_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Securely download resume file for a specific application
    
    Security checks:
    1. User must be a recruiter
    2. Recruiter must belong to the company that owns the job posting
    3. Application and resume must exist and be linked
    4. File must exist at storage path
    """
    # 1. User Role Check
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please log in again.")
    if user.role == UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Access denied. Recruiters only.")
    
    # 2. Company Ownership Check
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Get all company IDs with the same company name (for multi-user companies)
    company_ids = list(session.exec(
        select(Company.id).where(Company.company_name == company.company_name)
    ).all())
    
    # 3. Application Validation
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Verify the job posting belongs to the recruiter's company
    job_posting = session.get(JobPosting, application.job_posting_id)
    if not job_posting or job_posting.company_id not in company_ids:
        raise HTTPException(status_code=403, detail="Access denied. You can only download resumes for your company's job postings.")
    
    # Verify resume belongs to the candidate who applied
    resume = session.get(Resume, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if resume.candidate_id != application.candidate_id:
        raise HTTPException(status_code=403, detail="Resume does not belong to this applicant")
    
    # 4. File Existence Check
    file_path = Path(resume.storage_path)
    if not file_path.exists() or not file_path.is_file():
        logger.error(f"Resume file not found at path: {resume.storage_path}")
        raise HTTPException(status_code=404, detail="Resume file not found on server")
    
    # Return the file
    logger.info(f"Recruiter {user.email} downloading resume {resume_id} for application {application_id}")
    return FileResponse(
        path=str(file_path),
        filename=resume.filename,
        media_type="application/octet-stream"
    )


@router.get("/recruiter/applications/{application_id}/certifications/{certification_id}/download")
def download_application_certification(
    application_id: int,
    certification_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Securely download certification file for a specific application
    
    Security checks:
    1. User must be a recruiter
    2. Recruiter must belong to the company that owns the job posting
    3. Application and certification must exist and be linked
    4. File must exist at storage path
    """
    # 1. User Role Check
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please log in again.")
    if user.role == UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Access denied. Recruiters only.")
    
    # 2. Company Ownership Check
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Get all company IDs with the same company name (for multi-user companies)
    company_ids = list(session.exec(
        select(Company.id).where(Company.company_name == company.company_name)
    ).all())
    
    # 3. Application Validation
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Verify the job posting belongs to the recruiter's company
    job_posting = session.get(JobPosting, application.job_posting_id)
    if not job_posting or job_posting.company_id not in company_ids:
        raise HTTPException(status_code=403, detail="Access denied. You can only download certifications for your company's job postings.")
    
    # Verify certification belongs to the candidate who applied
    certification = session.get(Certification, certification_id)
    if not certification:
        raise HTTPException(status_code=404, detail="Certification not found")
    
    if certification.candidate_id != application.candidate_id:
        raise HTTPException(status_code=403, detail="Certification does not belong to this applicant")
    
    # Check if certification has a file
    if not certification.filename or not certification.storage_path:
        raise HTTPException(status_code=404, detail="This certification does not have an attached file")
    
    # 4. File Existence Check
    file_path = Path(certification.storage_path)
    if not file_path.exists() or not file_path.is_file():
        logger.error(f"Certification file not found at path: {certification.storage_path}")
        raise HTTPException(status_code=404, detail="Certification file not found on server")
    
    # Return the file
    logger.info(f"Recruiter {user.email} downloading certification {certification_id} for application {application_id}")
    return FileResponse(
        path=str(file_path),
        filename=certification.filename,
        media_type="application/octet-stream"
    )


@router.get("/recruiter/matches", response_model=List[Dict[str, Any]])
def get_recruiter_matches(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get mutual matches for recruiter"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please log in again.")
    if user.role == UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Recruiters only")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Get all company IDs with the same company name
    company_ids = list(session.exec(
        select(Company.id).where(Company.company_name == company.company_name)
    ).all())
    
    # Get mutual matches
    matches = session.exec(
        select(Match).where(
            and_(
                Match.company_id.in_(company_ids),
                Match.candidate_liked == True,
                Match.company_liked == True
            )
        )
    ).all()
    
    result = []
    for match in matches:
        candidate = session.get(Candidate, match.candidate_id)
        job_profile = session.get(JobProfile, match.job_profile_id)
        job_posting = session.get(JobPosting, match.job_posting_id)

        # Skills
        skills_list = []
        if job_profile:
            for sk in job_profile.skills:
                skills_list.append({
                    "skill_name": sk.skill_name,
                    "skill_category": sk.skill_category,
                    "proficiency_level": sk.proficiency_level
                })

        # Location preferences
        location_prefs = []
        if job_profile:
            for lp in job_profile.location_preferences:
                location_prefs.append({
                    "city": lp.city,
                    "state": lp.state,
                    "country": lp.country
                })

        # Resumes
        resumes_list = []
        if candidate:
            for r in candidate.resumes:
                resumes_list.append({
                    "id": r.id,
                    "filename": r.filename,
                    "storage_path": r.storage_path,
                    "uploaded_at": r.uploaded_at.isoformat() if r.uploaded_at else None
                })

        # Certifications
        certs_list = []
        if candidate:
            for c in candidate.certifications:
                certs_list.append({
                    "id": c.id,
                    "name": c.name,
                    "issuer": c.issuer,
                    "filename": c.filename,
                    "storage_path": c.storage_path,
                    "issued_date": c.issued_date,
                    "expiry_date": c.expiry_date
                })

        # Merge social links with precedence: profile → candidate fallback
        social_links = merge_social_links(job_profile, candidate)

        # Get taxonomy names for display
        taxonomy = get_taxonomy_names(job_profile, session)

        result.append({
            "match_id": match.id,
            "candidate": {
                "id": candidate.id,
                "user_id": candidate.user_id,
                "name": candidate.name,
                "email": candidate.email,
                "phone": candidate.phone,
                "location_state": candidate.location_state,
                "location_county": candidate.location_county,
                "profile_summary": candidate.profile_summary,
                "resumes": resumes_list,
                "certifications": certs_list
            },
            "job_profile": {
                "id": job_profile.id,
                "profile_name": job_profile.profile_name,
                "job_role": taxonomy["job_role"],
                "product_vendor": taxonomy["product_vendor"],
                "product_type": taxonomy["product_type"],
                "years_of_experience": job_profile.years_of_experience,
                "worktype": job_profile.worktype,
                "employment_type": job_profile.employment_type,
                "salary_min": job_profile.salary_min,
                "salary_max": job_profile.salary_max,
                "salary_currency": job_profile.salary_currency,
                "visa_status": job_profile.visa_status,
                "seniority_level": job_profile.seniority_level,
                "highest_education": job_profile.highest_education,
                "notice_period": job_profile.notice_period,
                "profile_summary": job_profile.profile_summary,
                "availability_date": job_profile.availability_date,
                "travel_willingness": job_profile.travel_willingness,
                "shift_preference": job_profile.shift_preference,
                "remote_acceptance": job_profile.remote_acceptance,
                "relocation_willingness": job_profile.relocation_willingness,
                "pay_type": job_profile.pay_type,
                "negotiability": job_profile.negotiability,
                "linkedin_url": social_links["linkedin_url"],
                "github_url": social_links["github_url"],
                "portfolio_url": social_links["portfolio_url"],
                "other_social_url": social_links["other_social_url"],
                "skills": skills_list,
                "location_preferences": location_prefs
            },
            "job_posting": {
                "id": job_posting.id,
                "job_title": job_posting.job_title,
                "location": job_posting.location,
                "seniority_level": job_posting.seniority_level
            },
            "match_percentage": match.match_percentage,
            "matched_at": match.created_at.isoformat()
        })
    
    return result


# ============================================================================
# TEAM MANAGEMENT
# ============================================================================

@router.get("/team-members")
def get_team_members(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get team members for the current user's company with job posting counts.
    Admin sees: self + HR + Recruiter
    HR sees: self + Recruiter
    Recruiter sees: only self
    """
    user_email = current_user.get("sub")
    user_id = current_user.get("user_id")
    user_role = current_user.get("role")
    logger.info(f"[TEAM] Fetching team members for {user_email} (role: {user_role})")

    # Get current user's company record
    my_company = session.exec(
        select(Company).where(Company.user_id == user_id)
    ).first()

    if not my_company:
        return {"team_members": [], "my_role": user_role}

    company_name = my_company.company_name

    # Find all company records with same company_name
    all_company_records = session.exec(
        select(Company).where(Company.company_name == company_name)
    ).all()

    # Determine which roles the current user can see
    if user_role == "admin":
        visible_roles = {"ADMIN", "HR", "RECRUITER"}
    elif user_role == "hr":
        visible_roles = {"HR", "RECRUITER"}
    else:
        # Recruiter sees only self
        visible_roles = {"RECRUITER"}

    team_members = []
    for comp in all_company_records:
        if comp.employee_type.upper() not in visible_roles:
            continue

        user = session.get(User, comp.user_id)
        if not user:
            continue

        # Count job postings for this company record
        job_count = len(session.exec(
            select(JobPosting).where(JobPosting.company_id == comp.id)
        ).all())

        team_members.append({
            "id": comp.id,
            "user_id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": comp.employee_type,
            "jobs_posted": job_count,
            "status": "Active" if user.is_active else "Inactive",
            "is_self": user.id == user_id
        })

    # Sort: Admin first, then HR, then Recruiter
    role_order = {"ADMIN": 0, "HR": 1, "RECRUITER": 2}
    team_members.sort(key=lambda m: role_order.get(m["role"].upper(), 99))

    return {
        "team_members": team_members,
        "my_role": user_role,
        "company_name": company_name
    }


# ============================================================================
# BROWSE ALL CANDIDATES (RECRUITER)
# ============================================================================

@router.get("/recruiter/candidates", response_model=Dict[str, Any])
def browse_all_candidates(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: str = Query(None, description="Search by name, role, or skills"),
    work_type: str = Query(None, description="Filter by work type"),
    location: str = Query(None, description="Filter by location"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Browse all available candidates across the platform (recruiter-only)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please log in again.")
    if user.role == UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Recruiters only")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    # Get all company IDs with the same company name for action checking
    company_ids = list(session.exec(
        select(Company.id).where(Company.company_name == company.company_name)
    ).all())
    
    # Base query: all candidates
    query = select(Candidate)
    
    # Apply search filter
    if search:
        search_lower = search.lower()
        query = query.where(
            or_(
                Candidate.name.ilike(f"%{search}%"),
                Candidate.email.ilike(f"%{search}%"),
                Candidate.location_state.ilike(f"%{search}%"),
                Candidate.profile_summary.ilike(f"%{search}%")
            )
        )
    
    # Apply location filter
    if location:
        query = query.where(Candidate.location_state.ilike(f"%{location}%"))
    
    # Get total count
    total_candidates = len(session.exec(query).all())
    
    # Apply pagination
    offset = (page - 1) * limit
    candidates = session.exec(query.offset(offset).limit(limit)).all()
    
    result_items = []
    for candidate in candidates:
        # Get candidate's job profiles
        job_profiles = session.exec(
            select(JobProfile).where(JobProfile.candidate_id == candidate.id)
        ).all()
        
        # Get primary or first job profile for headline/main role
        primary_profile = job_profiles[0] if job_profiles else None
        
        # Collect skills from all profiles
        all_skills = []
        for profile in job_profiles:
            profile_skills = session.exec(
                select(Skill).where(Skill.job_profile_id == profile.id)
            ).all()
            all_skills.extend([{
                "skill_name": s.skill_name,
                "proficiency_level": s.proficiency_level
            } for s in profile_skills[:5]])  # Limit to top 5 per profile
        
        # Deduplicate skills
        unique_skills = {s["skill_name"]: s for s in all_skills}
        top_skills = list(unique_skills.values())[:10]  # Top 10 unique skills
        
        # Check if already liked or invited by this recruiter/company
        already_liked = False
        already_invited = False
        
        if primary_profile:
            # Check for like actions
            like_swipe = session.exec(
                select(Swipe).where(
                    and_(
                        Swipe.candidate_id == candidate.id,
                        Swipe.job_profile_id == primary_profile.id,
                        Swipe.action == "like",
                        Swipe.action_by == "recruiter",
                        Swipe.company_id.in_(company_ids)
                    )
                )
            ).first()
            already_liked = like_swipe is not None
            
            # Check for ask_to_apply actions and count them
            invite_swipes = session.exec(
                select(Swipe).where(
                    and_(
                        Swipe.candidate_id == candidate.id,
                        Swipe.job_profile_id == primary_profile.id,
                        Swipe.action == "ask_to_apply",
                        Swipe.action_by == "recruiter",
                        Swipe.company_id.in_(company_ids)
                    )
                )
            ).all()
            already_invited = len(invite_swipes) > 0
            invite_count = len(invite_swipes)
        
        # Format job profiles for response
        formatted_profiles = []
        for profile in job_profiles:
            formatted_profiles.append({
                "id": profile.id,
                "profile_name": profile.profile_name,
                "job_role": profile.job_role,
                "product_vendor": profile.product_vendor,
                "product_type": profile.product_type,
                "years_of_experience": profile.years_of_experience,
                "worktype": profile.worktype,
                "employment_type": profile.employment_type,
                "salary_min": profile.salary_min,
                "salary_max": profile.salary_max,
                "salary_currency": profile.salary_currency,
                "seniority_level": profile.seniority_level
            })
        
        # Build candidate item
        candidate_item = {
            "candidate_id": candidate.id,
            "user_id": candidate.user_id,
            "full_name": candidate.name,
            "email": candidate.email,
            "headline": f"{primary_profile.job_role} - {primary_profile.product_vendor} {primary_profile.product_type}" if primary_profile else "Professional",
            "location": f"{candidate.location_state}",
            "years_experience": primary_profile.years_of_experience if primary_profile else 0,
            "skills": top_skills,
            "work_type": primary_profile.worktype if primary_profile else None,
            "availability": "Open to work" if primary_profile else "Available",
            "profile_summary": candidate.profile_summary or "No summary available",
            "job_profiles": formatted_profiles,
            "already_liked": already_liked,
            "already_invited": already_invited,
            "invite_count": invite_count if primary_profile else 0
        }
        
        # Apply work_type filter if specified
        if work_type and primary_profile:
            if primary_profile.worktype.lower() != work_type.lower():
                continue
        
        result_items.append(candidate_item)
    
    return {
        "items": result_items,
        "page": page,
        "limit": limit,
        "total": total_candidates
    }


@router.get("/recruiter/candidate/{candidate_id}", response_model=Dict[str, Any])
def get_candidate_detail(
    candidate_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get detailed candidate profile (recruiter-only)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please log in again.")
    if user.role == UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Recruiters only")
    
    # Get candidate
    candidate = session.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get job profiles
    job_profiles = session.exec(
        select(JobProfile).where(JobProfile.candidate_id == candidate.id)
    ).all()
    
    # Format job profiles with skills and location preferences
    formatted_profiles = []
    for profile in job_profiles:
        # Get skills for this profile
        skills = session.exec(
            select(Skill).where(Skill.job_profile_id == profile.id)
        ).all()
        
        # Get location preferences
        location_prefs = session.exec(
            select(LocationPreference).where(LocationPreference.job_profile_id == profile.id)
        ).all()
        
        formatted_profiles.append({
            "id": profile.id,
            "profile_name": profile.profile_name,
            "product_vendor": profile.product_vendor,
            "product_type": profile.product_type,
            "job_role": profile.job_role,
            "years_of_experience": profile.years_of_experience,
            "worktype": profile.worktype,
            "employment_type": profile.employment_type,
            "salary_min": profile.salary_min,
            "salary_max": profile.salary_max,
            "salary_currency": profile.salary_currency,
            "visa_status": profile.visa_status,
            "seniority_level": profile.seniority_level,
            "availability_date": profile.availability_date,
            "notice_period": profile.notice_period,
            "highest_education": profile.highest_education,
            "profile_summary": profile.profile_summary,
            "travel_willingness": profile.travel_willingness,
            "remote_acceptance": profile.remote_acceptance,
            "relocation_willingness": profile.relocation_willingness,
            "linkedin_url": profile.linkedin_url,
            "github_url": profile.github_url,
            "portfolio_url": profile.portfolio_url,
            "skills": [{
                "skill_name": s.skill_name,
                "skill_category": s.skill_category,
                "proficiency_level": s.proficiency_level,
                "years_experience": s.years_experience
            } for s in skills],
            "location_preferences": [{
                "city": lp.city,
                "state": lp.state,
                "country": lp.country,
                "preference_order": lp.preference_order
            } for lp in location_prefs]
        })
    
    # Get resumes
    resumes = session.exec(
        select(Resume).where(Resume.candidate_id == candidate.id)
    ).all()
    
    # Get certifications
    certifications = session.exec(
        select(Certification).where(Certification.candidate_id == candidate.id)
    ).all()
    
    return {
        "candidate_id": candidate.id,
        "user_id": candidate.user_id,
        "full_name": candidate.name,
        "email": candidate.email,
        "phone": candidate.phone,
        "location": {
            "address": candidate.residential_address,
            "state": candidate.location_state,
            "county": candidate.location_county,
            "zipcode": candidate.location_zipcode
        },
        "profile_summary": candidate.profile_summary,
        "linkedin_url": candidate.linkedin_url,
        "github_url": candidate.github_url,
        "portfolio_url": candidate.portfolio_url,
        "job_profiles": formatted_profiles,
        "resumes": [{
            "id": r.id,
            "filename": r.filename,
            "uploaded_at": r.uploaded_at.isoformat() if r.uploaded_at else None
        } for r in resumes],
        "certifications": [{
            "id": c.id,
            "name": c.name,
            "issuer": c.issuer,
            "filename": c.filename,
            "issued_date": c.issued_date,
            "expiry_date": c.expiry_date
        } for c in certifications]
    }


