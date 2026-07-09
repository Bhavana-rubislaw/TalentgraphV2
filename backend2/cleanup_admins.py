#!/usr/bin/env python3
"""Clean up incorrect admin accounts from database."""

from app.database import engine
from app.models import User, UserRole, Company, JobPosting, Application, Meeting, MeetingParticipant
from sqlmodel import Session, select
from sqlalchemy import text

def cleanup_admin_accounts():
    """Remove incorrect admin accounts, keep only system admin."""
    
    with Session(engine) as session:
        # List of emails that should NOT be admin
        wrong_admins = [
            'admin.emily@cloudtech.com',
            'admin.jennifer@techcorp.com',
            'admin.kevin@digitaltrans.com',
            'admin.lisa@globalsystems.com',
            'admin.rachel@oraclepartners.com',
            'admin.susan@enterprisesol.com',
            'bhavsbayya@gmail.com'
        ]
        
        print("\n🧹 Starting admin cleanup...")
        print("="*80)
        
        # Get all users with these emails
        users_to_delete = session.exec(
            select(User).where(User.email.in_(wrong_admins))
        ).all()
        
        if not users_to_delete:
            print("✅ No incorrect admin accounts found! Database is clean.")
            return
        
        print(f"\n📋 Found {len(users_to_delete)} accounts to remove:\n")
        for user in users_to_delete:
            print(f"   ❌ {user.email:45} | {user.role}")
        
        # Get user IDs
        user_ids = [user.id for user in users_to_delete]
        
        # Delete related data first (cascade manually)
        print("\n🗑️  Deleting related data...")
        
        # Get companies owned by these users
        companies = session.exec(
            select(Company).where(Company.user_id.in_(user_ids))
        ).all()
        
        if companies:
            company_ids = [c.id for c in companies]
            print(f"   📦 Found {len(companies)} companies to delete")
            
            # Delete job postings and their related data
            job_postings = session.exec(
                select(JobPosting).where(JobPosting.company_id.in_(company_ids))
            ).all()
            
            if job_postings:
                job_posting_ids = [jp.id for jp in job_postings]
                print(f"   📋 Found {len(job_postings)} job postings to delete")
                
                # Delete applications
                applications = session.exec(
                    select(Application).where(Application.job_posting_id.in_(job_posting_ids))
                ).all()
                for app in applications:
                    print(f"      🗑️  Deleting application {app.id}")
                    session.delete(app)
                
                # Delete job postings
                for jp in job_postings:
                    print(f"      🗑️  Deleting job posting ID: {jp.id}")
                    session.delete(jp)
            
            # Delete companies
            for company in companies:
                print(f"   🗑️  Deleting company: {company.company_name}")
                session.delete(company)
        
        # Now delete the users
        for user in users_to_delete:
            print(f"\n🗑️  Deleting user: {user.email}")
            session.delete(user)
        
        session.commit()
        print("\n" + "="*80)
        print(f"✅ Successfully removed {len(users_to_delete)} incorrect admin accounts!")
        print("="*80)
        
        # Verify remaining admins
        remaining_admins = session.exec(
            select(User).where(User.role == UserRole.ADMIN)
        ).all()
        
        print(f"\n📋 Remaining ADMIN accounts: {len(remaining_admins)}")
        for admin in remaining_admins:
            print(f"   ✅ {admin.email:45} | {admin.full_name}")
        
        if len(remaining_admins) == 1 and remaining_admins[0].email == 'talentgraph.interviews@gmail.com':
            print("\n🎉 Perfect! Only the system admin remains.")
        else:
            print("\n⚠️  Warning: Expected only talentgraph.interviews@gmail.com as admin!")

if __name__ == '__main__':
    cleanup_admin_accounts()
