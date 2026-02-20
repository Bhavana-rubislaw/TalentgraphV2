"""
Recommendations routes
Get matched candidates for job postings
Enhanced matching algorithm with skills, experience, salary, and location matching
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from typing import List
from app.database import get_session
from app.models import JobPosting, Candidate, JobProfile, Company, User, Match, Swipe, Skill, LocationPreference
from app.security import get_current_user
import json

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


def calculate_match_score(job_posting: JobPosting, job_profile: JobProfile, session: Session) -> dict:
    """
    Enhanced matching algorithm:
    - Product/Role match: 35%
    - Skills match: 25%
    - Experience match: 20%
    - Salary match: 10%
    - Location match: 10%
    """
    score = 0
    details = {
        "product_match": 0,
        "skills_match": 0,
        "experience_match": 0,
        "salary_match": 0,
        "location_match": 0,
        "matched_skills": []
    }
    
    # Product & Role match (35%)
    if job_posting.product_vendor == job_profile.product_vendor:
        if job_posting.product_type == job_profile.product_type:
            if job_posting.job_role == job_profile.job_role:
                details["product_match"] = 35
                score += 35
            else:
                details["product_match"] = 25
                score += 25
        else:
            details["product_match"] = 15
            score += 15
    
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
                        details["matched_skills"].append(req_skill)
                        break
            
            skill_ratio = matched / len(required_skills) if required_skills else 0
            details["skills_match"] = int(25 * skill_ratio)
            score += details["skills_match"]
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Experience match (20%)
    try:
        seniority_parts = job_posting.seniority_level.split("-")
        min_years = int(seniority_parts[0].strip())
        
        if job_profile.years_of_experience >= min_years:
            details["experience_match"] = 20
            score += 20
        elif min_years > 0:
            experience_ratio = job_profile.years_of_experience / min_years
            details["experience_match"] = int(20 * min(experience_ratio, 1))
            score += details["experience_match"]
    except (ValueError, IndexError, AttributeError):
        # If parsing fails, give partial credit based on experience
        if job_profile.years_of_experience >= 3:
            details["experience_match"] = 10
            score += 10
    
    # Salary match (10%)
    try:
        # Check if salary ranges overlap (hourly rates or annual salary)
        profile_min = float(job_profile.salary_min) if job_profile.salary_min else 0
        profile_max = float(job_profile.salary_max) if job_profile.salary_max else float('inf')
        posting_min = float(job_posting.salary_min) if job_posting.salary_min else 0
        posting_max = float(job_posting.salary_max) if job_posting.salary_max else float('inf')
        
        # Check for overlap
        if profile_min <= posting_max and profile_max >= posting_min:
            details["salary_match"] = 10
            score += 10
        elif profile_min <= posting_max * 1.2:  # Within 20%
            details["salary_match"] = 5
            score += 5
    except (TypeError, ValueError):
        pass
    
    # Location match (10%)
    location_prefs = session.exec(
        select(LocationPreference).where(LocationPreference.job_profile_id == job_profile.id)
    ).all()
    
    job_location = job_posting.location.lower() if job_posting.location else ""
    
    for loc_pref in location_prefs:
        loc_city = (loc_pref.city or "").lower()
        loc_state = (loc_pref.state or "").lower()
        
        if (loc_city in job_location or 
            loc_state in job_location or
            "remote" in job_location or
            "remote" in loc_city):
            details["location_match"] = 10
            score += 10
            break
    
    # Worktype bonus (if matches, add 5%)
    if job_posting.worktype == job_profile.worktype:
        score = min(score + 5, 100)
    
    return {
        "score": min(score, 100),
        "details": details
    }


@router.get("/job/{job_id}")
def get_job_recommendations(
    job_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get recommended candidates for a specific job posting"""
    logger.info(f"[RECOMMENDATIONS] Getting recommendations for job {job_id}")
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="Recruiter profile not found")
    
    job_posting = session.get(JobPosting, job_id)
    if not job_posting or job_posting.company_id != company.id:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Get all job profiles from candidates
    all_job_profiles = session.exec(select(JobProfile)).all()
    logger.info(f"[RECOMMENDATIONS] Found {len(all_job_profiles)} job profiles to evaluate")
    
    recommendations = []
    for job_profile in all_job_profiles:
        match_info = calculate_match_score(job_posting, job_profile, session)
        
        if match_info["score"] >= 40:  # Lower threshold to show more candidates
            candidate = job_profile.candidate
            
            # Check if already swiped or matched
            existing_swipe = session.exec(
                select(Swipe)
                .where(Swipe.candidate_id == candidate.id)
                .where(Swipe.company_id == company.id)
                .where(Swipe.job_posting_id == job_id)
            ).first()
            
            existing_match = session.exec(
                select(Match)
                .where(Match.candidate_id == candidate.id)
                .where(Match.company_id == company.id)
                .where(Match.job_posting_id == job_id)
            ).first()
            
            # Get skills for this profile
            skills = session.exec(
                select(Skill).where(Skill.job_profile_id == job_profile.id)
            ).all()
            
            recommendations.append({
                "candidate_id": candidate.id,
                "job_profile_id": job_profile.id,
                "name": candidate.name,
                "email": candidate.email,
                "location": candidate.location_state,
                "experience": job_profile.years_of_experience,
                "match_percent": match_info["score"],
                "match_details": match_info["details"],
                "already_swiped": existing_swipe is not None,
                "already_matched": existing_match is not None,
                "is_mutual_match": existing_match.candidate_liked and existing_match.company_liked if existing_match else False,
                "skills": [skill.skill_name for skill in skills],
                "profile_name": job_profile.profile_name,
                "job_role": job_profile.job_role,
                "worktype": job_profile.worktype.value if job_profile.worktype else None,
                "salary_range": f"${job_profile.salary_min:,.0f} - ${job_profile.salary_max:,.0f}"
            })
    
    # Sort by match score descending
    recommendations.sort(key=lambda x: x["match_percent"], reverse=True)
    
    # Deduplicate by candidate_id – keep only the best-matching profile per candidate
    best_by_candidate: dict = {}
    for rec in recommendations:
        cid = rec["candidate_id"]
        if cid not in best_by_candidate or rec["match_percent"] > best_by_candidate[cid]["match_percent"]:
            best_by_candidate[cid] = rec
    recommendations = list(best_by_candidate.values())
    
    logger.info(f"[RECOMMENDATIONS] Returning {len(recommendations)} candidates with match >= 40%")
    
    return {
        "job_id": job_id,
        "job_title": job_posting.job_title,
        "total_recommendations": len(recommendations),
        "recommendations": recommendations
    }


@router.get("/dashboard")
def get_recommendations_dashboard(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get recommendations dashboard with all jobs and their top candidates"""
    logger.info(f"[DASHBOARD] Getting recommendations dashboard for {current_user['email']}")
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="Recruiter profile not found")
    
    # Get all active job postings for this company
    job_postings = session.exec(
        select(JobPosting)
        .where(JobPosting.company_id == company.id)
        .where(JobPosting.is_active == True)
    ).all()
    
    logger.info(f"[DASHBOARD] Found {len(job_postings)} active jobs for company {company.company_name}")
    dashboard_data = []
    
    for job_posting in job_postings:
        # Get recommendations for each job
        all_job_profiles = session.exec(select(JobProfile)).all()
        top_candidates = []
        
        for job_profile in all_job_profiles:
            match_info = calculate_match_score(job_posting, job_profile, session)
            
            if match_info["score"] >= 40:
                candidate = job_profile.candidate
                top_candidates.append({
                    "candidate_id": candidate.id,
                    "job_profile_id": job_profile.id,
                    "name": candidate.name,
                    "match_percent": match_info["score"],
                    "skills": match_info["details"].get("matched_skills", [])
                })
        
        top_candidates.sort(key=lambda x: x["match_percent"], reverse=True)
        
        # Count swipes/matches for this job
        matches = session.exec(
            select(Match)
            .where(Match.company_id == company.id)
            .where(Match.job_posting_id == job_posting.id)
        ).all()
        
        liked_count = sum(1 for m in matches if m.company_liked)
        asked_count = sum(1 for m in matches if m.company_asked_to_apply)
        mutual_count = sum(1 for m in matches if m.company_liked and m.candidate_liked)
        
        dashboard_data.append({
            "job_id": job_posting.id,
            "job_title": job_posting.job_title,
            "product_vendor": job_posting.product_vendor,
            "product_type": job_posting.product_type,
            "role": job_posting.job_role,
            "location": job_posting.location,
            "top_candidates": top_candidates[:5],  # Top 5
            "total_candidates": len(top_candidates),
            "liked_count": liked_count,
            "asked_to_apply_count": asked_count,
            "mutual_matches": mutual_count,
            "total_interactions": len(matches)
        })
    
    logger.info(f"[DASHBOARD] Returning dashboard data for {len(dashboard_data)} jobs")
    return {
        "company_name": company.company_name,
        "total_jobs": len(job_postings),
        "jobs": dashboard_data
    }
