# Utility Scripts

This directory contains utility, debugging, and one-off operational scripts for TalentGraph V2.

**Total Scripts:** 20+  
**Purpose:** Debugging, fixing data issues, auditing, and administrative tasks  
**Usage:** Run on-demand for troubleshooting or maintenance

---

## Script Categories

### Debug Scripts (`debug_*.py`) - 7 files
Scripts for debugging specific issues or testing functionality.

| Script | Purpose | Use Case |
|--------|---------|----------|
| `debug_apply_button.py` | Debug job application flow | Application submission issues |
| `debug_auth_check.py` | Debug authentication | Login/token issues |
| `debug_company.py` | Debug company data | Company profile issues |
| `debug_conversation.py` | Debug messaging system | Chat/message issues |
| `debug_expiry_warnings.py` | Debug job expiration logic | Job lifecycle issues |
| `debug_jobs.py` | Debug job posting data | Job posting issues |
| `debug_status_query.py` | Debug status queries | Application status issues |

### Fix Scripts (`fix_*.py`) - 3 files
Scripts that fix data integrity issues or apply one-time corrections.

| Script | Purpose | Impact | ⚠️ Warning |
|--------|---------|--------|-----------|
| `fix_analytics_columns.py` | Fix analytics column types | Modifies analytics_event table | Backup first |
| `fix_frozen_jobs.py` | Fix frozen job status | Updates job_posting records | Safe to rerun |
| `fix_status_values.py` | Fix application status values | Updates application records | Backup first |

### Cleanup Scripts (`cleanup_*.py`) - 2 files
Scripts that remove duplicate or invalid data.

| Script | Purpose | Impact | ⚠️ Warning |
|--------|---------|--------|-----------|
| `cleanup_duplicate_invites.py` | Remove duplicate swipe invites | Deletes duplicate swipe records | Irreversible |
| `cleanup_kutty.py` | Remove kutty test user data | Deletes specific test user | Irreversible |

### Audit Scripts (`audit_*.py`) - 1 file
Scripts that generate reports or verify data integrity.

| Script | Purpose | Output |
|--------|---------|--------|
| `audit_dashboard_metrics.py` | Audit analytics dashboard metrics | Metrics validation report |

### List Scripts (`list_*.py`) - 3 files
Scripts that list or display specific data records.

| Script | Purpose | Output |
|--------|---------|--------|
| `list_conversations.py` | List all conversations | Conversation summary |
| `list_direct_conversations.py` | List direct messages only | Direct message summary |
| `list_job_columns.py` | List job posting columns | Schema information |

### Show Scripts (`show_*.py`) - 2 files
Scripts that display specific entity details.

| Script | Purpose | Output |
|--------|---------|--------|
| `show_bhavana_preferences.py` | Show Bhavana's job preferences | Preference details |
| `show_status.py` | Show application status values | Status enum values |

### Other Utilities - 2 files
Miscellaneous utility scripts.

| Script | Purpose | Use Case |
|--------|---------|----------|
| `get_google_token.py` | Obtain Google OAuth token | Google Meet integration setup |
| `reconcile_audit.py` | Reconcile audit trail records | Data integrity validation |

---

## Usage Guidelines

### Debug Scripts
Use when troubleshooting specific features:

```bash
# Example: Debug authentication
cd backend2
python scripts/utilities/debug_auth_check.py

# Example: Debug job application flow
python scripts/utilities/debug_apply_button.py
```

### Fix Scripts
**⚠️ ALWAYS backup database before running fix scripts:**

```bash
# Backup first
pg_dump -d talentgraph_v2 > backup_$(date +%Y%m%d_%H%M%S).sql

# Then run fix script
python scripts/utilities/fix_analytics_columns.py

# Verify fix
python scripts/testing/verify_analytics_fix.py
```

### Cleanup Scripts
**⚠️ These scripts DELETE data - cannot be undone:**

```bash
# Dry run first (if supported by script)
python scripts/utilities/cleanup_duplicate_invites.py --dry-run

# Then execute
python scripts/utilities/cleanup_duplicate_invites.py
```

### Audit Scripts
Safe to run anytime:

```bash
# Generate audit report
python scripts/utilities/audit_dashboard_metrics.py

# Review output
less audit_report.txt
```

---

## Common Scenarios

### Scenario 1: Application Not Submitting
```bash
# Debug application flow
python scripts/utilities/debug_apply_button.py

# Check application data
python scripts/testing/check_candidate_data.py

# If status values are wrong
python scripts/utilities/fix_status_values.py
```

### Scenario 2: Analytics Dashboard Empty
```bash
# Audit metrics
python scripts/utilities/audit_dashboard_metrics.py

# Fix analytics columns (if needed)
python scripts/utilities/fix_analytics_columns.py

# Verify fix
python scripts/testing/verify_analytics_fix.py
```

### Scenario 3: Duplicate Swipe Invites
```bash
# Check for duplicates
python scripts/testing/check_matches.py

# Cleanup duplicates
python scripts/utilities/cleanup_duplicate_invites.py

# Verify cleanup
python scripts/testing/check_matches.py
```

### Scenario 4: Job Expiration Not Working
```bash
# Debug expiry logic
python scripts/utilities/debug_expiry_warnings.py

# Check job data
python scripts/testing/check_jobs.py

# Fix frozen jobs (if needed)
python scripts/utilities/fix_frozen_jobs.py
```

### Scenario 5: Messaging Issues
```bash
# Debug conversations
python scripts/utilities/debug_conversation.py

# List conversations
python scripts/utilities/list_conversations.py

# Check message data
python scripts/testing/check_meetings.py
```

---

## Safety Checklist

### Before Running Fix/Cleanup Scripts

- [ ] Backup database: `pg_dump -d talentgraph_v2 > backup.sql`
- [ ] Read script comments to understand what it does
- [ ] Check if script supports `--dry-run` mode
- [ ] Test on development environment first
- [ ] Have rollback plan ready

### After Running Fix/Cleanup Scripts

- [ ] Run corresponding verification script
- [ ] Check application logs for errors
- [ ] Verify related features still work
- [ ] Document what was fixed/cleaned

---

## Script Template

### Debug Script Template
```python
"""
Debug script: [Brief description]
Purpose: [What this script debugs]
"""
import sys
sys.path.insert(0, '.')

from app.database import Session, engine
from app.models import YourModel
from sqlmodel import select

print("=" * 70)
print("Debugging: [Feature Name]")
print("=" * 70)

session = Session(engine)

# Debug check 1
print("\n[CHECK 1] Checking [something]...")
records = session.exec(select(YourModel)).all()
print(f"  Found {len(records)} records")

# Debug check 2
print("\n[CHECK 2] Validating [something]...")
for record in records:
    if record.some_field is None:
        print(f"  [ISSUE] Record {record.id} has null field")
    else:
        print(f"  [OK] Record {record.id} is valid")

session.close()
print("\n[DONE] Debug complete")
```

### Fix Script Template
```python
"""
Fix script: [Brief description]
Purpose: [What this script fixes]
WARNING: This script modifies data - backup first!
"""
import sys
sys.path.insert(0, '.')

from app.database import Session, engine
from app.models import YourModel
from sqlmodel import select

print("=" * 70)
print("Fix Script: [Description]")
print("WARNING: This will modify data!")
print("=" * 70)

# Confirm before proceeding
response = input("\nContinue? (yes/no): ")
if response.lower() != 'yes':
    print("Aborted")
    sys.exit(0)

session = Session(engine)

# Find records to fix
print("\nFinding records to fix...")
records_to_fix = session.exec(
    select(YourModel).where(YourModel.field == "bad_value")
).all()
print(f"Found {len(records_to_fix)} records to fix")

# Apply fix
print("\nApplying fix...")
for record in records_to_fix:
    record.field = "corrected_value"
    session.add(record)

session.commit()
session.close()

print(f"\n[DONE] Fixed {len(records_to_fix)} records")
```

---

## Troubleshooting

### Script Fails with Import Error
```bash
# Ensure you're in backend2 directory
cd backend2

# Check Python path
python -c "import sys; print(sys.path)"

# Run from backend2 root
python scripts/utilities/script_name.py
```

### Script Hangs/Takes Too Long
```bash
# Check database connection
psql -d talentgraph_v2

# Check if script is waiting for input
# Press Ctrl+C to cancel

# Add timeout to script if needed
```

### Fix Script Corrupts Data
```bash
# Restore from backup
psql -d talentgraph_v2 < backup.sql

# Report issue
# Include: script name, error message, data affected
```

---

## Best Practices

### When to Use Utility Scripts
- ✅ Debugging production issues
- ✅ One-time data corrections
- ✅ Auditing data integrity
- ✅ Testing specific features
- ❌ Regular operations (use proper migrations instead)
- ❌ Production without testing on dev first

### Naming Conventions
- **debug_*.py** - Non-destructive debugging
- **fix_*.py** - Data modification (backup first)
- **cleanup_*.py** - Data deletion (irreversible)
- **audit_*.py** - Read-only reporting
- **list_*.py** - Display data summaries
- **show_*.py** - Display entity details

### Documentation
When creating new utility scripts:
- Add clear docstring explaining purpose
- Document any warnings or side effects
- Include usage examples in comments
- Add to this README under appropriate category

---

## Related Documentation

- [Backend README](../README.md) - Backend setup
- [Migration Scripts](../scripts/migrations/README.md) - Schema migrations
- [Testing Scripts](../scripts/testing/README.md) - Validation tests
- [Test Data Scripts](../scripts/test_data/README.md) - Data seeding

---

## Known Issues & Fixes

| Issue | Script | Status |
|-------|--------|--------|
| Analytics columns wrong type | `fix_analytics_columns.py` | ✅ Fixed |
| Duplicate swipe invites | `cleanup_duplicate_invites.py` | ✅ Fixed |
| Frozen jobs not expiring | `fix_frozen_jobs.py` | ✅ Fixed |
| Application status values invalid | `fix_status_values.py` | ✅ Fixed |

---

## Support

For script issues:
1. Check script docstring for requirements
2. Verify database connection
3. Ensure you have necessary permissions
4. Review script logs/output
5. Test on development environment first

For data corruption:
1. Stop the application
2. Restore from backup immediately
3. Document what happened
4. Test fix on dev environment
5. Apply fix with verification
