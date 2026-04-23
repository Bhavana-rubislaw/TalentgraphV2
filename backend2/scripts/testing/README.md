# Testing & Verification Scripts

This directory contains all testing, verification, and data integrity check scripts for TalentGraph V2.

**Total Scripts:** 45+  
**Purpose:** Validate features, check data integrity, verify deployments  
**Usage:** Run on-demand for debugging and QA

---

## Script Categories

### Test Scripts (`test_*.py`) - 24 files
Feature-specific tests that validate API endpoints, business logic, and integrations.

| Script | Purpose | Status |
|--------|---------|--------|
| `test_api.py` | Basic API connectivity | ✅ Passing |
| `test_api_response.py` | API response validation | ✅ Passing |
| `test_api_job_response.py` | Job API response structure | ✅ Passing |
| `test_after_migration.py` | Post-migration validation | ✅ Passing |
| `test_all_metrics.py` | Analytics metrics calculation | ✅ Passing |
| `test_analytics_job_title.py` | Job title analytics | ✅ Passing |
| `test_applied_state.py` | Application state transitions | ✅ Passing |
| `test_cancelled_status.py` | Cancelled job status | ✅ Passing |
| `test_create_meeting.py` | Meeting creation flow | ✅ Passing |
| `test_enum.py` | Enum type validation | ✅ Passing |
| `test_expiration_warnings.py` | Job expiration logic | ✅ Passing |
| `test_fixed_analytics.py` | Analytics bug fixes | ✅ Passing |
| `test_jennifer_api.py` | Jennifer user API tests | ✅ Passing |
| `test_jennifer_query.py` | Jennifer user query tests | ✅ Passing |
| `test_logging_system.py` | Logging system v1 | ✅ Passing |
| `test_logging_system_fixed.py` | Logging system v2 (fixed) | ✅ Passing |
| `test_meetings_api.py` | Meetings API endpoints | ✅ Passing |
| `test_meetings_query.py` | Meeting queries | ✅ Passing |
| `test_meeting_endpoint.py` | Meeting endpoint integration | ✅ Passing |
| `test_n1_optimization.py` | **N+1 query elimination** | ✅ Passing |
| `test_realtime_metrics.py` | Real-time analytics | ✅ Passing |
| `test_schedule_endpoint.py` | Schedule interview endpoint | ✅ Passing |
| `test_schedule_interview.py` | Interview scheduling flow | ✅ Passing |
| `test_smtp_email.py` | Email delivery (SMTP) | ✅ Passing |

### Check Scripts (`check_*.py`) - 21 files
Data integrity checks and validation queries for specific entities.

| Script | Purpose | Use Case |
|--------|---------|----------|
| `check_bhavana.py` | Bhavana user data | Verify test user exists |
| `check_bhavana_email.py` | Bhavana email records | Email integration check |
| `check_candidate_data.py` | Candidate profile data | Data integrity |
| `check_column_type.py` | Database column types | Schema validation |
| `check_enum.py` | Enum values in DB | Type consistency |
| `check_enum_type.py` | Enum type definitions | Schema check |
| `check_enum_values.py` | Enum value validation | Data quality |
| `check_frozen_jobs.py` | Frozen job status | Job lifecycle |
| `check_jennifer_email.py` | Jennifer user email | Test user validation |
| `check_jennifer_jobs.py` | Jennifer's job postings | Recruiter data check |
| `check_jobs.py` | All job postings | Job data integrity |
| `check_matches.py` | Match records | Swipe/match logic |
| `check_meetings.py` | Meeting records | Interview data |
| `check_meeting_link.py` | Meeting link generation | Google Meet integration |
| `check_migration.py` | Migration status | Post-migration validation |
| `check_notifications.py` | Notification delivery | Notification system |
| `check_phase3_4_tables.py` | Phase 3/4 tables | Feature rollout |
| `check_raw_status.py` | Raw status values | Data cleanup |
| `check_routers.py` | Router registration | API endpoints |
| `check_users.py` | User accounts | User data |
| `check_user_data.py` | User profile data | Data integrity |

### Verify Scripts (`verify_*.py`) - 3 files
Post-deployment verification and regression checks.

| Script | Purpose | Use Case |
|--------|---------|----------|
| `verify_all.py` | Comprehensive system check | Full deployment validation |
| `verify_analytics_fix.py` | Analytics bug fix validation | Regression check |
| `verify_query_works.py` | Query execution check | Database connectivity |

---

## Usage Examples

### Running Test Scripts

#### Single Test
```bash
# Navigate to backend directory
cd backend2

# Run specific test
python scripts/testing/test_n1_optimization.py

# Expected output:
# ======================================================================
# Dashboard N+1 Query Optimization - Verification
# ======================================================================
# Query Reduction: 96%
# Time Improvement: 94%
# [OK] N+1 elimination verified
```

#### Multiple Tests
```bash
# Run all API tests
python scripts/testing/test_api.py
python scripts/testing/test_api_response.py
python scripts/testing/test_api_job_response.py

# Run all meeting tests
python scripts/testing/test_meetings_api.py
python scripts/testing/test_meetings_query.py
python scripts/testing/test_meeting_endpoint.py
```

### Running Check Scripts

#### Data Integrity Checks
```bash
# Check candidate data
python scripts/testing/check_candidate_data.py

# Check job postings
python scripts/testing/check_jobs.py

# Check notifications
python scripts/testing/check_notifications.py
```

#### Post-Migration Checks
```bash
# Verify migration completed
python scripts/testing/check_migration.py

# Check Phase 3/4 tables
python scripts/testing/check_phase3_4_tables.py
```

### Running Verify Scripts

#### Full System Verification
```bash
# Run comprehensive checks
python scripts/testing/verify_all.py

# Verify specific fix
python scripts/testing/verify_analytics_fix.py
```

---

## Common Testing Patterns

### API Endpoint Testing
```python
import requests

BASE_URL = "http://localhost:8000/api/v1"

# Test GET endpoint
response = requests.get(f"{BASE_URL}/jobs/active")
assert response.status_code == 200
assert len(response.json()) > 0

# Test POST endpoint
data = {"job_title": "Software Engineer", ...}
response = requests.post(f"{BASE_URL}/jobs", json=data)
assert response.status_code == 201
```

### Database Query Testing
```python
from app.database import Session, engine
from app.models import Candidate
from sqlmodel import select

session = Session(engine)

# Check data exists
candidates = session.exec(select(Candidate)).all()
assert len(candidates) > 0

# Check specific record
candidate = session.exec(
    select(Candidate).where(Candidate.email == "test@example.com")
).first()
assert candidate is not None
```

### Performance Testing
```python
import time

start = time.time()
# ... run query or API call ...
elapsed = time.time() - start

print(f"Execution time: {elapsed*1000:.2f}ms")
assert elapsed < 1.0  # Should complete in < 1 second
```

---

## Test Data Requirements

Most test scripts require:
- ✅ Database initialized (`init_db()`)
- ✅ Sample data seeded (`seed_data_v2.py`)
- ✅ Backend server running (for API tests)

### Seeding Test Data
```bash
# Seed full dataset (recommended)
python scripts/test_data/seed_data_v2.py

# Or quick seed (minimal)
python scripts/test_data/quick_seed.py
```

---

## Continuous Integration

### Pre-Deployment Checklist
```bash
# 1. Run all API tests
python scripts/testing/test_api.py
python scripts/testing/test_api_response.py

# 2. Run feature-specific tests
python scripts/testing/test_meetings_api.py
python scripts/testing/test_logging_system_fixed.py

# 3. Run data integrity checks
python scripts/testing/check_candidate_data.py
python scripts/testing/check_jobs.py
python scripts/testing/check_notifications.py

# 4. Run verification suite
python scripts/testing/verify_all.py

# All should pass before deploying
```

### Post-Deployment Validation
```bash
# 1. Verify migration
python scripts/testing/check_migration.py

# 2. Check Phase 3/4 features
python scripts/testing/check_phase3_4_tables.py

# 3. Verify analytics fix
python scripts/testing/verify_analytics_fix.py

# 4. Full system check
python scripts/testing/verify_all.py
```

---

## Performance Test Results

### N+1 Query Optimization (Day 1)
**Script:** `test_n1_optimization.py`

**Results:**
- Query Reduction: **96%** (90 queries → 4 queries)
- Time Improvement: **94%** (105ms → 6.5ms)
- At scale (1000 jobs): 4000 queries → 4 queries

**Status:** ✅ Applied in production

**Details:** See [DB_OPTIMIZATION_DAY1_COMPLETE.md](../DB_OPTIMIZATION_DAY1_COMPLETE.md)

---

## Troubleshooting

### Test Failures

**Database Connection Error**
```bash
# Check PostgreSQL is running
pg_ctl status

# Verify DATABASE_URL in .env
python -c "from app.database import DATABASE_URL; print(DATABASE_URL)"
```

**Missing Test Data**
```bash
# Seed database
python scripts/test_data/seed_data_v2.py

# Or reset and reseed
python reset_db.py
python scripts/test_data/seed_data_v2.py
```

**API Test Failures**
```bash
# Ensure backend is running
curl http://localhost:8000/health

# Check port
uvicorn app.main:app --reload --port 8000
```

**Import Errors**
```bash
# Ensure you're in backend2 directory
cd backend2

# Check Python path
python -c "import sys; print(sys.path)"
```

---

## Adding New Tests

### Test Script Template
```python
"""
Test script: [Brief description]
Tests: [List what this script tests]
"""
import sys
sys.path.insert(0, '.')

from app.database import Session, engine
from app.models import YourModel
from sqlmodel import select

print("=" * 70)
print("Testing: [Feature Name]")
print("=" * 70)

session = Session(engine)

# Test 1: Check data exists
print("\nTest 1: Check data exists...")
records = session.exec(select(YourModel)).all()
assert len(records) > 0, "No records found"
print(f"  ✓ Found {len(records)} records")

# Test 2: Validate data integrity
print("\nTest 2: Validate data integrity...")
for record in records:
    assert record.required_field is not None, f"Record {record.id} missing field"
print(f"  ✓ All records valid")

session.close()

print("\n[OK] All tests passed")
```

### Check Script Template
```python
"""
Check script: [Brief description]
Checks: [List what this script checks]
"""
import sys
sys.path.insert(0, '.')

from app.database import Session, engine
from sqlmodel import select, text

print("=" * 70)
print("Data Check: [Entity Name]")
print("=" * 70)

session = Session(engine)

# Check 1: Count records
count = session.exec(text("SELECT COUNT(*) FROM tablename")).scalar()
print(f"Total records: {count}")

# Check 2: Sample data
print("\nSample records:")
records = session.exec(text("SELECT * FROM tablename LIMIT 5"))
for row in records:
    print(f"  ID: {row.id}, Name: {row.name}")

session.close()
```

---

## Related Documentation

- [Backend README](../README.md) - Backend setup
- [Migration Scripts](../scripts/migrations/README.md) - Database migrations
- [Test Data Scripts](../scripts/test_data/README.md) - Data seeding
- [DB_OPTIMIZATION_DAY1_COMPLETE.md](../DB_OPTIMIZATION_DAY1_COMPLETE.md) - Performance optimization

---

## Test Coverage

Current coverage (approximate):
- **API Endpoints:** 80%+ covered
- **Data Integrity:** Core tables checked
- **Business Logic:** Key workflows tested
- **Performance:** Dashboard optimized (N+1 eliminated)

### Areas for Improvement
- [ ] WebSocket/real-time features
- [ ] Email delivery (more scenarios)
- [ ] Advanced search queries
- [ ] Load testing (concurrent users)
- [ ] Edge cases (error handling)

---

## Support

For test failures or issues:
1. Check test script comments for requirements
2. Verify database is seeded with test data
3. Ensure backend server is running (for API tests)
4. Check PostgreSQL logs for database errors
5. Review related feature documentation
