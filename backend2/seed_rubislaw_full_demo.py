"""
Full Demo Seed — Rubislaw Invest + bhavanabayya13.com candidates
================================================================
Populates ALL demo data needed to showcase every feature in the UI:

  Candidates (Bayya family):
    bhavanabayya13@gmail.com  (Python/Backend)
    kuttybayya@gmail.com      (React/Frontend)
    bhavsbayya@gmail.com      (AWS/Cloud)
    bayyakutty02@gmail.com    (Full Stack)

  Rubislaw Recruit team:
    bhavana@rubislawinvest.com       RECRUITER (primary / company owner)
    ashokkumarbayya@gmail.com        HR
    siddhartha.kothi@inoapps.com     RECRUITER
    divija.kalluri@inoapps.com       RECRUITER

  Data created per candidate:
    • Multiple applications in different statuses
      (applied, under_review, shortlisted, scheduled, rejected)
    • Swipes from both sides (candidate like + company like)
    • Mutual matches with match_percentage
    • One recruiter "ask_to_apply" invite (bhavanabayya13 only)
    • Notifications for every major event

Run:
    cd backend2
    .\\venv\\Scripts\\Activate.ps1
    python seed_rubislaw_full_demo.py
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlmodel import Session, select
from app.database import engine
from app.models import (
    User, Company, Candidate, JobPosting, JobProfile,
    Application, Match, Swipe, Notification,
)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

def days_ago(n: int) -> datetime:
    return now_utc() - timedelta(days=n)

def hours_ago(n: int) -> datetime:
    return now_utc() - timedelta(hours=n)


def get_user(session: Session, email: str) -> User | None:
    return session.exec(select(User).where(User.email == email)).first()

def get_candidate(session: Session, user_id: int) -> Candidate | None:
    return session.exec(select(Candidate).where(Candidate.user_id == user_id)).first()

def get_company(session: Session, user_id: int) -> Company | None:
    return session.exec(select(Company).where(Company.user_id == user_id)).first()

def get_job_profile(session: Session, candidate_id: int, name_fragment: str) -> JobProfile | None:
    jps = session.exec(select(JobProfile).where(JobProfile.candidate_id == candidate_id)).all()
    for jp in jps:
        if name_fragment.lower() in jp.profile_name.lower():
            return jp
    return jps[0] if jps else None

def get_posting(session: Session, posting_id: int) -> JobPosting | None:
    return session.exec(select(JobPosting).where(JobPosting.id == posting_id)).first()

def app_exists(session: Session, candidate_id: int, posting_id: int) -> bool:
    return session.exec(
        select(Application).where(
            Application.candidate_id == candidate_id,
            Application.job_posting_id == posting_id,
        )
    ).first() is not None

def swipe_exists(session: Session, candidate_id: int, company_id: int,
                 posting_id: int, action_by: str) -> bool:
    return session.exec(
        select(Swipe).where(
            Swipe.candidate_id == candidate_id,
            Swipe.company_id == company_id,
            Swipe.job_posting_id == posting_id,
            Swipe.action_by == action_by,
        )
    ).first() is not None

def match_exists(session: Session, candidate_id: int, company_id: int,
                 posting_id: int) -> bool:
    return session.exec(
        select(Match).where(
            Match.candidate_id == candidate_id,
            Match.company_id == company_id,
            Match.job_posting_id == posting_id,
        )
    ).first() is not None

def notify(session: Session, user_id: int, event_type: str, title: str,
           message: str, payload: str | None = None, created_at: datetime | None = None):
    n = Notification(
        user_id=user_id,
        type="general",
        title=title,
        message=message,
        event_type=event_type,
        is_read=False,
        payload=payload,
        created_at=created_at or now_utc(),
    )
    session.add(n)

def make_application(session: Session, candidate: Candidate, posting: JobPosting,
                     job_profile: JobProfile, status: str, applied_offset_days: int,
                     recruiter_user: User, notes: str | None = None) -> Application | None:
    if app_exists(session, candidate.id, posting.id):
        print(f"    [skip] Application already exists: candidate={candidate.id} → posting={posting.id}")
        return None
    applied_at = days_ago(applied_offset_days)
    app = Application(
        candidate_id=candidate.id,
        job_posting_id=posting.id,
        job_profile_id=job_profile.id,
        status=status,
        applied_at=applied_at,
        recruiter_notes=notes,
        last_status_updated_at=applied_at + timedelta(hours=6) if status != "applied" else None,
        last_status_updated_by_user_id=recruiter_user.id if status != "applied" else None,
    )
    session.add(app)
    session.flush()
    print(f"    [+] Application: candidate={candidate.id} → posting {posting.id} ({posting.job_title[:40]}) | status={status}")
    return app

def make_swipe(session: Session, candidate: Candidate, company: Company,
               posting: JobPosting, job_profile: JobProfile, action: str,
               action_by: str, created_at: datetime) -> Swipe | None:
    if swipe_exists(session, candidate.id, company.id, posting.id, action_by):
        return None
    s = Swipe(
        candidate_id=candidate.id,
        company_id=company.id,
        job_profile_id=job_profile.id,
        job_posting_id=posting.id,
        action=action,
        action_by=action_by,
        created_at=created_at,
    )
    session.add(s)
    session.flush()
    return s

def make_match(session: Session, candidate: Candidate, company: Company,
               posting: JobPosting, job_profile: JobProfile,
               candidate_liked: bool, company_liked: bool,
               company_asked_to_apply: bool = False,
               candidate_asked_to_apply: bool = False,
               match_pct: float = 85.0,
               match_reason: str = "Skills and experience align well",
               created_at: datetime | None = None) -> Match | None:
    if match_exists(session, candidate.id, company.id, posting.id):
        print(f"    [skip] Match already exists: candidate={candidate.id} ↔ posting={posting.id}")
        return None
    m = Match(
        candidate_id=candidate.id,
        company_id=company.id,
        job_profile_id=job_profile.id,
        job_posting_id=posting.id,
        match_percentage=match_pct,
        match_reason=match_reason,
        candidate_liked=candidate_liked,
        company_liked=company_liked,
        candidate_asked_to_apply=candidate_asked_to_apply,
        company_asked_to_apply=company_asked_to_apply,
        created_at=created_at or now_utc(),
        updated_at=created_at or now_utc(),
    )
    session.add(m)
    session.flush()
    print(f"    [+] Match: candidate={candidate.id} ↔ posting {posting.id} ({posting.job_title[:40]}) | pct={match_pct}%")
    return m


# ─── Main seed ────────────────────────────────────────────────────────────────

def run():
    with Session(engine) as session:
        print("=" * 70)
        print("FULL DEMO SEED — Rubislaw Invest")
        print("=" * 70)

        # ── Look up key users/companies ──────────────────────────────────────

        bhavana_user  = get_user(session, "bhavana@rubislawinvest.com")
        ashok_user    = get_user(session, "ashokkumarbayya@gmail.com")
        siddh_user    = get_user(session, "siddhartha.kothi@inoapps.com")
        divija_user   = get_user(session, "divija.kalluri@inoapps.com")

        if not bhavana_user:
            print("[ERROR] bhavana@rubislawinvest.com not found – run setup_rubislaw_users.py first")
            return

        rubislaw_company = get_company(session, bhavana_user.id)  # primary company (ID=19)
        if not rubislaw_company:
            print("[ERROR] Rubislaw Invest company record not found")
            return

        # Bayya candidates
        bhavana13_user  = get_user(session, "bhavanabayya13@gmail.com")
        kutty_user      = get_user(session, "kuttybayya@gmail.com")
        bhavs_user      = get_user(session, "bhavsbayya@gmail.com")
        bayya02_user    = get_user(session, "bayyakutty02@gmail.com")

        for label, u in [
            ("bhavanabayya13", bhavana13_user),
            ("kuttybayya", kutty_user),
            ("bhavsbayya", bhavs_user),
            ("bayyakutty02", bayya02_user),
        ]:
            if not u:
                print(f"[ERROR] {label} not found – run seed_all_candidates.py first")

        bhavana13_cand = get_candidate(session, bhavana13_user.id) if bhavana13_user else None
        kutty_cand     = get_candidate(session, kutty_user.id) if kutty_user else None
        bhavs_cand     = get_candidate(session, bhavs_user.id) if bhavs_user else None
        bayya02_cand   = get_candidate(session, bayya02_user.id) if bayya02_user else None

        # ── Job Profiles ─────────────────────────────────────────────────────

        bhavana13_jp   = get_job_profile(session, bhavana13_cand.id, "Python") if bhavana13_cand else None
        kutty_jp       = get_job_profile(session, kutty_cand.id, "React") if kutty_cand else None
        bhavs_jp       = get_job_profile(session, bhavs_cand.id, "Cloud") if bhavs_cand else None
        bayya02_jp     = get_job_profile(session, bayya02_cand.id, "Full Stack") if bayya02_cand else None

        print()
        print("Candidate job profiles resolved:")
        print(f"  bhavanabayya13 JP: {bhavana13_jp.id if bhavana13_jp else 'NONE'} — {bhavana13_jp.profile_name if bhavana13_jp else 'N/A'}")
        print(f"  kuttybayya     JP: {kutty_jp.id if kutty_jp else 'NONE'} — {kutty_jp.profile_name if kutty_jp else 'N/A'}")
        print(f"  bhavsbayya     JP: {bhavs_jp.id if bhavs_jp else 'NONE'} — {bhavs_jp.profile_name if bhavs_jp else 'N/A'}")
        print(f"  bayyakutty02   JP: {bayya02_jp.id if bayya02_jp else 'NONE'} — {bayya02_jp.profile_name if bayya02_jp else 'N/A'}")

        # ── Postings used ────────────────────────────────────────────────────
        # ACTIVE
        p77 = get_posting(session, 77)   # Python/FastAPI Engineer – Data Platform
        p78 = get_posting(session, 78)   # Backend API Developer (Django REST)
        p79 = get_posting(session, 79)   # Senior Full Stack Engineer (React + Python)
        p80 = get_posting(session, 80)   # Full Stack Developer (Node.js + React)
        p75 = get_posting(session, 75)   # Senior Frontend Developer (React + Next.js)
        p81 = get_posting(session, 81)   # Senior AWS Cloud Solutions Architect
        p82 = get_posting(session, 82)   # Cloud Infrastructure Engineer (AWS/DevOps)
        # FROZEN — can still show in history/rejected
        p76 = get_posting(session, 76)   # Python Backend Developer (FROZEN)
        p73 = get_posting(session, 73)   # Senior React Developer (FROZEN)
        p74 = get_posting(session, 74)   # React/TypeScript Frontend Engineer (FROZEN)

        missing = [label for label, p in [
            ("p73", p73), ("p74", p74), ("p75", p75), ("p76", p76),
            ("p77", p77), ("p78", p78), ("p79", p79), ("p80", p80),
            ("p81", p81), ("p82", p82)
        ] if p is None]
        if missing:
            print(f"[WARN] Missing postings: {missing} — run seed_bhavana_rubislaw_postings.py first")

        session.flush()

        # ═══════════════════════════════════════════════════════════════════
        # 1. bhavanabayya13@gmail.com
        # ═══════════════════════════════════════════════════════════════════
        if bhavana13_cand and bhavana13_jp and bhavana_user:
            print()
            print("── bhavanabayya13@gmail.com ────────────────────────────────────")

            # ── Applications (various statuses) ──────────────────────────────
            print("  Applications:")
            # Already has scheduled for p77 — update to under_review for variety  
            existing_p77_app = session.exec(
                select(Application).where(
                    Application.candidate_id == bhavana13_cand.id,
                    Application.job_posting_id == 77,
                )
            ).first()
            if existing_p77_app and existing_p77_app.status == "scheduled":
                # keep it as-is (scheduled is a good state to show)
                print(f"    [keep] Application p77 already in status='{existing_p77_app.status}'")

            # p78: Backend API Developer → under_review
            app_p78 = make_application(
                session, bhavana13_cand, p78, bhavana13_jp,
                status="under_review",
                applied_offset_days=10,
                recruiter_user=bhavana_user,
                notes="Strong Python and FastAPI experience. Good culture fit.",
            )
            # p76: Python Backend Developer (frozen) → rejected
            if p76:
                make_application(
                    session, bhavana13_cand, p76, bhavana13_jp,
                    status="rejected",
                    applied_offset_days=20,
                    recruiter_user=bhavana_user,
                    notes="Position was frozen before review.",
                )
            # p79: Senior Full Stack Engineer → shortlisted
            if p79 and bayya02_jp:
                make_application(
                    session, bhavana13_cand, p79, bhavana13_jp,
                    status="shortlisted",
                    applied_offset_days=5,
                    recruiter_user=siddh_user or bhavana_user,
                    notes="Excellent Python skills. Fast-tracked to shortlist.",
                )

            # ── Swipes ───────────────────────────────────────────────────────
            print("  Swipes:")
            # Candidate likes 3 postings
            for posting, label in [(p77, "p77"), (p78, "p78"), (p79, "p79")]:
                if posting:
                    make_swipe(session, bhavana13_cand, rubislaw_company,
                               posting, bhavana13_jp,
                               action="like", action_by="candidate",
                               created_at=days_ago(12))
                    print(f"    [+] Candidate liked {label} ({posting.job_title[:35]})")

            # Company (bhavana recruiter) likes candidate for p77 and p79
            for posting, label in [(p77, "p77"), (p79, "p79")]:
                if posting:
                    make_swipe(session, bhavana13_cand, rubislaw_company,
                               posting, bhavana13_jp,
                               action="like", action_by="recruiter",
                               created_at=days_ago(9))
                    print(f"    [+] Recruiter liked candidate for {label}")

            # Recruiter sends "ask_to_apply" invite for p82 (Cloud role — cross-skill invite)
            if p82:
                make_swipe(session, bhavana13_cand, rubislaw_company,
                           p82, bhavana13_jp,
                           action="ask_to_apply", action_by="recruiter",
                           created_at=days_ago(3))
                print("    [+] Recruiter sent ask_to_apply invite for p82 (Cloud Infrastructure Engineer)")

            # ── Matches ──────────────────────────────────────────────────────
            print("  Matches:")
            # Mutual match p77
            if p77:
                make_match(
                    session, bhavana13_cand, rubislaw_company, p77, bhavana13_jp,
                    candidate_liked=True, company_liked=True,
                    match_pct=91.0,
                    match_reason="Python + FastAPI skills are a perfect fit for this data platform role",
                    created_at=days_ago(9),
                )
                # Notify candidate of match
                notify(session, bhavana13_user.id, "match_found",
                       "🎯 Mutual Match — Python/FastAPI Engineer",
                       "You and Rubislaw Invest both liked each other for the Python/FastAPI Engineer – Data Platform role. Start a conversation!",
                       created_at=days_ago(9))
                # Notify recruiter of match
                notify(session, bhavana_user.id, "candidate_match",
                       "New Mutual Match — Bhavana Bayya",
                       "Bhavana Bayya (bhavanabayya13@gmail.com) matched for Python/FastAPI Engineer – Data Platform.",
                       created_at=days_ago(9))

            # Mutual match p79
            if p79:
                make_match(
                    session, bhavana13_cand, rubislaw_company, p79, bhavana13_jp,
                    candidate_liked=True, company_liked=True,
                    match_pct=78.0,
                    match_reason="Python backend expertise aligns with Full Stack role requirements",
                    created_at=days_ago(7),
                )
                notify(session, bhavana13_user.id, "match_found",
                       "🎯 Mutual Match — Senior Full Stack Engineer",
                       "You matched with Rubislaw Invest for the Senior Full Stack Engineer (React + Python) role!",
                       created_at=days_ago(7))

            # Company-only interested (p78) — company liked but candidate hasn't responded yet
            if p78:
                make_match(
                    session, bhavana13_cand, rubislaw_company, p78, bhavana13_jp,
                    candidate_liked=True, company_liked=True,
                    match_pct=82.0,
                    match_reason="Strong REST API and backend skills match Django role perfectly",
                    created_at=days_ago(10),
                )

            # Recruiter invite match (ask_to_apply) for p82
            if p82:
                make_match(
                    session, bhavana13_cand, rubislaw_company, p82, bhavana13_jp,
                    candidate_liked=False, company_liked=True,
                    company_asked_to_apply=True,
                    match_pct=65.0,
                    match_reason="Cloud and DevOps overlap noted — recruiter extended personal invite",
                    created_at=days_ago(3),
                )
                # Invite notification for candidate
                notify(session, bhavana13_user.id, "invitation",
                       "💌 Recruiter Invitation — Cloud Infrastructure Engineer",
                       "Bhavana Rubislaw from Rubislaw Invest has personally invited you to apply for Cloud Infrastructure Engineer (AWS/DevOps). Check it out!",
                       created_at=days_ago(3))
                # Recruiter confirmation
                notify(session, bhavana_user.id, "job_update",
                       "Invite Sent — Bhavana Bayya",
                       "Your invite to Bhavana Bayya for Cloud Infrastructure Engineer (AWS/DevOps) has been sent.",
                       created_at=days_ago(3))

            # Application notifications
            if app_p78:
                notify(session, bhavana13_user.id, "application_submitted",
                       "✅ Application Submitted — Backend API Developer",
                       "Your application for Backend API Developer (Django REST) at Rubislaw Invest has been submitted.",
                       created_at=days_ago(10))
                notify(session, bhavana_user.id, "application_received",
                       "📄 New Application — Backend API Developer",
                       "Bhavana Bayya has applied for Backend API Developer (Django REST).",
                       created_at=days_ago(10))
                # Status update notification
                notify(session, bhavana13_user.id, "status_update",
                       "Application Update — Backend API Developer",
                       "Your application for Backend API Developer (Django REST) is now under review.",
                       created_at=days_ago(8))

            # Shortlist notification
            notify(session, bhavana13_user.id, "shortlisted",
                   "⭐ You've Been Shortlisted!",
                   "Great news! You have been shortlisted for Senior Full Stack Engineer (React + Python) at Rubislaw Invest.",
                   created_at=days_ago(5))

            session.commit()
            print("  ✅ bhavanabayya13 data committed")

        # ═══════════════════════════════════════════════════════════════════
        # 2. kuttybayya@gmail.com  (React/Frontend)
        # ═══════════════════════════════════════════════════════════════════
        if kutty_cand and kutty_jp and bhavana_user:
            print()
            print("── kuttybayya@gmail.com ────────────────────────────────────────")

            print("  Applications:")
            # p75: Senior Frontend Developer (React + Next.js) → applied
            make_application(
                session, kutty_cand, p75, kutty_jp,
                status="applied",
                applied_offset_days=4,
                recruiter_user=bhavana_user,
            )
            # p73: Senior React Developer (frozen) → rejected
            if p73:
                make_application(
                    session, kutty_cand, p73, kutty_jp,
                    status="rejected",
                    applied_offset_days=25,
                    recruiter_user=bhavana_user,
                    notes="Position was frozen. Promising candidate.",
                )
            # p74: React/TypeScript → shortlisted
            if p74:
                make_application(
                    session, kutty_cand, p74, kutty_jp,
                    status="shortlisted",
                    applied_offset_days=15,
                    recruiter_user=siddh_user or bhavana_user,
                    notes="Excellent TypeScript and React skills. Shortlisted.",
                )

            print("  Swipes:")
            for posting, label in [(p75, "p75"), (p73, "p73")]:
                if posting:
                    make_swipe(session, kutty_cand, rubislaw_company, posting, kutty_jp,
                               action="like", action_by="candidate", created_at=days_ago(5))
                    print(f"    [+] Candidate liked {label}")
            if p75:
                make_swipe(session, kutty_cand, rubislaw_company, p75, kutty_jp,
                           action="like", action_by="recruiter", created_at=days_ago(4))
                print("    [+] Recruiter liked candidate for p75")

            print("  Matches:")
            if p75:
                make_match(
                    session, kutty_cand, rubislaw_company, p75, kutty_jp,
                    candidate_liked=True, company_liked=True,
                    match_pct=88.0,
                    match_reason="React 18, TypeScript and Next.js skills perfectly match this role",
                    created_at=days_ago(4),
                )
                notify(session, kutty_user.id, "match_found",
                       "🎯 Mutual Match — Senior Frontend Developer",
                       "You matched with Rubislaw Invest for Senior Frontend Developer (React + Next.js)!",
                       created_at=days_ago(4))
                notify(session, bhavana_user.id, "candidate_match",
                       "New Mutual Match — Kutty Bayya",
                       "Kutty Bayya (kuttybayya@gmail.com) matched for Senior Frontend Developer (React + Next.js).",
                       created_at=days_ago(4))
                notify(session, kutty_user.id, "application_submitted",
                       "✅ Application Submitted — Senior Frontend Developer",
                       "Your application for Senior Frontend Developer (React + Next.js) at Rubislaw Invest is being reviewed.",
                       created_at=days_ago(4))
                notify(session, bhavana_user.id, "application_received",
                       "📄 New Application — Senior Frontend Developer",
                       "Kutty Bayya has applied for Senior Frontend Developer (React + Next.js).",
                       created_at=days_ago(4))

            session.commit()
            print("  ✅ kuttybayya data committed")

        # ═══════════════════════════════════════════════════════════════════
        # 3. bhavsbayya@gmail.com  (AWS/Cloud)
        # ═══════════════════════════════════════════════════════════════════
        if bhavs_cand and bhavs_jp and bhavana_user:
            print()
            print("── bhavsbayya@gmail.com ────────────────────────────────────────")

            print("  Applications:")
            # p81: Senior AWS Cloud Solutions Architect → under_review
            if p81:
                make_application(
                    session, bhavs_cand, p81, bhavs_jp,
                    status="under_review",
                    applied_offset_days=8,
                    recruiter_user=divija_user or bhavana_user,
                    notes="10 years AWS experience. Solutions Architect Professional cert.",
                )
            # p82: Cloud Infrastructure Engineer → shortlisted
            if p82:
                make_application(
                    session, bhavs_cand, p82, bhavs_jp,
                    status="shortlisted",
                    applied_offset_days=6,
                    recruiter_user=bhavana_user,
                    notes="Kubernetes + Terraform + AWS. Strong match.",
                )
            # p79: Full Stack (Python) → applied (stretch role)
            if p79:
                make_application(
                    session, bhavs_cand, p79, bhavs_jp,
                    status="applied",
                    applied_offset_days=2,
                    recruiter_user=bhavana_user,
                )

            print("  Swipes:")
            for posting in [p81, p82]:
                if posting:
                    make_swipe(session, bhavs_cand, rubislaw_company, posting, bhavs_jp,
                               action="like", action_by="candidate", created_at=days_ago(9))
                    make_swipe(session, bhavs_cand, rubislaw_company, posting, bhavs_jp,
                               action="like", action_by="recruiter", created_at=days_ago(7))
                    print(f"    [+] Mutual swipes for {posting.id}")

            print("  Matches:")
            if p81:
                make_match(
                    session, bhavs_cand, rubislaw_company, p81, bhavs_jp,
                    candidate_liked=True, company_liked=True,
                    match_pct=94.0,
                    match_reason="AWS Architect Professional cert + 8 years cloud experience = exceptional fit",
                    created_at=days_ago(7),
                )
                notify(session, bhavs_user.id, "match_found",
                       "🎯 Mutual Match — Senior AWS Cloud Solutions Architect",
                       "You matched with Rubislaw Invest for Senior AWS Cloud Solutions Architect!",
                       created_at=days_ago(7))
                notify(session, bhavana_user.id, "candidate_match",
                       "New Mutual Match — Bhavs Bayya",
                       "Bhavs Bayya matched for Senior AWS Cloud Solutions Architect.",
                       created_at=days_ago(7))
            if p82:
                make_match(
                    session, bhavs_cand, rubislaw_company, p82, bhavs_jp,
                    candidate_liked=True, company_liked=True,
                    match_pct=89.0,
                    match_reason="Terraform, Kubernetes, AWS ECS experience aligns with infrastructure role",
                    created_at=days_ago(7),
                )
                notify(session, bhavs_user.id, "match_found",
                       "🎯 Mutual Match — Cloud Infrastructure Engineer",
                       "You matched with Rubislaw Invest for Cloud Infrastructure Engineer (AWS/DevOps)!",
                       created_at=days_ago(7))
                notify(session, bhavs_user.id, "shortlisted",
                       "⭐ Shortlisted — Cloud Infrastructure Engineer",
                       "You have been shortlisted for Cloud Infrastructure Engineer at Rubislaw Invest.",
                       created_at=days_ago(6))

            session.commit()
            print("  ✅ bhavsbayya data committed")

        # ═══════════════════════════════════════════════════════════════════
        # 4. bayyakutty02@gmail.com  (Full Stack)
        # ═══════════════════════════════════════════════════════════════════
        if bayya02_cand and bayya02_jp and bhavana_user:
            print()
            print("── bayyakutty02@gmail.com ──────────────────────────────────────")

            print("  Applications:")
            # p79: Senior Full Stack Engineer → scheduled (interview)
            if p79:
                make_application(
                    session, bayya02_cand, p79, bayya02_jp,
                    status="scheduled",
                    applied_offset_days=12,
                    recruiter_user=bhavana_user,
                    notes="Senior full stack. React + Python API experience confirmed. Interview scheduled.",
                )
            # p80: Full Stack Developer (Node.js) → applied
            if p80:
                make_application(
                    session, bayya02_cand, p80, bayya02_jp,
                    status="applied",
                    applied_offset_days=3,
                    recruiter_user=bhavana_user,
                )
            # p78: Backend API Developer → under_review
            if p78:
                make_application(
                    session, bayya02_cand, p78, bayya02_jp,
                    status="under_review",
                    applied_offset_days=7,
                    recruiter_user=siddh_user or bhavana_user,
                    notes="Backend API skills solid. Reviewing alongside bhavanabayya13.",
                )

            print("  Swipes:")
            for posting in [p79, p80]:
                if posting:
                    make_swipe(session, bayya02_cand, rubislaw_company, posting, bayya02_jp,
                               action="like", action_by="candidate", created_at=days_ago(13))
                    make_swipe(session, bayya02_cand, rubislaw_company, posting, bayya02_jp,
                               action="like", action_by="recruiter", created_at=days_ago(11))
                    print(f"    [+] Mutual swipes for {posting.id}")

            print("  Matches:")
            if p79:
                make_match(
                    session, bayya02_cand, rubislaw_company, p79, bayya02_jp,
                    candidate_liked=True, company_liked=True,
                    match_pct=86.0,
                    match_reason="React + Python full stack skills match perfectly; 5+ years experience",
                    created_at=days_ago(11),
                )
                notify(session, bayya02_user.id, "match_found",
                       "🎯 Mutual Match — Senior Full Stack Engineer",
                       "You matched with Rubislaw Invest for Senior Full Stack Engineer (React + Python)!",
                       created_at=days_ago(11))
                notify(session, bhavana_user.id, "candidate_match",
                       "New Mutual Match — Bayya Kutty",
                       "Bayya Kutty matched for Senior Full Stack Engineer (React + Python).",
                       created_at=days_ago(11))
                notify(session, bayya02_user.id, "application_submitted",
                       "✅ Application Submitted — Senior Full Stack Engineer",
                       "Your application is active. An interview has been scheduled.",
                       created_at=days_ago(12))
            if p80:
                make_match(
                    session, bayya02_cand, rubislaw_company, p80, bayya02_jp,
                    candidate_liked=True, company_liked=True,
                    match_pct=80.0,
                    match_reason="Node.js + React + AWS skills align with dashboard development role",
                    created_at=days_ago(11),
                )
                notify(session, bayya02_user.id, "match_found",
                       "🎯 Mutual Match — Full Stack Developer (Node.js + React)",
                       "You matched with Rubislaw Invest for Full Stack Developer (Node.js + React)!",
                       created_at=days_ago(11))

            session.commit()
            print("  ✅ bayyakutty02 data committed")

        # ═══════════════════════════════════════════════════════════════════
        # Summary
        # ═══════════════════════════════════════════════════════════════════
        print()
        print("=" * 70)
        print("SUMMARY")
        print("=" * 70)

        for email, cand in [
            ("bhavanabayya13@gmail.com", bhavana13_cand),
            ("kuttybayya@gmail.com",     kutty_cand),
            ("bhavsbayya@gmail.com",     bhavs_cand),
            ("bayyakutty02@gmail.com",   bayya02_cand),
        ]:
            if cand:
                apps    = session.exec(select(Application).where(Application.candidate_id == cand.id)).all()
                matches = session.exec(select(Match).where(Match.candidate_id == cand.id)).all()
                swipes  = session.exec(select(Swipe).where(Swipe.candidate_id == cand.id)).all()
                print(f"  {email}")
                print(f"    Applications : {len(apps)}  {[a.status for a in apps]}")
                print(f"    Matches      : {len(matches)}  (pcts: {[m.match_percentage for m in matches]})")
                print(f"    Swipes       : {len(swipes)}")

        print()
        print("Login credentials (all accounts):")
        print("  Password: shared seed password (see app/core/seed_credentials.py)")
        print()
        print("  Recruiters / HR:")
        print("    bhavana@rubislawinvest.com   → http://localhost:3003 (company login)")
        print("    ashokkumarbayya@gmail.com    → http://localhost:3003 (HR login)")
        print("    siddhartha.kothi@inoapps.com → http://localhost:3003 (company login)")
        print("    divija.kalluri@inoapps.com   → http://localhost:3003 (company login)")
        print()
        print("  Candidates (candidate login):")
        print("    bhavanabayya13@gmail.com     → http://localhost:3003")
        print("    kuttybayya@gmail.com         → http://localhost:3003")
        print("    bhavsbayya@gmail.com         → http://localhost:3003")
        print("    bayyakutty02@gmail.com       → http://localhost:3003")
        print()
        print("Admin:")
        print("    talentgraph.interviews@gmail.com → http://localhost:3004 (admin UI)")
        print("=" * 70)


if __name__ == "__main__":
    run()
