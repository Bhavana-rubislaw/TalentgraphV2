import psycopg2

# Connect to database
conn = psycopg2.connect(
    dbname="talentgraph_v2",
    user="postgres",
    password="kutty",
    host="localhost",
    port=5432
)

cursor = conn.cursor()

# Check if new columns exist in application table
cursor.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'application'
    AND column_name IN ('recruiter_notes', 'last_status_updated_at', 'last_status_updated_by_user_id')
    ORDER BY column_name;
""")

existing_columns = cursor.fetchall()

print("=== Checking for new Application columns ===")
print(f"Found {len(existing_columns)} out of 3 expected columns:")
for col_name, col_type in existing_columns:
    print(f"  ✓ {col_name} ({col_type})")

expected = {'recruiter_notes', 'last_status_updated_at', 'last_status_updated_by_user_id'}
found = {col[0] for col in existing_columns}
missing = expected - found

if missing:
    print(f"\n❌ Missing columns: {', '.join(missing)}")
    print("\nYou need to run this SQL migration:")
    print("=" * 50)
    if 'recruiter_notes' in missing:
        print("ALTER TABLE application ADD COLUMN recruiter_notes TEXT;")
    if 'last_status_updated_at' in missing:
        print("ALTER TABLE application ADD COLUMN last_status_updated_at TIMESTAMP;")
    if 'last_status_updated_by_user_id' in missing:
        print("ALTER TABLE application ADD COLUMN last_status_updated_by_user_id INTEGER REFERENCES \"user\"(id);")
    print("=" * 50)
else:
    print("\n✓ All columns exist!")

cursor.close()
conn.close()
