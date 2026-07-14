import psycopg2

# Connect to database
conn = psycopg2.connect(
    dbname="talentgraph_v2",
    user="postgres",
    password="kutty",
    host="localhost",
    port=5432
)

conn.autocommit = True
cursor = conn.cursor()

print("=== Running Database Migration ===\n")

# Migration 1: Add recruiter_notes column
try:
    cursor.execute("ALTER TABLE application ADD COLUMN recruiter_notes TEXT;")
    print("✓ Added column: recruiter_notes")
except psycopg2.Error as e:
    if "already exists" in str(e):
        print("  (recruiter_notes already exists)")
    else:
        print(f"❌ Error adding recruiter_notes: {e}")

# Migration 2: Add last_status_updated_at column
try:
    cursor.execute("ALTER TABLE application ADD COLUMN last_status_updated_at TIMESTAMP;")
    print("✓ Added column: last_status_updated_at")
except psycopg2.Error as e:
    if "already exists" in str(e):
        print("  (last_status_updated_at already exists)")
    else:
        print(f"❌ Error adding last_status_updated_at: {e}")

# Migration 3: Add last_status_updated_by_user_id column
try:
    cursor.execute('ALTER TABLE application ADD COLUMN last_status_updated_by_user_id INTEGER REFERENCES "user"(id);')
    print("✓ Added column: last_status_updated_by_user_id")
except psycopg2.Error as e:
    if "already exists" in str(e):
        print("  (last_status_updated_by_user_id already exists)")
    else:
        print(f"❌ Error adding last_status_updated_by_user_id: {e}")

print("\n✅ Migration complete!")

# Verify
cursor.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'application'
    AND column_name IN ('recruiter_notes', 'last_status_updated_at', 'last_status_updated_by_user_id')
    ORDER BY column_name;
""")

columns = cursor.fetchall()
print(f"\nVerification: Found {len(columns)}/3 columns")
for col in columns:
    print(f"  ✓ {col[0]}")

cursor.close()
conn.close()
