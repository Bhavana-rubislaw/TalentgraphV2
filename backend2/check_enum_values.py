"""Check what enum values exist in the database"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from sqlmodel import Session, create_engine
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

with Session(engine) as session:
    # Check meetingtype enum
    result = session.exec(text("""
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'meetingtype'
        )
        ORDER BY enumsortorder;
    """))
    
    print("Database meetingtype enum values:")
    for row in result:
        print(f"  - '{row[0]}'")
    
    print()
    
    # Check meetingstatus enum
    result = session.exec(text("""
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'meetingstatus'
        )
        ORDER BY enumsortorder;
    """))
    
    print("Database meetingstatus enum values:")
    for row in result:
        print(f"  - '{row[0]}'")
