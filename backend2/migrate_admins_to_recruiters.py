"""
Migration Script: Convert all Admin users to Recruiter users
This allows admins to authenticate as recruiters for sign in/sign up
"""

from sqlmodel import Session, select
from app.database import engine
from app.models import Company, User, UserRole

def migrate_admins_to_recruiters():
    """Convert all admin users and their companies to recruiter role"""
    
    with Session(engine) as session:
        # Get all admin users
        admin_users = session.exec(
            select(User).where(User.role == UserRole.ADMIN)
        ).all()
        
        if not admin_users:
            print("No admin users found to migrate.")
            return
        
        print("\n" + "="*80)
        print(f"MIGRATING {len(admin_users)} ADMIN USERS TO RECRUITER ROLE")
        print("="*80 + "\n")
        
        updated_users = 0
        updated_companies = 0
        
        for user in admin_users:
            print(f"Processing User: {user.full_name} ({user.email})")
            print(f"  Current Role: {user.role.value}")
            
            # Update user role to recruiter
            user.role = UserRole.RECRUITER
            session.add(user)
            updated_users += 1
            print(f"  ✓ Changed to: recruiter")
            
            # Find and update associated company
            company = session.exec(
                select(Company).where(Company.user_id == user.id)
            ).first()
            
            if company:
                print(f"  Company: {company.company_name or '(No name)'}")
                print(f"    Current Employee Type: {company.employee_type}")
                
                # Update company employee type
                company.employee_type = "Recruiter"
                session.add(company)
                updated_companies += 1
                print(f"    ✓ Changed to: Recruiter")
            else:
                print(f"  ⚠ No company found for this user")
            
            print()
        
        # Commit all changes
        session.commit()
        
        print("="*80)
        print("MIGRATION COMPLETED SUCCESSFULLY")
        print("="*80)
        print(f"✓ Updated {updated_users} users from admin to recruiter")
        print(f"✓ Updated {updated_companies} companies to Recruiter employee type")
        print("="*80 + "\n")
        
        # Verify the changes
        print("\nVerifying changes...")
        remaining_admins = session.exec(
            select(User).where(User.role == UserRole.ADMIN)
        ).all()
        
        if remaining_admins:
            print(f"⚠ WARNING: {len(remaining_admins)} admin users still exist:")
            for admin in remaining_admins:
                print(f"  - {admin.full_name} ({admin.email})")
        else:
            print("✓ All admin users successfully converted to recruiters")
        
        print("\n")


def show_current_state():
    """Display current state of users and companies"""
    
    with Session(engine) as session:
        print("\n" + "="*80)
        print("CURRENT STATE - USERS BY ROLE")
        print("="*80 + "\n")
        
        for role in [UserRole.ADMIN, UserRole.RECRUITER, UserRole.HR, UserRole.CANDIDATE]:
            users = session.exec(
                select(User).where(User.role == role).order_by(User.email)
            ).all()
            
            print(f"{role.value.upper()}: {len(users)} users")
            for user in users:
                company = session.exec(
                    select(Company).where(Company.user_id == user.id)
                ).first()
                company_name = f" - {company.company_name}" if company else ""
                print(f"  • {user.full_name} ({user.email}){company_name}")
            print()
        
        print("="*80 + "\n")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("ADMIN TO RECRUITER MIGRATION TOOL")
    print("="*80)
    
    # Show current state before migration
    print("\n📊 BEFORE MIGRATION:")
    show_current_state()
    
    # Confirm migration
    print("\n⚠️  This will convert ALL admin users to recruiter role.")
    print("This action will modify the database.")
    confirm = input("\nDo you want to proceed? (yes/no): ").strip().lower()
    
    if confirm == 'yes':
        # Perform migration
        migrate_admins_to_recruiters()
        
        # Show state after migration
        print("\n📊 AFTER MIGRATION:")
        show_current_state()
    else:
        print("\n❌ Migration cancelled by user.\n")
