from app.database import engine
from sqlmodel import Session, select
from app.models import User, Candidate, Application, Swipe

with Session(engine) as db:
    # Find Sarah Anderson
    user = db.exec(select(User).where(User.email == 'sarah.anderson@email.com')).first()
    
    if not user:
        print("❌ User sarah.anderson@email.com not found!")
    else:
        print(f"✅ User found: {user.email} (ID: {user.id})")
        
        # Find candidate record
        candidate = db.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
        
        if not candidate:
            print("❌ No candidate record found for this user!")
        else:
            print(f"✅ Candidate found: ID {candidate.id}")
            
            # Check applications
            applications = db.exec(select(Application).where(Application.candidate_id == candidate.id)).all()
            print(f"\n📋 Applications: {len(applications)}")
            for app in applications:
                print(f"  - Job {app.job_posting_id}, Status: {app.status}")
            
            # Check swipes (liked jobs)
            swipes = db.exec(select(Swipe).where(
                Swipe.candidate_id == candidate.id,
                Swipe.action == 'like',
                Swipe.action_by == 'candidate'
            )).all()
            print(f"\n❤️ Liked jobs (swipes): {len(swipes)}")
            for swipe in swipes:
                print(f"  - Job {swipe.job_posting_id}")
