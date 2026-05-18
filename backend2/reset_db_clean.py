#!/usr/bin/env python3
"""Complete database reset and reseed - Direct execution version."""

import sys
import os

# Set environment to handle unicode
os.environ['PYTHONIOENCODING'] = 'utf-8'

# Import at module level
from sqlalchemy import text
from app.database import engine
from app.models import (
    User, UserRole, Candidate, Company, JobPosting, JobProfile,
    Skill, Application, Meeting, MeetingParticipant
)
from sqlmodel import SQLModel, Session, select
from app.security import hash_password

def main():
    print("\n" + "="*80)
    print("DATABASE RESET & RESEED")
    print("="*80)
    
    # Step 1: Drop and recreate schema
    print("\n[1/4] Dropping and recreating schema...")
    try:
        with engine.connect() as conn:
            conn.execute(text('DROP SCHEMA public CASCADE'))
            conn.execute(text('CREATE SCHEMA public'))
            conn.commit()
        print("      [+] Schema reset complete")
    except Exception as e:
        print(f"      [ERROR] Failed to reset schema: {e}")
        return 1
    
    # Step 2: Recreate all tables
    print("\n[2/4] Recreating all tables...")
    try:
        SQLModel.metadata.create_all(engine)
        print("      [+] Tables created")
    except Exception as e:
        print(f"      [ERROR] Failed to create tables: {e}")
        return 1
    
    # Step 3: Create system admin
    print("\n[3/4] Creating system admin account...")
    try:
        SYSTEM_ADMIN_EMAIL = "talentgraph.interviews@gmail.com"
        SYSTEM_ADMIN_PASSWORD = "Kutty_1304"
        SYSTEM_ADMIN_NAME = "TalentGraph System Admin"
        
        with Session(engine) as session:
            system_admin = User(
                email=SYSTEM_ADMIN_EMAIL,
                full_name=SYSTEM_ADMIN_NAME,
                password_hash=hash_password(SYSTEM_ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                is_active=True
            )
            session.add(system_admin)
            session.commit()
            session.refresh(system_admin)
            
            print(f"      [+] System admin created (ID: {system_admin.id})")
            print(f"          Email: {SYSTEM_ADMIN_EMAIL}")
    except Exception as e:
        print(f"      [ERROR] Failed to create system admin: {e}")
        return 1
    
    # Step 4: Reseed test data
    print("\n[4/4] Reseeding test data...")
    try:
        # Change to scripts directory to run seed script
        original_dir = os.getcwd()
        script_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(script_dir)
        
        # Import and run seed script's main function
        sys.path.insert(0, os.path.join(script_dir, 'scripts', 'test_data'))
        
        # Suppress emoji output by redirecting stdout temporarily
        import io
        from contextlib import redirect_stdout, redirect_stderr
        
        # Capture output but print without emojis
        f = io.StringIO()
        with redirect_stdout(f), redirect_stderr(io.StringIO()):
            import seed_data_v2
            result = seed_data_v2.main()
        
        # Print a summary (the actual output has emojis that cause issues)
        print("      [+] Test data seeded successfully")
        print("          - Candidates created")
        print("          - Companies and users created")
        print("          - Job postings created")
        
        os.chdir(original_dir)
        
    except Exception as e:
        print(f"      [ERROR] Failed to seed test data: {e}")
        import traceback
        traceback.print_exc()
        os.chdir(original_dir)
        return 1
    
    # Final verification
    print("\n" + "="*80)
    print("VERIFICATION")
    print("="*80)
    
    try:
        with Session(engine) as session:
            admins = session.exec(select(User).where(User.role == UserRole.ADMIN)).all()
            recruiters = session.exec(select(User).where(User.role == UserRole.RECRUITER)).all()
            hrs = session.exec(select(User).where(User.role == UserRole.HR)).all()
            candidates = session.exec(select(User).where(User.role == UserRole.CANDIDATE)).all()
            
            print(f"\nADMIN accounts: {len(admins)}")
            for admin in admins:
                print(f"  >> {admin.email} | {admin.full_name}")
            
            print(f"\nRECRUITER accounts: {len(recruiters)}")
            print(f"HR accounts: {len(hrs)}")
            print(f"CANDIDATE accounts: {len(candidates)}")
            
            # Check for any admin.* emails
            old_admins = session.exec(select(User).where(User.email.like('admin.%'))).all()
            if old_admins:
                print(f"\n[WARNING] Found {len(old_admins)} old admin.* emails still in database!")
                for user in old_admins:
                    print(f"  >> {user.email}")
            else:
                print("\n[SUCCESS] No old admin.* emails found!")
    except Exception as e:
        print(f"[ERROR] Verification failed: {e}")
    
    print("\n" + "="*80)
    print("COMPLETE!")
    print("="*80)
    print("\nNext steps:")
    print("  1. Start backend: uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload")
    print("  2. Test login: talentgraph.interviews@gmail.com / Kutty_1304")
    print("="*80 + "\n")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
