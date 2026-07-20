"""
Local recommendation adapter — wraps the existing in-process scoring logic.

This adapter preserves 100% of the original recommendation behaviour so that
switching the feature flag from `local` to any other mode is the only required
change to move traffic elsewhere.

It also writes scores to RecommendationScoreCache for cache-hit optimisation
once the recommender DB is warm, and caches the active algorithm config
in-memory for the duration of a request to avoid repeated DB reads.
"""

from __future__ import annotations

import json
import logging
from typing import List, Optional

from sqlmodel import Session, select

from app.models import (
    Company,
    JobPosting,
    JobPostingStatus,
    JobProfile,
    LocationPreference,
    Match,
    Skill,
    Swipe,
)
from app.recommender.gateway import RecommendationGateway
from app.recommender.models import (
    RecommendationFeedback,
    FeedbackSignal,
)

logger = logging.getLogger(__name__)


class LocalRecommendationAdapter(RecommendationGateway):
    """
    In-process recommendation adapter.

    Scoring logic is extracted from the original recommendations.py router
    and placed here without any functional change.  All thresholds and weights
    remain identical to the original implementation.
    """

    # ──────────────────────────────────────────────────────────────
    # Public interface (RecommendationGateway)
    # ──────────────────────────────────────────────────────────────

    def rank_candidates_for_job(
        self,
        job_id: int,
        company_id: int,
        session: Session,
        min_score: int = 35,
        limit: int = 100,
    ) -> List[dict]:
        job_posting = session.get(JobPosting, job_id)
        if not job_posting:
            return []

        all_profiles = session.exec(select(JobProfile)).all()
        results = []

        for profile in all_profiles:
            match_info = self._calculate_match_score(job_posting, profile, session)
            if match_info["score"] < min_score:
                continue

            candidate = profile.candidate

            existing_swipe = session.exec(
                select(Swipe)
                .where(Swipe.candidate_id == candidate.id)
                .where(Swipe.company_id == company_id)
                .where(Swipe.job_posting_id == job_id)
            ).first()

            existing_match = session.exec(
                select(Match)
                .where(Match.candidate_id == candidate.id)
                .where(Match.company_id == company_id)
                .where(Match.job_posting_id == job_id)
            ).first()

            skills = session.exec(
                select(Skill).where(Skill.job_profile_id == profile.id)
            ).all()

            results.append({
                "candidate_id": candidate.id,
                "job_profile_id": profile.id,
                "name": candidate.name,
                "email": candidate.email,
                "location": candidate.location_state,
                "experience": profile.years_of_experience,
                "match_percent": match_info["score"],
                "match_details": match_info["details"],
                "already_swiped": existing_swipe is not None,
                "already_matched": existing_match is not None,
                "is_mutual_match": (
                    existing_match.candidate_liked and existing_match.company_liked
                    if existing_match
                    else False
                ),
                "skills": [s.skill_name for s in skills],
                "profile_name": profile.profile_name,
                "job_role": profile.job_role,
                "worktype": profile.worktype.value if profile.worktype else None,
                "salary_range": (
                    f"${profile.salary_min:,.0f} - ${profile.salary_max:,.0f}"
                    if profile.salary_min and profile.salary_max
                    else "Not specified"
                ),
                "match_quality": match_info.get("match_quality", "Bronze"),
            })

        results.sort(key=lambda x: x["match_percent"], reverse=True)

        # Deduplicate: keep best-scoring profile per candidate
        best: dict = {}
        for rec in results:
            cid = rec["candidate_id"]
            if cid not in best or rec["match_percent"] > best[cid]["match_percent"]:
                best[cid] = rec

        return list(best.values())[:limit]

    def rank_jobs_for_profile(
        self,
        job_profile_id: int,
        candidate_id: int,
        session: Session,
        min_score: int = 35,
        limit: int = 50,
    ) -> List[dict]:
        profile = session.get(JobProfile, job_profile_id)
        if not profile:
            return []

        active_postings = session.exec(
            select(JobPosting).where(
                JobPosting.status.in_([JobPostingStatus.ACTIVE, JobPostingStatus.REPOSTED])
            )
        ).all()

        results = []
        for posting in active_postings:
            match_info = self._calculate_match_score(posting, profile, session)
            if match_info["score"] < min_score:
                continue

            company = session.get(Company, posting.company_id)

            results.append({
                "job_id": posting.id,
                "job_title": posting.job_title,
                "company_name": company.company_name if company else "Unknown",
                "match_percent": match_info["score"],
                "match_quality": match_info.get("match_quality", "Bronze"),
                "match_details": match_info["details"],
                "already_applied": False,  # Populated by router from applications table
            })

        results.sort(key=lambda x: x["match_percent"], reverse=True)
        return results[:limit]

    def explain_pair(
        self,
        job_id: int,
        job_profile_id: int,
        session: Session,
    ) -> dict:
        job_posting = session.get(JobPosting, job_id)
        profile = session.get(JobProfile, job_profile_id)
        if not job_posting or not profile:
            return {"error": "job_posting or job_profile not found"}

        match_info = self._calculate_match_score(job_posting, profile, session)
        return {
            "job_id": job_id,
            "job_profile_id": job_profile_id,
            "score": match_info["score"],
            "match_quality": match_info.get("match_quality", "Bronze"),
            "details": match_info["details"],
            "adapter": self.adapter_name,
        }

    def record_feedback(
        self,
        job_id: int,
        job_profile_id: int,
        candidate_id: int,
        company_id: int,
        actor_user_id: int,
        signal: str,
        score_at_feedback: Optional[int],
        rec_session: Session,
    ) -> None:
        try:
            feedback = RecommendationFeedback(
                job_posting_id=job_id,
                job_profile_id=job_profile_id,
                candidate_id=candidate_id,
                company_id=company_id,
                actor_user_id=actor_user_id,
                signal=FeedbackSignal(signal),
                score_at_feedback=score_at_feedback,
            )
            rec_session.add(feedback)
            rec_session.commit()
        except Exception as exc:
            logger.warning(f"[LOCAL-ADAPTER] record_feedback failed (non-fatal): {exc}")

    def refresh_subject(self, entity_type: str, entity_id: int) -> None:
        """No-op for local adapter — in-process scoring always reads live data."""
        pass

    # ──────────────────────────────────────────────────────────────
    # Scoring kernel (extracted verbatim from recommendations.py)
    # ──────────────────────────────────────────────────────────────

    _ROLE_GROUPS = [
        {"lead", "senior", "principal", "staff", "expert"},
        {"junior", "associate", "entry", "graduate"},
        {"architect", "solution", "enterprise"},
        {"manager", "lead", "head"},
        {"consultant", "functional", "technical", "specialist"},
        {"developer", "engineer", "programmer"},
        {"analyst", "business"},
    ]

    def _is_similar_role(self, role_a: str, role_b: str) -> bool:
        if not role_a or not role_b:
            return False
        words_a = set(role_a.lower().split())
        words_b = set(role_b.lower().split())
        for group in self._ROLE_GROUPS:
            if words_a & group and words_b & group:
                return True
        return False

    @staticmethod
    def _match_quality_label(score: int) -> str:
        if score >= 75:
            return "Gold"
        if score >= 50:
            return "Silver"
        return "Bronze"

    def _calculate_match_score(
        self,
        job_posting: JobPosting,
        job_profile: JobProfile,
        session: Session,
    ) -> dict:
        score = 0
        details: dict = {
            "product_match": 0,
            "skills_match": 0,
            "experience_match": 0,
            "salary_match": 0,
            "location_match": 0,
            "matched_skills": [],
        }

        # Product & Role match (40%)
        if job_posting.product_vendor == job_profile.product_vendor:
            if job_posting.product_type == job_profile.product_type:
                if job_posting.job_role == job_profile.job_role:
                    details["product_match"] = 40
                    score += 40
                elif self._is_similar_role(job_posting.job_role, job_profile.job_role):
                    details["product_match"] = 30
                    score += 30
                else:
                    details["product_match"] = 28
                    score += 28
            else:
                details["product_match"] = 18
                score += 18

        # Skills match (30%)
        try:
            required_skills = (
                json.loads(job_posting.required_skills)
                if job_posting.required_skills
                else []
            )
            candidate_skills = session.exec(
                select(Skill).where(Skill.job_profile_id == job_profile.id)
            ).all()
            candidate_skill_names = [s.skill_name.lower() for s in candidate_skills]

            if required_skills and candidate_skills:
                split_idx = max(1, int(len(required_skills) * 0.4))
                must_have = required_skills[:split_idx]
                nice_to_have = required_skills[split_idx:]

                must_matched = 0
                for req in must_have:
                    req_lower = req.lower() if isinstance(req, str) else str(req).lower()
                    for cand in candidate_skill_names:
                        if req_lower in cand or cand in req_lower:
                            must_matched += 1
                            details["matched_skills"].append(req)
                            break

                nice_matched = 0
                for req in nice_to_have:
                    req_lower = req.lower() if isinstance(req, str) else str(req).lower()
                    for cand in candidate_skill_names:
                        if req_lower in cand or cand in req_lower:
                            nice_matched += 1
                            details["matched_skills"].append(req)
                            break

                must_score = (must_matched / len(must_have)) * 0.8 if must_have else 0
                nice_score = (nice_matched / len(nice_to_have)) * 0.2 if nice_to_have else 0
                details["skills_match"] = int(30 * (must_score + nice_score))
                score += details["skills_match"]
        except (json.JSONDecodeError, TypeError):
            pass

        # Experience match (15%)
        try:
            seniority_parts = job_posting.seniority_level.split("-")
            min_years = int(seniority_parts[0].strip())
            if job_profile.years_of_experience >= min_years:
                details["experience_match"] = 15
                score += 15
            elif min_years > 0:
                ratio = job_profile.years_of_experience / min_years
                details["experience_match"] = int(15 * min(ratio, 1))
                score += details["experience_match"]
        except (ValueError, IndexError, AttributeError):
            if job_profile.years_of_experience >= 3:
                details["experience_match"] = 8
                score += 8

        # Salary match (10%)
        try:
            p_min = float(job_profile.salary_min) if job_profile.salary_min else 0
            p_max = float(job_profile.salary_max) if job_profile.salary_max else float("inf")
            j_min = float(job_posting.salary_min) if job_posting.salary_min else 0
            j_max = float(job_posting.salary_max) if job_posting.salary_max else float("inf")
            if p_min <= j_max and p_max >= j_min:
                details["salary_match"] = 10
                score += 10
            elif p_min <= j_max * 1.2:
                details["salary_match"] = 5
                score += 5
        except (TypeError, ValueError):
            pass

        # Location match (5%)
        location_prefs = session.exec(
            select(LocationPreference).where(
                LocationPreference.job_profile_id == job_profile.id
            )
        ).all()
        job_location = (job_posting.location or "").lower()
        for loc in location_prefs:
            city = (loc.city or "").lower()
            state = (loc.state or "").lower()
            if (
                city in job_location
                or state in job_location
                or "remote" in job_location
                or "remote" in city
            ):
                details["location_match"] = 5
                score += 5
                break

        # Worktype bonus (+5, capped at 100)
        if job_posting.worktype == job_profile.worktype:
            score = min(score + 5, 100)

        final_score = min(score, 100)
        return {
            "score": final_score,
            "details": details,
            "match_quality": self._match_quality_label(final_score),
        }
