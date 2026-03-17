"""
Update existing notes with current timestamp
For notes that were saved before the notes_updated_at field was added
"""
from sqlmodel import Session, select, text
from datetime import datetime
from app.database import engine
from app.models import Application

def update_existing_notes():
    """Set notes_updated_at for all existing notes that don't have a timestamp"""
    
    with Session(engine) as session:
        try:
            # Get all applications with notes but no timestamp
            applications = session.exec(
                select(Application).where(
                    Application.recruiter_notes.isnot(None),
                    Application.notes_updated_at.is_(None)
                )
            ).all()
            
            if not applications:
                print("✓ No applications found with notes missing timestamps")
                return
            
            print(f"Found {len(applications)} applications with notes but no timestamp")
            
            # Update each one
            for app in applications:
                # Use the last status update time if available, otherwise use current time
                timestamp = app.last_status_updated_at or datetime.utcnow()
                app.notes_updated_at = timestamp
                session.add(app)
                print(f"  - Updated application {app.id}: set notes_updated_at to {timestamp}")
            
            session.commit()
            print(f"\n✓ Successfully updated {len(applications)} applications with timestamps")
            
        except Exception as e:
            print(f"Error during update: {e}")
            session.rollback()
            raise

if __name__ == "__main__":
    update_existing_notes()
    print("\nUpdate completed!")
