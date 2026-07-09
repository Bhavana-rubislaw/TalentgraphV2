from app.database import engine
from sqlmodel import Session, text

session = Session(engine)

# Check raw database values
result = session.exec(text("""
    SELECT id, job_title, status 
    FROM jobposting 
    WHERE company_id IN (1, 2, 3)
    ORDER BY id
"""))

print("Raw database values:")
for row in result:
    print(f"  ID {row[0]}: status = '{row[2]}' (type: {type(row[2])})")

session.close()
