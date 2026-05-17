"""
Create System Administrator User
Creates the main admin account for TalentGraph platform
"""

from sqlmodel import Session, select
from app.database import engine
from app.models import User, UserRole
from app.security import hash_password

def create_system_admin():
    """
    Create the system administrator account
    Email: talentgraph.interviews@gmail.com
    Password: Kutty_!304
    """
    
    admin_email = "talentgraph.interviews@gmail.com"
    admin_password = "Kutty_!304"
    
    with Session(engine) as session:
        # Check if admin already exists
        statement = select(User).where(User.email == admin_email)
        existing_admin = session.exec(statement).first()
        
        if existing_admin:
            print(f"⚠️  Admin user already exists!")
            print(f"   Email: {existing_admin.email}")
            print(f"   Name: {existing_admin.full_name}")
            print(f"   Role: {existing_admin.role}")
            print(f"   User ID: {existing_admin.id}")
            print()
            
            # Ask if they want to update the password
            response = input("Do you want to update the password? (yes/no): ").strip().lower()
            if response == 'yes':
                # Update password
                existing_admin.password_hash = hash_password(admin_password)
                session.add(existing_admin)
                session.commit()
                print(f"✓ Password updated for admin user: {admin_email}")
            else:
                print("No changes made.")
            return
        
        # Create new admin user
        print("================================================================================")
        print("CREATING SYSTEM ADMINISTRATOR")
        print("================================================================================")
        print(f"Email: {admin_email}")
        print(f"Role: ADMIN")
        print()
        
        # Hash the password
        hashed_password = hash_password(admin_password)
        
        # Create admin user
        admin_user = User(
            email=admin_email,
            full_name="TalentGraph System Admin",
            password_hash=hashed_password,
            role=UserRole.ADMIN,
            is_active=True
        )
        
        session.add(admin_user)
        session.commit()
        session.refresh(admin_user)
        
        print("================================================================================")
        print("✓ SYSTEM ADMIN CREATED SUCCESSFULLY")
        print("================================================================================")
        print(f"User ID: {admin_user.id}")
        print(f"Email: {admin_user.email}")
        print(f"Name: {admin_user.full_name}")
        print(f"Role: {admin_user.role}")
        print(f"Active: {admin_user.is_active}")
        print()
        print("🔐 Login Credentials:")
        print(f"   Email: {admin_email}")
        print(f"   Password: {admin_password}")
        print("================================================================================")


def verify_admin():
    """Verify the admin user exists and display details"""
    admin_email = "talentgraph.interviews@gmail.com"
    
    with Session(engine) as session:
        statement = select(User).where(User.email == admin_email)
        admin = session.exec(statement).first()
        
        if admin:
            print("\n✓ System Admin Verified:")
            print(f"  User ID: {admin.id}")
            print(f"  Email: {admin.email}")
            print(f"  Name: {admin.full_name}")
            print(f"  Role: {admin.role}")
            print(f"  Active: {admin.is_active}")
        else:
            print("\n✗ Admin user not found!")


if __name__ == "__main__":
    create_system_admin()
    verify_admin()
