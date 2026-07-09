"""
Database migration: Add extended profile fields to Company table

This migration adds the following fields to support Company/Profile Setup:
- company_website
- company_location
- department
- phone_number
- linkedin_profile
- hiring_focus (JSON array of job categories)
- company_description
- profile_complete (boolean flag)
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import text
from app.database import engine

def migrate():
    """Add extended profile fields to Company table"""
    
    print("[MIGRATION] Starting Company table profile fields migration...")
    
    with engine.connect() as conn:
        # Check if columns already exist
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'company' 
            AND column_name IN ('company_website', 'profile_complete');
        """))
        existing_columns = [row[0] for row in result.fetchall()]
        
        if 'profile_complete' in existing_columns:
            print("[MIGRATION] Columns already exist. Skipping migration.")
            return
        
        print("[MIGRATION] Adding new columns to Company table...")
        
        # Add new columns
        conn.execute(text("""
            ALTER TABLE company
            ADD COLUMN IF NOT EXISTS company_website VARCHAR,
            ADD COLUMN IF NOT EXISTS company_location VARCHAR,
            ADD COLUMN IF NOT EXISTS department VARCHAR,
            ADD COLUMN IF NOT EXISTS phone_number VARCHAR,
            ADD COLUMN IF NOT EXISTS linkedin_profile VARCHAR,
            ADD COLUMN IF NOT EXISTS hiring_focus VARCHAR,
            ADD COLUMN IF NOT EXISTS company_description TEXT,
            ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT FALSE;
        """))
        
        conn.commit()
        
        print("[MIGRATION] ✓ Company table profile fields migration completed successfully!")
        print("[MIGRATION] Added fields:")
        print("  - company_website")
        print("  - company_location")
        print("  - department")
        print("  - phone_number")
        print("  - linkedin_profile")
        print("  - hiring_focus")
        print("  - company_description")
        print("  - profile_complete")

if __name__ == "__main__":
    migrate()
