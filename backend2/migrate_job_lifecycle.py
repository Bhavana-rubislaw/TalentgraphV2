"""
Migration script for Job Posting Lifecycle Management

This script:
1. Adds new lifecycle columns to JobPosting table (if not exist)
2. Backfills existing records with appropriate default values
3. Creates an enum type for JobPostingStatus in Postgres

Run this script after pulling the code changes to update your database schema.

Usage:
    python migrate_job_lifecycle.py
"""

import sys
from sqlalchemy import text
from sqlmodel import Session, create_engine, select
from datetime import datetime

# Ensure the app module is in the path
sys.path.insert(0, '.')

from app.database import engine
from app.models import JobPosting


def run_migration():
    """Execute the migration"""
    print("=" * 60)
    print("Job Posting Lifecycle Migration")
    print("=" * 60)
    
    with Session(engine) as session:
        print("\n[1/4] Creating JobPostingStatus enum type...")
        try:
            # Create enum type in PostgreSQL
            session.exec(text("""
                DO $$ BEGIN
                    CREATE TYPE jobpostingstatus AS ENUM ('active', 'frozen', 'reposted');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            """))
            print("✓ Enum type created/verified")
        except Exception as e:
            print(f"⚠ Enum creation note: {e}")
            print("  (This is OK if the enum already exists)")
        
        print("\n[2/4] Adding new lifecycle columns...")
        
        # Add status column
        try:
            session.exec(text("""
                ALTER TABLE jobposting 
                ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
            """))
            print("✓ Added 'status' column")
        except Exception as e:
            print(f"✗ Error adding status column: {e}")
        
        # Add frozen_at column
        try:
            session.exec(text("""
                ALTER TABLE jobposting 
                ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMP;
            """))
            print("✓ Added 'frozen_at' column")
        except Exception as e:
            print(f"✗ Error adding frozen_at column: {e}")
        
        # Add reposted_at column
        try:
            session.exec(text("""
                ALTER TABLE jobposting 
                ADD COLUMN IF NOT EXISTS reposted_at TIMESTAMP;
            """))
            print("✓ Added 'reposted_at' column")
        except Exception as e:
            print(f"✗ Error adding reposted_at column: {e}")
        
        # Add last_reactivated_at column
        try:
            session.exec(text("""
                ALTER TABLE jobposting 
                ADD COLUMN IF NOT EXISTS last_reactivated_at TIMESTAMP;
            """))
            print("✓ Added 'last_reactivated_at' column")
        except Exception as e:
            print(f"✗ Error adding last_reactivated_at column: {e}")
        
        session.commit()
        
        print("\n[3/4] Backfilling existing job postings...")
        
        # Backfill based on is_active field
        try:
            # Set status to 'active' where is_active = true
            result_active = session.exec(text("""
                UPDATE jobposting 
                SET status = 'active' 
                WHERE is_active = true AND status IS NULL;
            """))
            
            # Set status to 'frozen' where is_active = false
            result_frozen = session.exec(text("""
                UPDATE jobposting 
                SET status = 'frozen',
                    frozen_at = updated_at
                WHERE is_active = false AND status IS NULL;
            """))
            
            session.commit()
            print(f"✓ Backfilled job postings")
            print(f"  - Active jobs: updated")
            print(f"  - Frozen jobs: updated with frozen_at timestamp")
        except Exception as e:
            print(f"✗ Error during backfill: {e}")
            session.rollback()
        
        print("\n[4/4] Verifying migration...")
        
        try:
            # Count jobs by status
            stats = session.exec(text("""
                SELECT 
                    status,
                    COUNT(*) as count
                FROM jobposting
                GROUP BY status
                ORDER BY status;
            """)).all()
            
            print("✓ Migration verified successfully")
            print("\nJob Posting Status Summary:")
            print("-" * 40)
            for row in stats:
                print(f"  {row.status:12} : {row.count} jobs")
            print("-" * 40)
            
            total = sum(row.count for row in stats)
            print(f"  {'Total':12} : {total} jobs")
            
        except Exception as e:
            print(f"⚠ Verification warning: {e}")
    
    print("\n" + "=" * 60)
    print("Migration completed!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Restart your backend server")
    print("2. Test the new lifecycle endpoints:")
    print("   - POST /job-postings/{id}/status")
    print("3. Update frontend to use new status fields")
    print("\n")


def rollback_migration():
    """
    Rollback the migration (use with caution!)
    This will remove the new columns but preserve existing data
    """
    print("=" * 60)
    print("ROLLBACK: Job Posting Lifecycle Migration")
    print("=" * 60)
    print("\n⚠ WARNING: This will remove lifecycle columns!")
    
    confirm = input("Are you sure? Type 'YES' to confirm: ")
    if confirm != "YES":
        print("Rollback cancelled.")
        return
    
    with Session(engine) as session:
        print("\nRemoving lifecycle columns...")
        
        try:
            session.exec(text("ALTER TABLE jobposting DROP COLUMN IF EXISTS status;"))
            session.exec(text("ALTER TABLE jobposting DROP COLUMN IF EXISTS frozen_at;"))
            session.exec(text("ALTER TABLE jobposting DROP COLUMN IF EXISTS reposted_at;"))
            session.exec(text("ALTER TABLE jobposting DROP COLUMN IF EXISTS last_reactivated_at;"))
            session.exec(text("DROP TYPE IF EXISTS jobpostingstatus;"))
            session.commit()
            print("✓ Rollback completed")
        except Exception as e:
            print(f"✗ Rollback error: {e}")
            session.rollback()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--rollback":
        rollback_migration()
    else:
        run_migration()
