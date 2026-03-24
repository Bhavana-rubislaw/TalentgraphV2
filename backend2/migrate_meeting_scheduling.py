"""
Database Migration: Meeting & Scheduling Domain (Phase 1 & 2)

Creates tables for:
- Meeting domain: meeting, meeting_participant, meeting_availability_slot
- Calendar integration: calendar_account  
- Video provider integration: video_provider_account

Enums created:
- meetingstatus: scheduled, cancelled, completed, no_show
- meetingtype: interview, screening, follow_up, other
- calendarprovider: google, microsoft
- videoprovider: zoom, microsoft_teams, google_meet, other
"""

import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.database import DATABASE_URL

def run_migration():
    """Execute the meeting & scheduling migration"""
    engine = create_engine(DATABASE_URL)
    
    print("🚀 Starting Meeting & Scheduling Migration...")
    print("=" * 60)
    
    with engine.connect() as conn:
        # Create enums first
        print("\n📋 Step 1: Creating enum types...")
        
        # MeetingStatus enum
        conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE meetingstatus AS ENUM ('scheduled', 'cancelled', 'completed', 'no_show');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))
        print("  ✓ meetingstatus enum created")
        
        # MeetingType enum
        conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE meetingtype AS ENUM ('interview', 'screening', 'follow_up', 'other');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))
        print("  ✓ meetingtype enum created")
        
        # CalendarProvider enum
        conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE calendarprovider AS ENUM ('google', 'microsoft');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))
        print("  ✓ calendarprovider enum created")
        
        # VideoProvider enum
        conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE videoprovider AS ENUM ('zoom', 'microsoft_teams', 'google_meet', 'other');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))
        print("  ✓ videoprovider enum created")
        
        # Create Meeting table
        print("\n📋 Step 2: Creating meeting table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS meeting (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                meeting_type meetingtype NOT NULL DEFAULT 'interview',
                status meetingstatus NOT NULL DEFAULT 'scheduled',
                scheduled_start TIMESTAMP NOT NULL,
                scheduled_end TIMESTAMP NOT NULL,
                duration_minutes INTEGER NOT NULL DEFAULT 60,
                timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
                organizer_user_id INTEGER NOT NULL REFERENCES "user"(id),
                job_posting_id INTEGER REFERENCES jobposting(id),
                match_id INTEGER REFERENCES match(id),
                application_id INTEGER REFERENCES application(id),
                location VARCHAR(500),
                video_meeting_url VARCHAR(500),
                video_provider VARCHAR(50),
                google_calendar_event_id VARCHAR(255),
                microsoft_calendar_event_id VARCHAR(255),
                cancelled_at TIMESTAMP,
                cancelled_by_user_id INTEGER REFERENCES "user"(id),
                cancellation_reason TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_meeting_title ON meeting(title);
            CREATE INDEX IF NOT EXISTS idx_meeting_status ON meeting(status);
            CREATE INDEX IF NOT EXISTS idx_meeting_scheduled_start ON meeting(scheduled_start);
            CREATE INDEX IF NOT EXISTS idx_meeting_scheduled_end ON meeting(scheduled_end);
            CREATE INDEX IF NOT EXISTS idx_meeting_organizer ON meeting(organizer_user_id);
            CREATE INDEX IF NOT EXISTS idx_meeting_job_posting ON meeting(job_posting_id);
            CREATE INDEX IF NOT EXISTS idx_meeting_match ON meeting(match_id);
            CREATE INDEX IF NOT EXISTS idx_meeting_application ON meeting(application_id);
        """))
        print("  ✓ meeting table created with indexes")
        
        # Create MeetingParticipant table
        print("\n📋 Step 3: Creating meeting_participant table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS meeting_participant (
                id SERIAL PRIMARY KEY,
                meeting_id INTEGER NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES "user"(id),
                is_required BOOLEAN NOT NULL DEFAULT TRUE,
                has_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
                confirmed_at TIMESTAMP,
                attended BOOLEAN,
                reminder_sent_24h BOOLEAN NOT NULL DEFAULT FALSE,
                reminder_sent_1h BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_meeting_participant UNIQUE (meeting_id, user_id)
            );
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_meeting_participant_meeting ON meeting_participant(meeting_id);
            CREATE INDEX IF NOT EXISTS idx_meeting_participant_user ON meeting_participant(user_id);
        """))
        print("  ✓ meeting_participant table created with indexes")
        
        # Create MeetingAvailabilitySlot table
        print("\n📋 Step 4: Creating meeting_availability_slot table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS meeting_availability_slot (
                id SERIAL PRIMARY KEY,
                proposed_by_user_id INTEGER NOT NULL REFERENCES "user"(id),
                proposed_to_user_id INTEGER NOT NULL REFERENCES "user"(id),
                slot_start TIMESTAMP NOT NULL,
                slot_end TIMESTAMP NOT NULL,
                timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
                job_posting_id INTEGER REFERENCES jobposting(id),
                match_id INTEGER REFERENCES match(id),
                application_id INTEGER REFERENCES application(id),
                is_selected BOOLEAN NOT NULL DEFAULT FALSE,
                selected_at TIMESTAMP,
                meeting_id INTEGER REFERENCES meeting(id),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expired_at TIMESTAMP
            );
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_availability_slot_proposed_by ON meeting_availability_slot(proposed_by_user_id);
            CREATE INDEX IF NOT EXISTS idx_availability_slot_proposed_to ON meeting_availability_slot(proposed_to_user_id);
            CREATE INDEX IF NOT EXISTS idx_availability_slot_start ON meeting_availability_slot(slot_start);
            CREATE INDEX IF NOT EXISTS idx_availability_slot_end ON meeting_availability_slot(slot_end);
            CREATE INDEX IF NOT EXISTS idx_availability_slot_job_posting ON meeting_availability_slot(job_posting_id);
            CREATE INDEX IF NOT EXISTS idx_availability_slot_match ON meeting_availability_slot(match_id);
            CREATE INDEX IF NOT EXISTS idx_availability_slot_application ON meeting_availability_slot(application_id);
            CREATE INDEX IF NOT EXISTS idx_availability_slot_meeting ON meeting_availability_slot(meeting_id);
        """))
        print("  ✓ meeting_availability_slot table created with indexes")
        
        # Create CalendarAccount table (Phase 2)
        print("\n📋 Step 5: Creating calendar_account table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS calendar_account (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES "user"(id),
                provider calendarprovider NOT NULL,
                provider_account_id VARCHAR(255) NOT NULL,
                provider_email VARCHAR(255) NOT NULL,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                token_expires_at TIMESTAMP,
                is_primary BOOLEAN NOT NULL DEFAULT FALSE,
                sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                last_synced_at TIMESTAMP,
                calendar_name VARCHAR(255),
                calendar_timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
                connected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_calendar_account UNIQUE (user_id, provider, provider_email)
            );
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_calendar_account_user ON calendar_account(user_id);
            CREATE INDEX IF NOT EXISTS idx_calendar_account_provider ON calendar_account(provider);
            CREATE INDEX IF NOT EXISTS idx_calendar_account_provider_id ON calendar_account(provider_account_id);
        """))
        print("  ✓ calendar_account table created with indexes")
        
        # Create VideoProviderAccount table (Phase 2)
        print("\n📋 Step 6: Creating video_provider_account table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS video_provider_account (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES "user"(id),
                provider videoprovider NOT NULL,
                provider_account_id VARCHAR(255),
                provider_email VARCHAR(255),
                access_token TEXT,
                refresh_token TEXT,
                api_key TEXT,
                api_secret TEXT,
                token_expires_at TIMESTAMP,
                is_primary BOOLEAN NOT NULL DEFAULT FALSE,
                auto_generate_links BOOLEAN NOT NULL DEFAULT TRUE,
                default_meeting_password VARCHAR(100),
                waiting_room_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                connected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_video_provider_account UNIQUE (user_id, provider)
            );
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_video_provider_account_user ON video_provider_account(user_id);
            CREATE INDEX IF NOT EXISTS idx_video_provider_account_provider ON video_provider_account(provider);
        """))
        print("  ✓ video_provider_account table created with indexes")
        
        conn.commit()
        print("\n" + "=" * 60)
        print("✅ Migration completed successfully!")
        print("\nCreated tables:")
        print("  • meeting (with 8 indexes)")
        print("  • meeting_participant (with 2 indexes)")
        print("  • meeting_availability_slot (with 8 indexes)")
        print("  • calendar_account (with 3 indexes)")
        print("  • video_provider_account (with 2 indexes)")
        print("\nCreated enums:")
        print("  • meetingstatus (scheduled, cancelled, completed, no_show)")
        print("  • meetingtype (interview, screening, follow_up, other)")
        print("  • calendarprovider (google, microsoft)")
        print("  • videoprovider (zoom, microsoft_teams, google_meet, other)")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        sys.exit(1)
