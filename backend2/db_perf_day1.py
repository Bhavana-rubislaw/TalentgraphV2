"""
Day 1 DB Performance Audit - TalentGraph V2
Focus: Read-heavy flows (dashboard, applications, swipes, notifications)
"""
import os, sys, json, time
sys.path.insert(0, '.')
from sqlalchemy import text
from app.database import engine

def run(sql, params=None):
    with engine.connect() as conn:
        result = conn.execute(text(sql), params or {})
        return [dict(row._mapping) for row in result]

def run_scalar(sql, params=None):
    with engine.connect() as conn:
        return conn.execute(text(sql), params or {}).scalar()

print("=" * 70)
print("STEP 1: EXISTING INDEXES ON application, swipe, notification")
print("=" * 70)

for table in ['application', 'swipe', 'notification']:
    print(f"\n--- {table.upper()} ---")
    rows = run("""
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = :t
        ORDER BY indexname
    """, {"t": table})
    if rows:
        for r in rows:
            print(f"  {r['indexname']}")
            print(f"    {r['indexdef']}")
    else:
        print("  (no indexes found)")

print("\n" + "=" * 70)
print("STEP 2: TABLE ROW COUNTS & SIZES")
print("=" * 70)

for table in ['application', 'swipe', 'notification', 'activityevent',
              'analytics_event', 'systemlog', 'match', 'jobposting',
              'candidate', 'user', 'message', 'conversation']:
    try:
        count = run_scalar(f"SELECT COUNT(*) FROM {table}")
        size = run_scalar(f"SELECT pg_size_pretty(pg_total_relation_size('{table}'))")
        print(f"  {table:25s}  rows={count:<10}  size={size}")
    except Exception as e:
        print(f"  {table:25s}  ERROR: {e}")

print("\n" + "=" * 70)
print("STEP 3: EXPLAIN ANALYZE - KEY DASHBOARD QUERIES (BEFORE indexes)")
print("=" * 70)

# Get a sample candidate_id and user_id for realistic queries
sample_candidate = run_scalar("SELECT id FROM candidate LIMIT 1")
sample_user = run_scalar("SELECT id FROM \"user\" LIMIT 1")
sample_job = run_scalar("SELECT id FROM jobposting LIMIT 1")

print(f"\nUsing sample IDs: candidate={sample_candidate}, user={sample_user}, job={sample_job}")

queries = {}

# Q1: Swipe lookup (dashboard - check if candidate already swiped on a job)
queries["Q1_swipe_candidate_job"] = f"""
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM swipe
WHERE candidate_id = {sample_candidate}
  AND job_posting_id = {sample_job}
  AND action_by = 'candidate'
LIMIT 1
"""

# Q2: Applications by candidate
queries["Q2_applications_by_candidate"] = f"""
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM application
WHERE candidate_id = {sample_candidate}
"""

# Q3: Notifications for user, ordered by created_at DESC (paginated)
queries["Q3_notifications_user_sorted"] = f"""
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM notification
WHERE user_id = {sample_user}
ORDER BY created_at DESC
LIMIT 20 OFFSET 0
"""

# Q4: Unread notification count
queries["Q4_unread_count"] = f"""
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COUNT(*) FROM notification
WHERE user_id = {sample_user}
  AND is_read = false
"""

# Q5: Application by candidate + job (duplicate check)
queries["Q5_application_candidate_job"] = f"""
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM application
WHERE candidate_id = {sample_candidate}
  AND job_posting_id = {sample_job}
LIMIT 1
"""

# Q6: Swipe by candidate (all swipes for dashboard dedup)
queries["Q6_swipes_by_candidate"] = f"""
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM swipe
WHERE candidate_id = {sample_candidate}
"""

before_results = {}
for label, sql in queries.items():
    print(f"\n--- {label} ---")
    try:
        rows = run(sql)
        lines = [list(r.values())[0] for r in rows]
        before_results[label] = lines
        for line in lines:
            print(f"  {line}")
    except Exception as e:
        print(f"  ERROR: {e}")
        before_results[label] = [str(e)]

print("\n" + "=" * 70)
print("STEP 4: ADDING TARGETED INDEXES (if not exist)")
print("=" * 70)

index_statements = [
    # Composite: swipe(candidate_id, job_posting_id) - dashboard dedup check
    ("ix_swipe_candidate_job",
     "CREATE INDEX IF NOT EXISTS ix_swipe_candidate_job ON swipe (candidate_id, job_posting_id)"),

    # Composite: application(candidate_id, job_posting_id) - application dedup check
    ("ix_application_candidate_job",
     "CREATE INDEX IF NOT EXISTS ix_application_candidate_job ON application (candidate_id, job_posting_id)"),

    # Composite: notification(user_id, created_at DESC) - paginated notification list
    ("ix_notification_user_created",
     "CREATE INDEX IF NOT EXISTS ix_notification_user_created ON notification (user_id, created_at DESC)"),
]

with engine.connect() as conn:
    for name, ddl in index_statements:
        try:
            conn.execute(text(ddl))
            conn.commit()
            print(f"  [OK] {name}")
        except Exception as e:
            print(f"  [SKIP] {name}: {e}")

# Verify indexes now
print("\n--- Verifying new indexes ---")
for table in ['application', 'swipe', 'notification']:
    rows = run("""
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = :t
        ORDER BY indexname
    """, {"t": table})
    for r in rows:
        print(f"  {r['indexname']}")
        print(f"    {r['indexdef']}")

print("\n" + "=" * 70)
print("STEP 5: EXPLAIN ANALYZE - SAME QUERIES (AFTER indexes)")
print("=" * 70)

# Force planner to see new indexes
with engine.connect() as conn:
    conn.execute(text("ANALYZE application"))
    conn.execute(text("ANALYZE swipe"))
    conn.execute(text("ANALYZE notification"))
    conn.commit()

after_results = {}
for label, sql in queries.items():
    print(f"\n--- {label} ---")
    try:
        rows = run(sql)
        lines = [list(r.values())[0] for r in rows]
        after_results[label] = lines
        for line in lines:
            print(f"  {line}")
    except Exception as e:
        print(f"  ERROR: {e}")
        after_results[label] = [str(e)]

print("\n" + "=" * 70)
print("STEP 6: BEFORE vs AFTER COMPARISON")
print("=" * 70)

def extract_timing(lines):
    for line in lines:
        if 'Execution Time' in str(line):
            return str(line).strip()
        if 'Planning Time' in str(line):
            return str(line).strip()
    # Fallback: return last non-empty line
    for line in reversed(lines):
        if str(line).strip():
            return str(line).strip()
    return "N/A"

def extract_exec_time(lines):
    for line in lines:
        if 'Execution Time' in str(line):
            try:
                return float(str(line).split(':')[1].strip().replace(' ms', ''))
            except:
                pass
    return None

for label in queries:
    print(f"\n--- {label} ---")
    b = extract_timing(before_results.get(label, []))
    a = extract_timing(after_results.get(label, []))
    bt = extract_exec_time(before_results.get(label, []))
    at = extract_exec_time(after_results.get(label, []))
    print(f"  BEFORE: {b}")
    print(f"  AFTER:  {a}")
    if bt and at:
        improvement = ((bt - at) / bt) * 100 if bt > 0 else 0
        print(f"  CHANGE: {bt:.3f}ms -> {at:.3f}ms ({improvement:+.1f}%)")

print("\n" + "=" * 70)
print("STEP 7: HEAVY-GROWTH TABLES (partition candidates)")
print("=" * 70)

for table in ['swipe', 'analytics_event', 'activityevent', 'systemlog']:
    try:
        count = run_scalar(f"SELECT COUNT(*) FROM {table}")
        total_size = run_scalar(f"SELECT pg_size_pretty(pg_total_relation_size('{table}'))")
        idx_size = run_scalar(f"SELECT pg_size_pretty(pg_indexes_size('{table}'))")
        has_ts = run_scalar(f"""
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_name = '{table}'
              AND column_name IN ('created_at', 'event_time', 'timestamp')
        """)
        print(f"  {table:25s}  rows={count:<10}  total={total_size:<12}  idx={idx_size:<12}  has_timestamp={'YES' if has_ts else 'NO'}")
    except Exception as e:
        print(f"  {table:25s}  ERROR: {e}")

print("\n" + "=" * 70)
print("DONE - Day 1 DB Performance Audit Complete")
print("=" * 70)
