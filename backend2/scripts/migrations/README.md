# Database Migration Scripts

This directory contains all database schema migration scripts for TalentGraph V2.

**Total Scripts:** 13  
**Execution:** Run manually when deploying schema changes  
**Order:** Some migrations depend on others; see execution order below

---

## Migration Scripts

### Core Table Migrations

| Script | Description | Status |
|--------|-------------|--------|
| `migrate_system_log.py` | System logging table + 8 indexes | ✅ Applied |
| `migrate_activity_event.py` | Audit trail (append-only) | ✅ Applied |
| `migrate_notifications.py` | In-app notifications + read receipts | ✅ Applied |
| `migrate_chat.py` | Messaging system tables | ✅ Applied |
| `migrate_chat_read_receipts.py` | Message read status tracking | ✅ Applied |

### Job Lifecycle Migrations

| Script | Description | Status |
|--------|-------------|--------|
| `migrate_job_postings.py` | Job posting schema extensions | ✅ Applied |
| `migrate_job_lifecycle.py` | Job status workflow (7 states) | ✅ Applied |
| `migrate_job_cancellation.py` | Cancelled/frozen job status | ✅ Applied |
| `migrate_scheduled_applications.py` | Scheduled application status | ✅ Applied |

### Meeting Management Migrations

| Script | Description | Status |
|--------|-------------|--------|
| `migrate_meeting_management.py` | Meeting table + constraints | ✅ Applied |
| `migrate_meeting_scheduling.py` | Interview scheduling fields | ✅ Applied |

### Phase 3/4 Migrations

| Script | Description | Status |
|--------|-------------|--------|
| `migrate_phase3_phase4.py` | Phase 3/4 feature rollout tables | ✅ Applied |

### Performance Migrations

| Script | Description | Status |
|--------|-------------|--------|
| `migrate_perf_indexes.py` | **Day 1 performance indexes (4 total)** | ✅ Applied |

**Details:** See [DB_OPTIMIZATION_DAY1_COMPLETE.md](../DB_OPTIMIZATION_DAY1_COMPLETE.md)

---

## Execution Order

### First-Time Setup (Fresh Database)
```bash
# 1. Core tables (no dependencies)
python scripts/migrations/migrate_system_log.py
python scripts/migrations/migrate_activity_event.py
python scripts/migrations/migrate_notifications.py

# 2. Job lifecycle
python scripts/migrations/migrate_job_postings.py
python scripts/migrations/migrate_job_lifecycle.py
python scripts/migrations/migrate_job_cancellation.py
python scripts/migrations/migrate_scheduled_applications.py

# 3. Messaging
python scripts/migrations/migrate_chat.py
python scripts/migrations/migrate_chat_read_receipts.py

# 4. Meeting management
python scripts/migrations/migrate_meeting_management.py
python scripts/migrations/migrate_meeting_scheduling.py

# 5. Phase 3/4 features
python scripts/migrations/migrate_phase3_phase4.py

# 6. Performance (can run anytime)
python scripts/migrations/migrate_perf_indexes.py
```

### Incremental Updates (Existing Database)
```bash
# Only run new migrations that haven't been applied yet
# Check database schema first to see what's missing

# Performance indexes (safe to rerun)
python scripts/migrations/migrate_perf_indexes.py
```

---

## How to Run a Migration

### Standard Execution
```bash
# Navigate to backend directory
cd backend2

# Run migration script
python scripts/migrations/migrate_<name>.py

# Expected output:
# [OK] Table created/updated
# [OK] Indexes created
# [DONE] Migration complete
```

### Rollback
**⚠️ Warning:** These migrations do NOT include rollback logic. Rolling back requires manual SQL:

```sql
-- Example: Drop a table
DROP TABLE IF EXISTS systemlog CASCADE;

-- Example: Drop an index
DROP INDEX IF EXISTS ix_notification_user_created;
```

### Verify Migration
```bash
# Connect to PostgreSQL
psql -d talentgraph_v2

# List tables
\dt

# Describe table structure
\d+ tablename

# List indexes
\di
```

---

## Migration Script Template

When creating a new migration, use this template:

```python
"""
Database migration: [Brief description]
[Longer description of what this migration does]
"""

import logging
from sqlalchemy import text
from app.database import engine
from sqlmodel import Session

logger = logging.getLogger(__name__)

def migrate():
    """Apply migration"""
    
    ddl_statements = [
        "CREATE TABLE IF NOT EXISTS ...",
        "CREATE INDEX IF NOT EXISTS ...",
    ]
    
    try:
        with Session(engine) as session:
            for ddl in ddl_statements:
                session.exec(text(ddl))
                logger.info(f"[OK] {ddl[:50]}...")
            
            session.commit()
        
        logger.info("[DONE] Migration complete")
        return True
    
    except Exception as e:
        logger.error(f"[ERROR] Migration failed: {e}")
        raise

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    migrate()
```

---

## Best Practices

### Safe Migrations
- ✅ Use `IF NOT EXISTS` for idempotency (safe to rerun)
- ✅ Run migrations during low-traffic periods
- ✅ Backup database before running migrations
- ✅ Test migrations on staging environment first
- ✅ Use transactions where possible
- ❌ Avoid `DROP TABLE` in production migrations
- ❌ Don't modify existing columns (create new ones instead)

### Performance Considerations
- Create indexes on foreign keys
- Use partial indexes for filtered queries
- Add indexes for common `WHERE` and `ORDER BY` columns
- Analyze tables after creating indexes: `ANALYZE tablename`

### Documentation
- Include clear comments in migration scripts
- Document dependencies (which migrations must run first)
- Update this README when adding new migrations

---

## Troubleshooting

### Migration Failed Halfway
```bash
# Check PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log

# Connect to database and inspect
psql -d talentgraph_v2

# Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'tablename'
);

# Drop partial migration (if safe)
DROP TABLE IF EXISTS tablename CASCADE;

# Rerun migration
python scripts/migrations/migrate_<name>.py
```

### Index Already Exists Error
```bash
# If using CREATE INDEX (not IF NOT EXISTS), drop first
DROP INDEX IF EXISTS index_name;

# Better: Update script to use IF NOT EXISTS
CREATE INDEX IF NOT EXISTS index_name ON table (column);
```

### Permission Denied
```bash
# Ensure database user has CREATE privileges
GRANT CREATE ON DATABASE talentgraph_v2 TO your_user;
```

---

## Related Documentation

- [Backend README](../README.md) - Full backend setup
- [POSTGRESQL_SETUP.md](../POSTGRESQL_SETUP.md) - Database setup
- [DB_OPTIMIZATION_DAY1_COMPLETE.md](../DB_OPTIMIZATION_DAY1_COMPLETE.md) - Performance optimization
- [Testing Scripts](../scripts/testing/README.md) - Post-migration verification

---

## Migration History

| Date | Migration | Author | Notes |
|------|-----------|--------|-------|
| 2026-04-22 | migrate_perf_indexes.py | System | Day 1 performance optimization |
| 2026-04-15 | migrate_phase3_phase4.py | Dev Team | Phase 3/4 rollout |
| 2026-04-10 | migrate_meeting_scheduling.py | Dev Team | Interview scheduling |
| ... | ... | ... | ... |

---

## Support

For migration issues:
1. Check PostgreSQL logs
2. Review migration script comments
3. Verify database user has correct privileges
4. Check for conflicting table/index names
5. Consult project documentation
