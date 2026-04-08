"""
Migrate existing scheduled applications to Meeting records
This ensures old scheduled interviews show up in the new Meetings page
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlmodel import Session, select
from datetime import datetime, timedelta
from app.database import engine
from app.models import (
    Application, Meeting, MeetingParticipant, User, Candidate, JobPosting, Company,
    MeetingStatus, MeetingType
)

def migrate_scheduled_applications():
    """Convert applications with status='scheduled' to Meeting records"""
    
    with Session(engine) as session:
        # Find all applications with status="scheduled" that don't have a meeting
        scheduled_apps = session.exec(
            select(Application)
            .where(Application.status == "scheduled")
        ).all()
        
        print(f"📊 Found {len(scheduled_apps)} scheduled applications")
        print()
        
        created_count = 0
        skipped_count = 0
        error_count = 0
        
        for app in scheduled_apps:
            try:
                # Check if meeting already exists for this application
                existing_meeting = session.exec(
                    select(Meeting).where(Meeting.application_id == app.id)
                ).first()
                
                if existing_meeting:
                    print(f"⏩ App {app.id}: Already has meeting (ID: {existing_meeting.id}), skipping")
                    skipped_count += 1
                    continue
                
                # Get candidate details
                candidate = session.get(Candidate, app.candidate_id)
                if not candidate:
                    print(f"❌ App {app.id}: Candidate not found")
                    error_count += 1
                    continue
                
                candidate_user = session.exec(
                    select(User).where(User.id == candidate.user_id)
                ).first()
                
                if not candidate_user:
                    print(f"❌ App {app.id}: Candidate user not found")
                    error_count += 1
                    continue
                
                # Get job posting and recruiter
                job_posting = session.get(JobPosting, app.job_posting_id)
                if not job_posting:
                    print(f"❌ App {app.id}: Job posting not found")
                    error_count += 1
                    continue
                
                company = session.get(Company, job_posting.company_id)
                if not company:
                    print(f"❌ App {app.id}: Company not found")
                    error_count += 1
                    continue
                
                recruiter_user = session.get(User, company.user_id)
                if not recruiter_user:
                    print(f"❌ App {app.id}: Recruiter user not found")
                    error_count += 1
                    continue
                
                # Get candidate name
                candidate_name = getattr(candidate, 'name', None) or candidate_user.email.split('@')[0]
                
                # Create meeting record
                # Use application's last_status_updated_at as scheduled_start, or use current time
                scheduled_start = app.last_status_updated_at or datetime.utcnow()
                scheduled_end = scheduled_start + timedelta(minutes=60)
                
                meeting = Meeting(
                    title=f"Interview: {candidate_name} - {job_posting.job_title}",
                    description=f"Interview with {candidate_name} for {job_posting.job_title}",
                    meeting_type="interview",
                    scheduled_start=scheduled_start,
                    scheduled_end=scheduled_end,
                    duration_minutes=60,
                    timezone="UTC",
                    location="TBD",  # Old system didn't store meeting links in meetings
                    video_meeting_url=None,
                    status="scheduled",
                    organizer_user_id=recruiter_user.id,
                    application_id=app.id,
                    video_provider=None
                )
                session.add(meeting)
                session.flush()
                
                # Create MeetingParticipant records
                # 1. Recruiter (organizer)
                recruiter_participant = MeetingParticipant(
                    meeting_id=meeting.id,
                    user_id=recruiter_user.id,
                    is_required=True,
                    has_confirmed=True  # Organizer is confirmed
                )
                session.add(recruiter_participant)
                
                # 2. Candidate (attendee)
                candidate_participant = MeetingParticipant(
                    meeting_id=meeting.id,
                    user_id=candidate_user.id,
                    is_required=True,
                    has_confirmed=False  # Candidate needs to confirm
                )
                session.add(candidate_participant)
                
                session.commit()
                
                print(f"✅ App {app.id}: Created meeting (ID: {meeting.id}) for {candidate_name} - {job_posting.job_title}")
                created_count += 1
                
            except Exception as e:
                print(f"❌ App {app.id}: Error - {e}")
                error_count += 1
                session.rollback()
                continue
        
        print()
        print("=" * 60)
        print(f"✅ Migration complete!")
        print(f"   Created: {created_count} meetings")
        print(f"   Skipped: {skipped_count} (already had meetings)")
        print(f"   Errors:  {error_count}")
        print("=" * 60)

if __name__ == "__main__":
    print("=" * 60)
    print("🔄 Migrating scheduled applications to Meeting records")
    print("=" * 60)
    print()
    migrate_scheduled_applications()
