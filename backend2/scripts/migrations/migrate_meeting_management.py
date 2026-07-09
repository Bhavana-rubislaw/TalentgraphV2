"""
Database Migration: Add Meeting Timeline and Action Token Support
================================================================
Adds comprehensive meeting management tables and fields for Option 3 implementation

New Tables:
- meeting_timeline_event: Timeline/audit log for all meeting actions
- meeting_action_token: Tokenized email action support

New Fields in Meeting table:
- reschedule_requested_at
- reschedule_requested_by_user_id
- reschedule_request_reason
- reschedule_request_preferred_times

New Meeting Statuses:
- reschedule_requested
- rescheduled

Run this after updating models.py
"""

from sqlalchemy import text
from sqlmodel import Session, create_engine
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in environment")
    exit(1)

engine = create_engine(DATABASE_URL)


def run_migration():
    """Run migration to add new tables and fields"""
    
    with Session(engine) as session:
        print("Starting migration...")
        
        # 1. Create meeting_timeline_event table
        print("Creating meeting_timeline_event table...")
        session.exec(text("""
            CREATE TABLE IF NOT EXISTS meeting_timeline_event (
                id SERIAL PRIMARY KEY,
                meeting_id INTEGER NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
                actor_user_id INTEGER NOT NULL REFERENCES "user"(id),
                actor_role VARCHAR,
                event_type VARCHAR NOT NULL,
                message TEXT NOT NULL,
                metadata_json TEXT,
                previous_scheduled_start TIMESTAMP,
                previous_scheduled_end TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        """))
        
        session.exec(text("""
            CREATE INDEX IF NOT EXISTS idx_meeting_timeline_event_meeting_id 
            ON meeting_timeline_event(meeting_id);
        """))
        
        session.exec(text("""
            CREATE INDEX IF NOT EXISTS idx_meeting_timeline_event_actor_user_id 
            ON meeting_timeline_event(actor_user_id);
        """))
        
        session.exec(text("""
            CREATE INDEX IF NOT EXISTS idx_meeting_timeline_event_event_type 
            ON meeting_timeline_event(event_type);
        """))
        
        session.exec(text("""
            CREATE INDEX IF NOT EXISTS idx_meeting_timeline_event_created_at 
            ON meeting_timeline_event(created_at);
        """))
        
        print("✓ meeting_timeline_event table created")
        
        # 2. Create meeting_action_token table
        print("Creating meeting_action_token table...")
        session.exec(text("""
            CREATE TABLE IF NOT EXISTS meeting_action_token (
                id SERIAL PRIMARY KEY,
                meeting_id INTEGER NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES "user"(id),
                token VARCHAR NOT NULL UNIQUE,
                action_type VARCHAR NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                is_used BOOLEAN NOT NULL DEFAULT FALSE,
                used_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        """))
        
        session.exec(text("""
            CREATE INDEX IF NOT EXISTS idx_meeting_action_token_meeting_id 
            ON meeting_action_token(meeting_id);
        """))
        
        session.exec(text("""
            CREATE INDEX IF NOT EXISTS idx_meeting_action_token_user_id 
            ON meeting_action_token(user_id);
        """))
        
        session.exec(text("""
            CREATE INDEX IF NOT EXISTS idx_meeting_action_token_token 
            ON meeting_action_token(token);
        """))
        
        session.exec(text("""
            CREATE INDEX IF NOT EXISTS idx_meeting_action_token_action_type 
            ON meeting_action_token(action_type);
        """))
        
        session.exec(text("""
            CREATE INDEX IF NOT EXISTS idx_meeting_action_token_expires_at 
            ON meeting_action_token(expires_at);
        """))
        
        session.exec(text("""
            CREATE INDEX IF NOT EXISTS idx_meeting_action_token_is_used 
            ON meeting_action_token(is_used);
        """))
        
        print("✓ meeting_action_token table created")
        
        # 3. Add new fields to meeting table
        print("Adding new fields to meeting table...")
        
        # Check if columns exist before adding
        try:
            session.exec(text("""
                ALTER TABLE meeting 
                ADD COLUMN IF NOT EXISTS reschedule_requested_at TIMESTAMP;
            """))
            
            session.exec(text("""
                ALTER TABLE meeting 
                ADD COLUMN IF NOT EXISTS reschedule_requested_by_user_id INTEGER 
                REFERENCES "user"(id);
            """))
            
            session.exec(text("""
                ALTER TABLE meeting 
                ADD COLUMN IF NOT EXISTS reschedule_request_reason TEXT;
            """))
            
            session.exec(text("""
                ALTER TABLE meeting 
                ADD COLUMN IF NOT EXISTS reschedule_request_preferred_times TEXT;
            """))
            
            print("✓ New fields added to meeting table")
        except Exception as e:
            print(f"Note: Some fields may already exist: {e}")
        
        # 4. Update meeting status enum to include new statuses
        print("Updating meeting status enum...")
        try:
            # Check if enum type exists
            result = session.exec(text("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'meetingstatus'
                );
            """))
            enum_exists = result.fetchone()[0]
            
            if enum_exists:
                # Add new values to existing enum
                session.exec(text("""
                    ALTER TYPE meetingstatus ADD VALUE IF NOT EXISTS 'reschedule_requested';
                """))
                
                session.exec(text("""
                    ALTER TYPE meetingstatus ADD VALUE IF NOT EXISTS 'rescheduled';
                """))
                
                print("✓ Meeting status enum updated")
            else:
                print("Note: MeetingStatus enum not found (may be using VARCHAR)")
        except Exception as e:
            print(f"Note: Enum update not needed or already exists: {e}")
        
        # Commit all changes
        session.commit()
        
        print("\n✅ Migration completed successfully!")
        print("\nNew features enabled:")
        print("  - Meeting timeline/audit log")
        print("  - Tokenized email actions (confirm, cancel, reschedule)")
        print("  - Candidate reschedule requests")
        print("  - Application status synchronization")
        print("  - Comprehensive notification and email integration")


def verify_migration():
    """Verify migration was successful"""
    
    with Session(engine) as session:
        print("\nVerifying migration...")
        
        # Check if tables exist
        tables_to_check = ['meeting_timeline_event', 'meeting_action_token']
        
        for table in tables_to_check:
            result = session.exec(text(f"""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = '{table}'
                );
            """))
            exists = result.fetchone()[0]
            
            if exists:
                print(f"  ✓ {table} exists")
            else:
                print(f"  ✗ {table} NOT FOUND")
        
        # Check if new meeting columns exist
        meeting_columns = [
            'reschedule_requested_at',
            'reschedule_requested_by_user_id',
            'reschedule_request_reason',
            'reschedule_request_preferred_times'
        ]
        
        for column in meeting_columns:
            result = session.exec(text(f"""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'meeting' 
                    AND column_name = '{column}'
                );
            """))
            exists = result.fetchone()[0]
            
            if exists:
                print(f"  ✓ meeting.{column} exists")
            else:
                print(f"  ✗ meeting.{column} NOT FOUND")
        
        print("\n✅ Verification complete")


if __name__ == "__main__":
    print("=" * 70)
    print("Meeting Management Migration - Option 3 Implementation")
    print("=" * 70)
    print()
    
    try:
        run_migration()
        verify_migration()
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
