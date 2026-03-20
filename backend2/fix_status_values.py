from app.database import engine
from sqlmodel import Session, text

session = Session(engine)

# Check current values
result = session.exec(text("SELECT DISTINCT status FROM jobposting"))
print("Current status values:")
for row in result:
    print(f"  - '{row[0]}'")

# Update to uppercase to match enum
print("\nUpdating to uppercase...")
session.exec(text("UPDATE jobposting SET status = 'ACTIVE' WHERE status = 'active'"))
session.exec(text("UPDATE jobposting SET status = 'FROZEN' WHERE status = 'frozen'"))
session.exec(text("UPDATE jobposting SET status = 'REPOSTED' WHERE status = 'reposted'"))
session.commit()

# Verify
result = session.exec(text("SELECT DISTINCT status FROM jobposting"))
print("\nUpdated status values:")
for row in result:
    print(f"  - '{row[0]}'")

# Check Jennifer's jobs
result = session.exec(text("""
    SELECT id, job_title, company_id, status 
    FROM jobposting 
    WHERE company_id IN (1, 2, 3)
    LIMIT 5
"""))
print("\nJennifer's jobs:")
for row in result:
    print(f"  ID: {row[0]}, Title: {row[1]}, Company: {row[2]}, Status: '{row[3]}'")

session.close()
print("\n✓ Status values updated to match enum!")
