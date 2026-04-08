"""Check the database enum for meetingtype"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from sqlmodel import Session
from app.database import engine

def check_enum():
    with Session(engine) as session:
        # Check what values the meetingtype enum accepts
        result = session.exec(text("""
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'meetingtype'
            ORDER BY enumsortorder;
        """)).all()
        
        print("Valid MeetingType enum values in database:")
        for row in result:
            print(f"  - '{row[0]}'")

if __name__ == "__main__":
    check_enum()
