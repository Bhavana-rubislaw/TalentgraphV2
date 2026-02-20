"""
Dashboard routes for candidates and recruiters
Recommendations, matches, applications, invites, shortlists
"""

import logging
import json
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session, select, or_, and_
from typing import List, Dict, Any
from app.database import get_session
from app.models import (
    User, Candidate, Company, JobPosting, JobProfile, 
    Match, Application, Swipe, UserRole, Skill, LocationPreference
)
from app.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def calculate_job_match_score(job_posting: JobPosting, job_profile: JobProfile, session: Session) -> dict:
    """Calculate match score from candidate perspective"""
    score = 0
    details = {
        "product_match": 0,
        "skills_match": 0,
        "experience_match": 0,
        "salary_match": 0,
        "location_match": 0
    }
    
    # Product & Role match (35%)
    if job_posting.product_vendor == job_profile.product_vendor:
        if job_posting.product_type == job_profile.product_type:
            details["product_match"] = 35
            score += 35
        else:
            details["product_match"] = 20
            score += 20
    
    # Skills match (25%)
    try:
        required_skills = json.loads(job_posting.required_skills) if job_posting.required_skills else []
        candidate_skills = session.exec(
            select(Skill).where(Skill.job_profile_id == job_profile.id)
        ).all()
        candidate_skill_names = [s.skill_name.lower() for s in candidate_skills]
        
        if required_skills and candidate_skills:
            matched = 0
            for req_skill in required_skills:
                skill_lower = req_skill.lower() if isinstance(req_skill, str) else str(req_skill).lower()
                for cand_skill in candidate_skill_names:
                    if skill_lower in cand_skill or cand_skill in skill_lower:
                        matched += 1
                        break
            skill_ratio = matched / len(required_skills) if required_skills else 0
            details["skills_match"] = int(25 * skill_ratio)
            score += details["skills_match"]
    except:
        pass
    
    # Experience match (20%)
    try:
        seniority_parts = job_posting.seniority_level.split("-")
        min_years = int(seniority_parts[0].strip())
        if job_profile.years_of_experience >= min_years:
            details["experience_match"] = 20
            score += 20
    except:
        details["experience_match"] = 10
        score += 10
    
    # Salary match (10%)
    try:
        profile_min = float(job_profile.salary_min) if job_profile.salary_min else 0
        posting_max = float(job_posting.salary_max) if job_posting.salary_max else float('inf')
        if profile_min <= posting_max:
            details["salary_match"] = 10
            score += 10
    except:
        pass
    
    # Location match (10%)
    location_prefs = session.exec(
        select(LocationPreference).where(LocationPreference.job_profile_id == job_profile.id)
    ).all()
    
    job_location = job_posting.location.lower() if job_posting.location else ""
    
    for loc_pref in location_prefs:
        loc_city = (loc_pref.city or "").lower()
        loc_state = (loc_pref.state or "").lower()
        if loc_city in job_location or loc_state in job_location or "remote" in job_location:
            details["location_match"] = 10
            score += 10
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
    
    # Get all active job postings (broader search)
    all_jobs = session.exec(select(JobPosting).where(JobPosting.is_active == True)).all()
    logger.info(f"[CANDIDATE RECOMMENDATIONS] Evaluating {len(all_jobs)} active jobs")
    
    # Format response with match info
    recommendations = []
    for job in all_jobs:
        # Calculate match score
        match_info = calculate_job_match_score(job, job_profile, session)
        
        # Only include jobs with some match (40%+ threshold)
        if match_info["score"] < 40:
            continue
        
        # Check if already interacted
        existing_swipe = session.exec(
            select(Swipe).where(
                and_(
                    Swipe.candidate_id == candidate.id,
                    Swipe.job_posting_id == job.id,
                    Swipe.action_by == "candidate"
                )
            )
        ).first()
        
        # Get match if exists
        match = session.exec(
            select(Match).where(
                and_(
                    Match.candidate_id == candidate.id,
                    Match.job_posting_id == job.id
                )
            )
        ).first()
        
        # Get company info
        company = session.get(Company, job.company_id)
        
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
            "is_match": match.candidate_liked and match.company_liked if match else False,
            "recruiter_interested": match.company_liked if match else False,
            "recruiter_invited": match.company_asked_to_apply if match else False
        })
    
    # Sort by match score
    recommendations.sort(key=lambda x: x["match_percentage"], reverse=True)
    logger.info(f"[CANDIDATE RECOMMENDATIONS] Returning {len(recommendations)} recommendations")
    
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
    
    result = []
    for invite in invites:
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
            "created_at": invite.created_at.isoformat()
        })
    
    return result


@router.get("/candidate/available-jobs", response_model=List[Dict[str, Any]])
def get_available_jobs(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get all available active jobs"""
    # Get all active job postings
    jobs = session.exec(select(JobPosting).where(JobPosting.is_active == True)).all()
    
    result = []
    for job in jobs:
        company = session.get(Company, job.company_id)
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
            "created_at": job.created_at.isoformat()
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
    if not user or user.role == UserRole.CANDIDATE:
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
    
    # Get matching candidates (by product vendor/type/role in their job profiles)
    query = select(JobProfile).where(
        and_(
            JobProfile.product_vendor == job_posting.product_vendor,
            JobProfile.product_type == job_posting.product_type
        )
    )
    matching_profiles = session.exec(query).all()
    
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
        
        recommendations.append({
            "candidate": {
                "id": candidate.id,
                "name": candidate.name,
                "email": candidate.email,
                "phone": candidate.phone,
                "location_state": candidate.location_state
            },
            "job_profile": {
                "id": profile.id,
                "profile_name": profile.profile_name,
                "years_of_experience": profile.years_of_experience,
                "worktype": profile.worktype,
                "employment_type": profile.employment_type,
                "salary_min": profile.salary_min,
                "salary_max": profile.salary_max,
                "visa_status": profile.visa_status,
                "availability_date": profile.availability_date
            },
            "match_percentage": match.match_percentage if match else 80.0,
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
    if not user or user.role == UserRole.CANDIDATE:
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
    
    result = []
    for swipe in shortlisted:
        candidate = session.get(Candidate, swipe.candidate_id)
        job_profile = session.get(JobProfile, swipe.job_profile_id)
        job_posting = session.get(JobPosting, swipe.job_posting_id)

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

        result.append({
            "candidate": {
                "id": candidate.id,
                "name": candidate.name,
                "email": candidate.email,
                "phone": candidate.phone,
                "location_state": candidate.location_state,
                "location_county": candidate.location_county,
                "linkedin_url": candidate.linkedin_url,
                "github_url": candidate.github_url,
                "portfolio_url": candidate.portfolio_url,
                "profile_summary": candidate.profile_summary,
                "resumes": resumes_list,
                "certifications": certs_list
            },
            "job_profile": {
                "id": job_profile.id,
                "profile_name": job_profile.profile_name,
                "job_role": job_profile.job_role,
                "product_vendor": job_profile.product_vendor,
                "product_type": job_profile.product_type,
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
                "linkedin_url": job_profile.linkedin_url,
                "github_url": job_profile.github_url,
                "portfolio_url": job_profile.portfolio_url,
                "twitter_url": job_profile.twitter_url,
                "website_url": job_profile.website_url,
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
            "shortlisted_at": swipe.created_at.isoformat()
        })
    
    return result


@router.get("/recruiter/applications", response_model=List[Dict[str, Any]])
def get_recruiter_applications(
    job_posting_id: int = Query(None, description="Filter by specific job posting"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get all applications to recruiter's job postings"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user or user.role == UserRole.CANDIDATE:
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
        
        # Gather skills for the profile
        from app.models import Skill
        skills = session.exec(
            select(Skill).where(Skill.job_profile_id == job_profile.id)
        ).all()
        skills_list = [{"skill_name": s.skill_name, "skill_category": s.skill_category, "proficiency_level": s.proficiency_level} for s in skills]
        
        result.append({
            "application_id": app.id,
            "candidate": {
                "id": candidate.id,
                "name": candidate.name,
                "email": candidate.email,
                "phone": candidate.phone,
                "location_state": candidate.location_state,
                "location_county": candidate.location_county,
                "linkedin_url": candidate.linkedin_url,
                "github_url": candidate.github_url
            },
            "job_profile": {
                "id": job_profile.id,
                "profile_name": job_profile.profile_name,
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
                "linkedin_url": job_profile.linkedin_url,
                "github_url": job_profile.github_url,
                "portfolio_url": job_profile.portfolio_url,
                "twitter_url": job_profile.twitter_url,
                "website_url": job_profile.website_url,
                "skills": skills_list
            },
            "job_posting": {
                "id": job_posting.id,
                "job_title": job_posting.job_title,
                "location": job_posting.location,
                "seniority_level": job_posting.seniority_level
            },
            "status": app.status,
            "applied_at": app.applied_at.isoformat()
        })
    
    return result


@router.get("/recruiter/matches", response_model=List[Dict[str, Any]])
def get_recruiter_matches(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get mutual matches for recruiter"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user or user.role == UserRole.CANDIDATE:
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

        result.append({
            "match_id": match.id,
            "candidate": {
                "id": candidate.id,
                "name": candidate.name,
                "email": candidate.email,
                "phone": candidate.phone,
                "location_state": candidate.location_state,
                "location_county": candidate.location_county,
                "linkedin_url": candidate.linkedin_url,
                "github_url": candidate.github_url,
                "portfolio_url": candidate.portfolio_url,
                "profile_summary": candidate.profile_summary,
                "resumes": resumes_list,
                "certifications": certs_list
            },
            "job_profile": {
                "id": job_profile.id,
                "profile_name": job_profile.profile_name,
                "job_role": job_profile.job_role,
                "product_vendor": job_profile.product_vendor,
                "product_type": job_profile.product_type,
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
                "linkedin_url": job_profile.linkedin_url,
                "github_url": job_profile.github_url,
                "portfolio_url": job_profile.portfolio_url,
                "twitter_url": job_profile.twitter_url,
                "website_url": job_profile.website_url,
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
