"""Shared job-match scoring logic used by both the candidate and recruiter
dashboard routers (extracted from the former monolithic dashboard.py).
"""

import json
import logging

from sqlmodel import Session, select

from app.models import JobPosting, JobProfile, LocationPreference, ProductType, ProductVendor, ProductRole, Skill

logger = logging.getLogger(__name__)


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
        "location_match": 0,
        "matched_skills": []
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
                        details["matched_skills"].append(req_skill)
                        break

            nice_matched = 0
            for req_skill in nice_to_have:
                skill_lower = req_skill.lower() if isinstance(req_skill, str) else str(req_skill).lower()
                for cand_skill in candidate_skill_names:
                    if skill_lower in cand_skill or cand_skill in skill_lower:
                        nice_matched += 1
                        details["matched_skills"].append(req_skill)
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

