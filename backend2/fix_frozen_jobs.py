"""
Fix script to update frozen job to active status
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.database import engine
from sqlmodel import Session, text

with Session(engine) as session:
    # Update frozen jobs to active
    result = session.exec(
        text("UPDATE job_postings SET status = 'active' WHERE status = 'frozen' OR status LIKE '%FROZEN%'")
    )
    session.commit()
    
    print("✅ Updated frozen jobs to active status")
    print(f"   Rows affected: {result.rowcount}")
