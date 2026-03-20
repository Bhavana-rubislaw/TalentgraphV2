from app.database import engine
from sqlmodel import Session, select, text

with Session(engine) as session:
    # Check Jennifer's jobs directly from database
    result = session.exec(text("""
        SELECT jp.id, jp.job_title, jp.status, jp.is_active, c.company_name
        FROM jobposting jp
        JOIN company c ON jp.company_id = c.id
        JOIN "user" u ON c.user_id = u.id  
        WHERE u.email LIKE '%jennifer%'
        ORDER BY jp.id
    """)).all()
    
    print("Jennifer's Job Postings:")
    print("=" * 80)
    for row in result:
        print(f"ID: {row[0]:3} | {row[1][:45]:45} | Status: {row[2]:10} | Active: {row[3]}")
    print("=" * 80)
    print(f"Total jobs: {len(result)}")
