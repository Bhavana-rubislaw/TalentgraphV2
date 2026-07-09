"""
Tests for GET /api/admin/analytics

Covers:
- Admin access is accepted
- Non-admin access is rejected (403)
- Invalid range_days returns 422
- Empty-database returns valid zero-state response
- Funnel percentage calculations
- Active/closed job status classification
- Top-company ordering by activity_score
- Average time-to-hire calculation
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from datetime import datetime, timezone, timedelta, date
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from app.main import app
from app.database import get_session
from app.models import (
    User, Company, JobPosting, Application, Candidate,
    AnalyticsEvent, AnalyticsRollupDaily, AnalyticsEventType,
    UserRole, JobPostingStatus, WorkType, EmploymentType, CurrencyType, VisaStatus,
)


# ─── In-memory SQLite test database ─────────────────────────────────────────

TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture(scope="module")
def test_engine():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture()
def db_session(test_engine):
    """Provide a clean session per test, with rollback after each test."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session):
    """Override the get_session dependency so tests use the test DB."""
    def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ─── Token helpers ────────────────────────────────────────────────────────────

def _admin_token(client, db_session) -> str:
    """Create a test admin user and return a valid JWT."""
    from app.security import hash_password, create_access_token

    user = User(
        email="testadmin@example.com",
        full_name="Test Admin",
        password_hash=hash_password("password123"),
        role=UserRole.ADMIN,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    return create_access_token({"sub": str(user.id), "role": "admin", "user_id": user.id})


def _recruiter_token(client, db_session) -> str:
    from app.security import hash_password, create_access_token

    user = User(
        email="recruiter@example.com",
        full_name="Test Recruiter",
        password_hash=hash_password("password123"),
        role=UserRole.RECRUITER,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    return create_access_token({"sub": str(user.id), "role": "recruiter", "user_id": user.id})


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── Tests ────────────────────────────────────────────────────────────────────

class TestAdminAnalyticsAuth:
    def test_admin_can_access_analytics(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.get("/api/admin/analytics", headers=_auth(token))
        assert resp.status_code == 200

    def test_non_admin_is_rejected(self, client, db_session):
        token = _recruiter_token(client, db_session)
        resp = client.get("/api/admin/analytics", headers=_auth(token))
        assert resp.status_code == 403

    def test_unauthenticated_is_rejected(self, client):
        resp = client.get("/api/admin/analytics")
        assert resp.status_code in (401, 403)


class TestAdminAnalyticsRangeValidation:
    def test_valid_range_7(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.get("/api/admin/analytics?range_days=7", headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json()["range_days"] == 7

    def test_valid_range_30(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.get("/api/admin/analytics?range_days=30", headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json()["range_days"] == 30

    def test_valid_range_90(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.get("/api/admin/analytics?range_days=90", headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json()["range_days"] == 90

    def test_invalid_range_14_returns_422(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.get("/api/admin/analytics?range_days=14", headers=_auth(token))
        assert resp.status_code == 422

    def test_invalid_range_0_returns_422(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.get("/api/admin/analytics?range_days=0", headers=_auth(token))
        assert resp.status_code == 422


class TestAdminAnalyticsEmptyDatabase:
    def test_empty_db_returns_valid_structure(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.get("/api/admin/analytics?range_days=30", headers=_auth(token))
        assert resp.status_code == 200
        data = resp.json()

        assert "range_days" in data
        assert "start_date" in data
        assert "end_date" in data
        assert "summary" in data
        assert "user_signups" in data
        assert "application_funnel" in data
        assert "jobs_created" in data
        assert "job_status_breakdown" in data
        assert "top_companies" in data

    def test_empty_db_summary_zeros(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.get("/api/admin/analytics?range_days=30", headers=_auth(token))
        summary = resp.json()["summary"]

        # The admin user itself counts as a signup, so only check non-signup fields
        assert summary["total_views"] == 0
        assert summary["total_applications"] == 0
        assert summary["total_interviews"] == 0
        assert summary["total_hires"] == 0
        assert summary["average_time_to_hire_days"] is None

    def test_empty_db_funnel_has_four_stages(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.get("/api/admin/analytics?range_days=30", headers=_auth(token))
        funnel = resp.json()["application_funnel"]
        assert len(funnel) == 4
        stages = [s["stage"] for s in funnel]
        assert stages == ["Views", "Applied", "Interviewed", "Hired"]

    def test_empty_db_no_top_companies(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.get("/api/admin/analytics?range_days=30", headers=_auth(token))
        assert resp.json()["top_companies"] == []


class TestAdminAnalyticsFunnel:
    def _seed_rollup(self, db_session, days_ago: int, views: int, apps: int, interviews: int, hires: int):
        """Seed a single AnalyticsRollupDaily row."""
        company = Company(
            user_id=999,
            company_name="Funnel Test Co",
            company_email="funnel@test.com",
            employee_type="Recruiter",
        )
        # Reuse if already exists
        from sqlmodel import select as sqlselect
        existing = db_session.exec(
            sqlselect(Company).where(Company.company_name == "Funnel Test Co")
        ).first()
        if existing:
            company = existing
        else:
            db_session.add(company)
            db_session.commit()
            db_session.refresh(company)

        rollup_date = (datetime.now(timezone.utc) - timedelta(days=days_ago)).date()
        row = AnalyticsRollupDaily(
            company_id=company.id,
            rollup_date=rollup_date,
            jobs_viewed=views,
            applications_submitted=apps,
            interviews_scheduled=interviews,
            hires=hires,
        )
        db_session.add(row)
        db_session.commit()

    def test_funnel_conversion_percentages(self, client, db_session):
        from app.security import hash_password, create_access_token

        user = User(
            email="funneltest@example.com",
            full_name="Funnel Admin",
            password_hash=hash_password("TestPass1!"),
            role=UserRole.ADMIN,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        token = create_access_token({"sub": str(user.id), "role": "admin", "user_id": user.id})

        self._seed_rollup(db_session, days_ago=5, views=1000, apps=250, interviews=100, hires=20)

        resp = client.get("/api/admin/analytics?range_days=30", headers=_auth(token))
        assert resp.status_code == 200
        funnel = {s["stage"]: s for s in resp.json()["application_funnel"]}

        assert funnel["Views"]["count"] == 1000
        assert funnel["Applied"]["count"] == 250
        assert funnel["Interviewed"]["count"] == 100
        assert funnel["Hired"]["count"] == 20

        # conversion_from_views
        assert funnel["Applied"]["conversion_from_views"] == pytest.approx(25.0, abs=0.1)
        assert funnel["Interviewed"]["conversion_from_views"] == pytest.approx(10.0, abs=0.1)
        assert funnel["Hired"]["conversion_from_views"] == pytest.approx(2.0, abs=0.1)

        # conversion_from_previous
        assert funnel["Interviewed"]["conversion_from_previous"] == pytest.approx(40.0, abs=0.1)
        assert funnel["Hired"]["conversion_from_previous"] == pytest.approx(20.0, abs=0.1)

    def test_funnel_zero_views_no_division_error(self, client, db_session):
        from app.security import hash_password, create_access_token

        user = User(
            email="zeroadmin@example.com",
            full_name="Zero Admin",
            password_hash=hash_password("TestPass1!"),
            role=UserRole.ADMIN,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        token = create_access_token({"sub": str(user.id), "role": "admin", "user_id": user.id})

        # No rollup data → all zeros, should not raise
        resp = client.get("/api/admin/analytics?range_days=7", headers=_auth(token))
        assert resp.status_code == 200
        funnel = resp.json()["application_funnel"]
        for stage in funnel:
            assert stage["conversion_from_views"] == 0.0 or stage["stage"] == "Views"


class TestAdminAnalyticsJobStatus:
    def _make_job(self, db_session, company_id: int, status: JobPostingStatus) -> JobPosting:
        job = JobPosting(
            company_id=company_id,
            job_title="Test Job",
            product_vendor="Acme",
            product_type="Widget",
            job_role="Engineer",
            seniority_level="Mid",
            worktype=WorkType.REMOTE,
            location="Remote",
            employment_type=EmploymentType.FT,
            start_date="2026-01-01",
            salary_min=80000,
            salary_max=100000,
            salary_currency=CurrencyType.USD,
            job_description="A job",
            status=status,
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)
        return job

    def _seed_company_and_admin(self, db_session, suffix: str):
        from app.security import hash_password, create_access_token

        user = User(
            email=f"statusadmin{suffix}@example.com",
            full_name="Status Admin",
            password_hash=hash_password("TestPass1!"),
            role=UserRole.ADMIN,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        co_user = User(
            email=f"co{suffix}@example.com",
            full_name="Co User",
            password_hash=hash_password("TestPass1!"),
            role=UserRole.RECRUITER,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(co_user)
        db_session.commit()
        db_session.refresh(co_user)

        company = Company(
            user_id=co_user.id,
            company_name=f"Status Co {suffix}",
            company_email=f"co{suffix}@example.com",
            employee_type="Recruiter",
        )
        db_session.add(company)
        db_session.commit()
        db_session.refresh(company)

        token = create_access_token({"sub": str(user.id), "role": "admin", "user_id": user.id})
        return token, company.id

    def test_active_and_reposted_counted_as_active(self, client, db_session):
        token, company_id = self._seed_company_and_admin(db_session, "ar")
        self._make_job(db_session, company_id, JobPostingStatus.ACTIVE)
        self._make_job(db_session, company_id, JobPostingStatus.REPOSTED)
        self._make_job(db_session, company_id, JobPostingStatus.FROZEN)

        resp = client.get("/api/admin/analytics?range_days=30", headers=_auth(token))
        breakdown = {s["status"]: s["count"] for s in resp.json()["job_status_breakdown"]}
        assert breakdown["Active"] >= 2
        assert breakdown["Closed"] >= 1

    def test_frozen_and_cancelled_counted_as_closed(self, client, db_session):
        token, company_id = self._seed_company_and_admin(db_session, "fc")
        self._make_job(db_session, company_id, JobPostingStatus.FROZEN)
        self._make_job(db_session, company_id, JobPostingStatus.CANCELLED)

        resp = client.get("/api/admin/analytics?range_days=30", headers=_auth(token))
        breakdown = {s["status"]: s["count"] for s in resp.json()["job_status_breakdown"]}
        assert breakdown["Closed"] >= 2


class TestAdminAnalyticsTopCompanies:
    def test_top_companies_sorted_by_activity_score(self, client, db_session):
        from app.security import hash_password, create_access_token

        admin_user = User(
            email="topadmin@example.com",
            full_name="Top Admin",
            password_hash=hash_password("TestPass1!"),
            role=UserRole.ADMIN,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(admin_user)
        db_session.commit()
        db_session.refresh(admin_user)
        token = create_access_token({"sub": str(admin_user.id), "role": "admin", "user_id": admin_user.id})

        # Create two companies with different activity levels
        for i, (apps, interviews, hires) in enumerate([(100, 50, 10), (200, 80, 20)]):
            user = User(
                email=f"topco_user{i}@example.com",
                full_name=f"Top Co User {i}",
                password_hash=hash_password("TestPass1!"),
                role=UserRole.RECRUITER,
                is_active=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db_session.add(user)
            db_session.commit()
            db_session.refresh(user)

            company = Company(
                user_id=user.id,
                company_name=f"Top Co {i}",
                company_email=f"topco{i}@example.com",
                employee_type="Recruiter",
            )
            db_session.add(company)
            db_session.commit()
            db_session.refresh(company)

            rollup = AnalyticsRollupDaily(
                company_id=company.id,
                rollup_date=date.today(),
                jobs_viewed=0,
                applications_submitted=apps,
                interviews_scheduled=interviews,
                hires=hires,
            )
            db_session.add(rollup)
            db_session.commit()

        resp = client.get("/api/admin/analytics?range_days=30", headers=_auth(token))
        assert resp.status_code == 200
        top = resp.json()["top_companies"]
        assert len(top) >= 1

        # Verify descending order by activity_score
        scores = [c["activity_score"] for c in top]
        assert scores == sorted(scores, reverse=True)


class TestAdminAnalyticsTimeToHire:
    def test_average_time_to_hire_calculated(self, client, db_session):
        from app.security import hash_password, create_access_token

        admin_user = User(
            email="hireadmin@example.com",
            full_name="Hire Admin",
            password_hash=hash_password("TestPass1!"),
            role=UserRole.ADMIN,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(admin_user)
        db_session.commit()
        db_session.refresh(admin_user)
        token = create_access_token({"sub": str(admin_user.id), "role": "admin", "user_id": admin_user.id})

        # Create recruiter user + company
        rec_user = User(
            email="hirerec@example.com",
            full_name="Hire Rec",
            password_hash=hash_password("TestPass1!"),
            role=UserRole.RECRUITER,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(rec_user)
        db_session.commit()
        db_session.refresh(rec_user)

        company = Company(
            user_id=rec_user.id,
            company_name="Hire Co",
            company_email="hireco@example.com",
            employee_type="Recruiter",
        )
        db_session.add(company)
        db_session.commit()
        db_session.refresh(company)

        # Create candidate user + candidate
        cand_user = User(
            email="hirecandidate@example.com",
            full_name="Hire Candidate",
            password_hash=hash_password("TestPass1!"),
            role=UserRole.CANDIDATE,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(cand_user)
        db_session.commit()
        db_session.refresh(cand_user)

        candidate = Candidate(
            user_id=cand_user.id,
            name="Hire Candidate",
            email="hirecandidate@example.com",
            phone="555-0000",
            residential_address="123 Main St",
            location_state="CA",
            location_county="LA",
            location_zipcode="90001",
        )
        db_session.add(candidate)
        db_session.commit()
        db_session.refresh(candidate)

        # Create a job posting
        job = JobPosting(
            company_id=company.id,
            job_title="Engineer",
            product_vendor="Acme",
            product_type="Widget",
            job_role="Dev",
            seniority_level="Mid",
            worktype=WorkType.REMOTE,
            location="Remote",
            employment_type=EmploymentType.FT,
            start_date="2026-01-01",
            salary_min=80000,
            salary_max=100000,
            salary_currency=CurrencyType.USD,
            job_description="Dev role",
            status=JobPostingStatus.ACTIVE,
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        # Application applied 10 days ago
        applied_at = datetime.now(timezone.utc) - timedelta(days=10)
        from app.models import JobProfile
        jp = JobProfile(
            candidate_id=candidate.id,
            profile_name="Test Profile",
            years_of_experience=5,
            worktype=WorkType.REMOTE,
            employment_type=EmploymentType.FT,
            salary_min=80000,
            salary_max=100000,
            salary_currency=CurrencyType.USD,
            visa_status=VisaStatus.US_CITIZEN,
        )
        db_session.add(jp)
        db_session.commit()
        db_session.refresh(jp)

        application = Application(
            candidate_id=candidate.id,
            job_posting_id=job.id,
            job_profile_id=jp.id,
            status="applied",
            applied_at=applied_at,
        )
        db_session.add(application)
        db_session.commit()
        db_session.refresh(application)

        # Hire event 5 days after application → time-to-hire = 5 days
        hire_event = AnalyticsEvent(
            company_id=company.id,
            event_type=AnalyticsEventType.CANDIDATE_HIRED,
            event_time=applied_at + timedelta(days=5),
            application_id=application.id,
        )
        db_session.add(hire_event)
        db_session.commit()

        resp = client.get("/api/admin/analytics?range_days=30", headers=_auth(token))
        assert resp.status_code == 200
        avg = resp.json()["summary"]["average_time_to_hire_days"]
        assert avg is not None
        assert abs(avg - 5.0) < 0.5  # ~5 days

    def test_no_hire_events_returns_null(self, client, db_session):
        from app.security import hash_password, create_access_token

        user = User(
            email="nullhireadmin@example.com",
            full_name="Null Hire Admin",
            password_hash=hash_password("TestPass1!"),
            role=UserRole.ADMIN,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        token = create_access_token({"sub": str(user.id), "role": "admin", "user_id": user.id})

        resp = client.get("/api/admin/analytics?range_days=7", headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json()["summary"]["average_time_to_hire_days"] is None
