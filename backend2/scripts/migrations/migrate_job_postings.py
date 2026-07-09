"""
Migration script to add new Job Posting Builder columns and tables.
Run this once to update the database schema.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import engine
from sqlmodel import SQLModel

# Import all models so create_all sees them
from app.models import *

def migrate():
    """Add new columns to jobposting table and create jobpostingskill table"""
    
    with engine.connect() as conn:
        # 1. Add new enum values to employmenttype
        print("[MIGRATE] Adding new enum values to employmenttype...")
        try:
            conn.execute(text("ALTER TYPE employmenttype ADD VALUE IF NOT EXISTS 'c2c'"))
            conn.execute(text("ALTER TYPE employmenttype ADD VALUE IF NOT EXISTS 'w2'"))
            conn.commit()
            print("[OK] Enum values added")
        except Exception as e:
            print(f"[SKIP] Enum update: {e}")
            conn.rollback()
        
        # 2. Add new columns to jobposting table
        new_columns = [
            ("end_date", "VARCHAR"),
            ("job_category", "VARCHAR"),
            ("travel_requirements", "VARCHAR"),
            ("visa_info", "VARCHAR"),
            ("education_qualifications", "VARCHAR"),
            ("certifications_required", "VARCHAR"),
            ("pay_type", "VARCHAR"),
        ]
        
        for col_name, col_type in new_columns:
            try:
                conn.execute(text(f"ALTER TABLE jobposting ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                conn.commit()
                print(f"[OK] Added column: {col_name}")
            except Exception as e:
                print(f"[SKIP] Column {col_name}: {e}")
                conn.rollback()
    
    # 3. Create new tables (JobPostingSkill)
    print("[MIGRATE] Creating new tables...")
    SQLModel.metadata.create_all(engine)
    print("[OK] All new tables created")
    
    print("\n[DONE] Migration complete!")


if __name__ == "__main__":
    migrate()
