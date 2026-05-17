"""
Migration Script: Update email addresses from admin.* to recruiter.*
For users that were converted from admin to recruiter role
"""

from sqlmodel import Session, select
from app.database import engine
from app.models import Company, User, UserRole

def update_recruiter_emails():
    """Update email addresses for recruiters that have admin.* emails"""
    
    with Session(engine) as session:
        # Get all recruiter users with admin.* email addresses
        recruiters = session.exec(
            select(User).where(User.role == UserRole.RECRUITER)
        ).all()
        
        # Filter those with admin.* emails
        admin_email_recruiters = [
            user for user in recruiters 
            if user.email.startswith('admin.')
        ]
        
        if not admin_email_recruiters:
            print("No recruiter users found with 'admin.*' email addresses.")
            return
        
        print("\n" + "="*80)
        print(f"UPDATING EMAIL ADDRESSES FOR {len(admin_email_recruiters)} RECRUITERS")
        print("="*80 + "\n")
        
        updated_users = 0
        updated_companies = 0
        
        for user in admin_email_recruiters:
            old_email = user.email
            # Replace admin. with recruiter.
            new_email = old_email.replace('admin.', 'recruiter.', 1)
            
            print(f"User: {user.full_name} (ID: {user.id})")
            print(f"  Old Email: {old_email}")
            print(f"  New Email: {new_email}")
            
            # Update user email
            user.email = new_email
            session.add(user)
            updated_users += 1
            print(f"  ✓ User email updated")
            
            # Find and update associated company email
            company = session.exec(
                select(Company).where(Company.user_id == user.id)
            ).first()
            
            if company:
                old_company_email = company.company_email
                # Replace admin. with recruiter. in company email too
                new_company_email = old_company_email.replace('admin.', 'recruiter.', 1)
                
                print(f"  Company: {company.company_name or '(No name)'}")
                print(f"    Old Company Email: {old_company_email}")
                print(f"    New Company Email: {new_company_email}")
                
                company.company_email = new_company_email
                session.add(company)
                updated_companies += 1
                print(f"    ✓ Company email updated")
            else:
                print(f"  ⚠ No company found for this user")
            
            print()
        
        # Commit all changes
        session.commit()
        
        print("="*80)
        print("EMAIL UPDATE COMPLETED SUCCESSFULLY")
        print("="*80)
        print(f"✓ Updated {updated_users} user emails")
        print(f"✓ Updated {updated_companies} company emails")
        print("="*80 + "\n")
        
        # Verify the changes
        print("\nVerifying changes...")
        remaining_admin_emails = session.exec(
            select(User).where(
                User.role == UserRole.RECRUITER,
                User.email.like('admin.%')
            )
        ).all()
        
        if remaining_admin_emails:
            print(f"⚠ WARNING: {len(remaining_admin_emails)} recruiter users still have admin.* emails:")
            for user in remaining_admin_emails:
                print(f"  - {user.full_name} ({user.email})")
        else:
            print("✓ All recruiter users now have appropriate email addresses")
        
        print("\n")


def show_recruiter_emails():
    """Display all recruiter emails"""
    
    with Session(engine) as session:
        print("\n" + "="*80)
        print("ALL RECRUITER EMAIL ADDRESSES")
        print("="*80 + "\n")
        
        recruiters = session.exec(
            select(User).where(User.role == UserRole.RECRUITER).order_by(User.email)
        ).all()
        
        for idx, user in enumerate(recruiters, 1):
            company = session.exec(
                select(Company).where(Company.user_id == user.id)
            ).first()
            
            company_info = f" ({company.company_name})" if company else ""
            print(f"{idx}. {user.full_name}{company_info}")
            print(f"   User Email: {user.email}")
            if company:
                print(f"   Company Email: {company.company_email}")
            print()
        
        print(f"Total: {len(recruiters)} recruiters")
        print("="*80 + "\n")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("EMAIL UPDATE TOOL - ADMIN TO RECRUITER EMAILS")
    print("="*80)
    
    # Show current state before update
    print("\n📊 BEFORE UPDATE:")
    show_recruiter_emails()
    
    # Confirm update
    print("\n⚠️  This will change all 'admin.*' emails to 'recruiter.*' for recruiter users.")
    print("This action will modify the database.")
    confirm = input("\nDo you want to proceed? (yes/no): ").strip().lower()
    
    if confirm == 'yes':
        # Perform email update
        update_recruiter_emails()
        
        # Show state after update
        print("\n📊 AFTER UPDATE:")
        show_recruiter_emails()
    else:
        print("\n❌ Email update cancelled by user.\n")
