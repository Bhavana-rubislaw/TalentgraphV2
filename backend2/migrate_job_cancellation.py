"""
Database migration to add CANCELLED status and related fields to job postings
Adds: cancelled_at, cancellation_reason columns
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlmodel import Session, select, text
from app.database import engine
from app.models import JobPosting

def migrate_job_cancellation():
    """Add cancelled_at and cancellation_reason columns to jobposting table"""
    
    with Session(engine) as session:
        print("\n🔄 Starting job posting cancellation migration...")
        
        try:
            # Check if columns already exist
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'jobposting' 
                AND column_name IN ('cancelled_at', 'cancellation_reason')
            """)
            existing_columns = session.exec(check_query).all()
            existing_column_names = [col[0] for col in existing_columns]
            
            if 'cancelled_at' in existing_column_names and 'cancellation_reason' in existing_column_names:
                print("✓ Columns already exist. Skipping migration.")
                return
            
            # Add cancelled_at column if it doesn't exist
            if 'cancelled_at' not in existing_column_names:
                print("\n📝 Adding 'cancelled_at' column...")
                session.exec(text("""
                    ALTER TABLE jobposting 
                    ADD COLUMN cancelled_at TIMESTAMP
                """))
                print("✓ Added 'cancelled_at' column")
            else:
                print("✓ Column 'cancelled_at' already exists")
            
            # Add cancellation_reason column if it doesn't exist
            if 'cancellation_reason' not in existing_column_names:
                print("\n📝 Adding 'cancellation_reason' column...")
                session.exec(text("""
                    ALTER TABLE jobposting 
                    ADD COLUMN cancellation_reason VARCHAR(500)
                """))
                print("✓ Added 'cancellation_reason' column")
            else:
                print("✓ Column 'cancellation_reason' already exists")
            
            session.commit()
            print("\n✅ Migration completed successfully!")
            
            # Verify the new columns
            print("\n🔍 Verifying migration...")
            verify_query = text("""
                SELECT 
                    COUNT(*) as total_jobs,
                    SUM(CASE WHEN cancelled_at IS NOT NULL THEN 1 ELSE 0 END) as cancelled_count
                FROM jobposting
            """)
            result = session.exec(verify_query).first()
            if result:
                print(f"✓ Total job postings: {result[0]}")
                print(f"✓ Cancelled job postings: {result[1]}")
            
            # Show current status distribution
            status_query = text("""
                SELECT status, COUNT(*) as count
                FROM jobposting
                GROUP BY status
                ORDER BY count DESC
            """)
            print("\n📊 Current job posting status distribution:")
            for row in session.exec(status_query).all():
                print(f"   {row[0]}: {row[1]} jobs")
            
        except Exception as e:
            session.rollback()
            print(f"\n❌ Migration failed: {e}")
            raise

if __name__ == "__main__":
    migrate_job_cancellation()
