"""
Recruiter/company-facing dashboard routes: recommendations, shortlist,
applications, matches, candidate browsing, and team members.

Split out of the former monolithic dashboard.py alongside
dashboard_candidate.py; both routers share the "/dashboard" prefix.
"""

import json
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import FileResponse
from sqlmodel import Session, select, or_, and_
from typing import List, Dict, Any
from app.database import get_session
from app.models import (
    User, Candidate, Company, JobPosting, JobProfile,
    Match, Application, Swipe, UserRole, Skill, LocationPreference,
    Resume, Certification,
    ProductVendor, ProductType, ProductRole,
)
from app.security import get_current_user
from app.services.job_match_scoring import calculate_job_match_score

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
        return {"job_posting_id": job_posting_id, "job_title": "", "analytics": {"shortlisted_count": 0, "required_count": 0, "interview_count": 0, "offered_count": 0}, "recommendations": []}
    
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
            "match_details": calculate_job_match_score(job_posting, profile, session).get("details") or {},
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
        return []
    
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
        return []
    
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
        return []
    
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

    # Get all company IDs with the same company name for action checking (empty if no profile yet)
    company_ids = []
    if company:
        company_ids = list(session.exec(
            select(Company.id).where(Company.company_name == company.company_name)
        ).all())
    
    # Base query: all candidates
    query = select(Candidate)
    
    # Apply search filter
    if search:
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


