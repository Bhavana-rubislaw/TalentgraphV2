# Test Data & Seed Scripts

This directory contains scripts for seeding test data, adding specific records, and managing database content for development and testing.

**Total Scripts:** 17  
**Purpose:** Populate database with sample/test data  
**Usage:** Run when setting up dev environment or testing

---

## Script Categories

### Seed Scripts (`seed_*.py`) - 4 files
Comprehensive data seeding for different scenarios.

| Script | Purpose | Data Volume | Use Case |
|--------|---------|-------------|----------|
| `seed_data_v2.py` | **Full sample dataset** | ~50-100 records per table | Development, demos |
| `seed_data.py` | Legacy seed (v1) | Medium | Legacy support |
| `seed_custom_users.py` | Specific test users | 2-5 users | Targeted testing |
| `seed_status.py` | Job status values | Status enums | Status workflow testing |

### Quick Seed Scripts - 2 files
Minimal data for rapid testing.

| Script | Purpose | Data Volume |
|--------|---------|-------------|
| `quick_seed.py` | Minimal viable dataset | 10-20 records total |
| `simple_seed.py` | Ultra-minimal seed | 5-10 records total |

### Add Scripts (`add_*.py`) - 5 files
Add specific test records incrementally.

| Script | Purpose | Records Added |
|--------|---------|---------------|
| `add_candidates.py` | Add test candidates | 5-10 candidates |
| `add_bhavana.py` | Add Bhavana test user | 1 user + profile |
| `add_meeting_link.py` | Add Google Meet link | Updates existing meeting |
| `add_notification_read_at.py` | Add read timestamp | Updates notifications |
| `add_notes_timestamp.py` | Add notes timestamp | Updates applications |

### Create Scripts (`create_*.py`) - 2 files
Create specific entities with relationships.

| Script | Purpose | Records Created |
|--------|---------|-----------------|
| `create_matches.py` | Create match records | 10-20 matches |
| `create_bhavana_preferences.py` | Create job preferences | Bhavana's preferences |

### Update Scripts (`update_*.py`) - 3 files
Modify existing records (migration-like operations).

| Script | Purpose | Records Modified |
|--------|---------|------------------|
| `update_existing_notes_timestamps.py` | Backfill note timestamps | All applications |
| `update_bhavana_oracle_profiles.py` | Update Oracle profiles | Bhavana's profiles |
| `update_meeting_time.py` | Update meeting times | Specific meetings |

### Utility Scripts - 1 file
Database management utilities.

| Script | Purpose | Warning |
|--------|---------|---------|
| `complete_missing.py` | Complete incomplete records | ⚠️ Modifies data |

---

## Primary Seed Script: `seed_data_v2.py`

**Recommended for:** New development environments, demos, comprehensive testing

### What It Seeds

| Entity | Count | Details |
|--------|-------|---------|
| **Users** | 15+ | Candidates, recruiters, admins |
| **Candidates** | 10+ | Complete profiles with resumes |
| **Companies** | 5+ | Tech companies (Google, Amazon, etc.) |
| **Job Profiles** | 15+ | Candidate job preferences |
| **Job Postings** | 30+ | Active, expired, cancelled jobs |
| **Skills** | 50+ | Tech skills (React, Python, AWS, etc.) |
| **Certifications** | 10+ | Professional certifications |
| **Swipes** | 50+ | Candidate/recruiter swipes |
| **Matches** | 20+ | Mutual matches |
| **Applications** | 20+ | Applied, scheduled, shortlisted, etc. |
| **Notifications** | 50+ | Various notification types |
| **Messages** | 30+ | Chat messages between users |
| **Meetings** | 10+ | Scheduled interviews |
| **Analytics Events** | 100+ | Tracking events |

### Sample Users Created

| Name | Email | Role | Password |
|------|-------|------|----------|
| Sarah Anderson | sarah.anderson@email.com | Candidate | password123 |
| Jennifer Martinez | jennifer.martinez@techcorp.com | Recruiter | password123 |
| Bhavana Bayya | bhavana@example.com | Candidate | password123 |
| Admin User | admin@talentgraph.com | Admin | admin123 |

### Usage
```bash
# Navigate to backend
cd backend2

# Run seed script
python scripts/test_data/seed_data_v2.py

# Expected output:
# [OK] Created 15 users
# [OK] Created 10 candidates
# [OK] Created 5 companies
# [OK] Created 30 job postings
# ...
# [DONE] Database seeded successfully
```

---

## Quick Setup Workflows

### Fresh Database Setup
```bash
# 1. Reset database (WARNING: Deletes all data)
python reset_db.py

# 2. Seed with full dataset
python scripts/test_data/seed_data_v2.py

# 3. Verify data
python scripts/testing/check_candidate_data.py
python scripts/testing/check_jobs.py
```

### Minimal Testing Setup
```bash
# 1. Reset database
python reset_db.py

# 2. Quick seed (minimal data)
python scripts/test_data/quick_seed.py

# 3. Add specific test user
python scripts/test_data/add_bhavana.py
```

### Add Incremental Data
```bash
# Add more candidates
python scripts/test_data/add_candidates.py

# Create matches
python scripts/test_data/create_matches.py

# Add meeting links
python scripts/test_data/add_meeting_link.py
```

---

## Specific Use Cases

### Testing Candidate Flow
```bash
# Seed full dataset
python scripts/test_data/seed_data_v2.py

# Add specific test candidate
python scripts/test_data/add_bhavana.py

# Create preferences for candidate
python scripts/test_data/create_bhavana_preferences.py

# Verify candidate can see recommendations
curl -X GET "http://localhost:8000/api/v1/dashboard/candidate/recommendations?job_profile_id=1" \
  -H "Authorization: Bearer <token>"
```

### Testing Recruiter Flow
```bash
# Seed full dataset
python scripts/test_data/seed_data_v2.py

# Check recruiter's jobs
python scripts/testing/check_jennifer_jobs.py

# Verify recruiter can see applications
curl -X GET "http://localhost:8000/api/v1/applications/?status=applied" \
  -H "Authorization: Bearer <token>"
```

### Testing Match/Swipe Logic
```bash
# Seed dataset
python scripts/test_data/seed_data_v2.py

# Create additional matches
python scripts/test_data/create_matches.py

# Verify matches
python scripts/testing/check_matches.py
```

### Testing Interview Scheduling
```bash
# Seed dataset
python scripts/test_data/seed_data_v2.py

# Add Google Meet links
python scripts/test_data/add_meeting_link.py

# Check meetings
python scripts/testing/check_meetings.py
```

---

## Script Details

### `seed_data_v2.py` (RECOMMENDED)
**Purpose:** Complete sample dataset for development  
**Data:** 15+ users, 30+ jobs, 50+ swipes, 20+ applications  
**Use When:** Setting up new dev environment, demos, comprehensive testing

**Features:**
- Realistic data (tech jobs, real skills, proper relationships)
- Multiple user roles (candidate, recruiter, admin)
- Complete workflows (swipes → matches → applications → interviews)
- Analytics events for dashboard metrics

### `quick_seed.py`
**Purpose:** Minimal viable dataset  
**Data:** 5-10 users, 10-15 jobs  
**Use When:** Rapid testing, CI/CD pipelines

### `add_bhavana.py`
**Purpose:** Add Bhavana test user + complete profile  
**Creates:**
- User account (bhavana@example.com)
- Candidate profile
- Resume record
- Job preferences
- Skills & certifications

### `create_matches.py`
**Purpose:** Create mutual matches for testing  
**Creates:** 10-20 match records with both sides liked  
**Use When:** Testing match notifications, messaging, interview scheduling

### `update_existing_notes_timestamps.py`
**Purpose:** Backfill timestamps for recruiter notes  
**Modifies:** All application records  
**Use When:** After deploying notes_updated_at field migration

---

## Data Relationships

Understanding the data model helps choose the right seed script:

```
User (auth)
├── Candidate → JobProfile → LocationPreference
│   ├── Resume → Certification, Skill
│   ├── Swipe (candidate side)
│   ├── Application
│   └── Match (candidate side)
│
└── Company (recruiter)
    ├── JobPosting
    │   ├── Swipe (recruiter side)
    │   ├── Application
    │   └── Match (company side)
    └── Meeting

Shared:
├── Notification (user_id)
├── Message (sender/receiver)
├── Conversation (participants)
└── AnalyticsEvent (company/candidate)
```

---

## Seed Script Template

When creating a new seed script:

```python
"""
Seed script: [Brief description]
Creates: [List entities created]
"""
import sys
sys.path.insert(0, '.')

from app.database import Session, engine
from app.models import User, Candidate, Company, JobPosting
from datetime import datetime

print("=" * 70)
print("Seeding: [Description]")
print("=" * 70)

session = Session(engine)

# Create users
print("\nCreating users...")
users = [
    User(email="test@example.com", role="candidate", ...),
    # ... more users
]
for user in users:
    session.add(user)
session.commit()
print(f"  ✓ Created {len(users)} users")

# Create related entities
print("\nCreating candidates...")
candidates = [
    Candidate(user_id=users[0].id, ...),
    # ... more candidates
]
for candidate in candidates:
    session.add(candidate)
session.commit()
print(f"  ✓ Created {len(candidates)} candidates")

session.close()
print("\n[DONE] Seeding complete")
```

---

## Data Cleanup

### Reset Database (DESTRUCTIVE)
```bash
# WARNING: Deletes all data
python reset_db.py

# Then reseed
python scripts/test_data/seed_data_v2.py
```

### Selective Cleanup
```sql
-- Connect to database
psql -d talentgraph_v2

-- Delete test users only
DELETE FROM "user" WHERE email LIKE '%@example.com';

-- Delete old notifications
DELETE FROM notification WHERE created_at < NOW() - INTERVAL '30 days';

-- Truncate analytics events (high volume)
TRUNCATE TABLE analytics_event CASCADE;
```

---

## Best Practices

### When to Seed
- ✅ Initial dev environment setup
- ✅ Before demo/presentation
- ✅ After database reset
- ✅ CI/CD test environments
- ❌ Never in production (use migration scripts instead)

### Choosing the Right Script
- **Full demo/dev:** `seed_data_v2.py` (comprehensive)
- **Quick test:** `quick_seed.py` (minimal)
- **Specific scenario:** `add_*.py` or `create_*.py` (targeted)
- **Post-migration:** `update_*.py` (backfill)

### Data Consistency
- Always seed in correct order (users → profiles → relationships)
- Use realistic data (real job titles, skills, locations)
- Include edge cases (expired jobs, cancelled applications)
- Create relationships bidirectionally (swipes, matches)

---

## Troubleshooting

### Foreign Key Errors
```bash
# Ensure parent records exist first
# Order: Users → Candidates/Companies → JobPostings → Swipes/Applications

# Example fix:
# 1. Seed users first
# 2. Then seed candidates
# 3. Then seed job postings
# 4. Finally seed applications
```

### Duplicate Key Errors
```bash
# Reset database before reseeding
python reset_db.py
python scripts/test_data/seed_data_v2.py

# Or check for existing data
python scripts/testing/check_candidate_data.py
```

### Script Hangs/Crashes
```bash
# Check PostgreSQL connection
psql -d talentgraph_v2

# Verify DATABASE_URL
python -c "from app.database import DATABASE_URL; print(DATABASE_URL)"

# Check available disk space
df -h
```

---

## Related Documentation

- [Backend README](../README.md) - Backend setup
- [Migration Scripts](../scripts/migrations/README.md) - Schema migrations
- [Testing Scripts](../scripts/testing/README.md) - Validation tests
- [POSTGRESQL_SETUP.md](../POSTGRESQL_SETUP.md) - Database setup

---

## Seed Data Inventory

Quick reference of what's available in `seed_data_v2.py`:

### Candidates
- Sarah Anderson (software engineer, 3 years exp)
- Bhavana Bayya (full-stack developer, 5 years exp)
- John Smith (data scientist, 2 years exp)
- ... 7+ more

### Companies
- TechCorp (50+ employees)
- Google (10000+ employees)
- Amazon (10000+ employees)
- Startup Inc (10-50 employees)
- ... more

### Job Postings
- Software Engineer @ Google (active)
- Data Scientist @ Amazon (active)
- Frontend Developer @ Startup Inc (active)
- Full Stack Engineer @ TechCorp (expired)
- ... 26+ more

### Skills
- React, Angular, Vue.js
- Python, Java, JavaScript, TypeScript
- AWS, Azure, GCP
- Docker, Kubernetes
- ... 40+ more

---

## Support

For seeding issues:
1. Check script output for specific errors
2. Verify database connection
3. Ensure foreign key relationships are correct
4. Reset database and try again
5. Check PostgreSQL logs for detailed errors
