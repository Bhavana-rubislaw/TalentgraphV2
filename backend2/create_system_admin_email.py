"""
Create System Admin Account
============================
Creates the single system admin user with email: talentgraph.interviews@gmail.com
This is the only ADMIN role user in the system.

Run this after database initialization:
    cd backend2
    .\\venv\\Scripts\\Activate.ps1
    python create_system_admin_email.py
"""

from sqlmodel import Session, select
from app.database import engine
from app.models import User, UserRole
from app.security import hash_password

SYSTEM_ADMIN_EMAIL = "talentgraph.interviews@gmail.com"
SYSTEM_ADMIN_PASSWORD = "Kutty_1304"
SYSTEM_ADMIN_NAME = "TalentGraph System Admin"


def create_system_admin():
    """Create or update the system admin account"""
    with Session(engine) as session:
        # Check if system admin already exists
        existing_admin = session.exec(
            select(User).where(User.email == SYSTEM_ADMIN_EMAIL)
        ).first()
        
        if existing_admin:
            print(f"[+] System admin already exists: {SYSTEM_ADMIN_EMAIL}")
            print(f"   Role: {existing_admin.role}")
            print(f"   Active: {existing_admin.is_active}")
            
            # Update to ensure it's set correctly
            existing_admin.role = UserRole.ADMIN
            existing_admin.full_name = SYSTEM_ADMIN_NAME
            existing_admin.is_active = True
            existing_admin.password_hash = hash_password(SYSTEM_ADMIN_PASSWORD)
            session.add(existing_admin)
            session.commit()
            print("   Updated system admin settings")
        else:
            # Create new system admin
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
            
            print(f"[+] System admin created successfully!")
            print(f"   Email: {SYSTEM_ADMIN_EMAIL}")
            print(f"   Password: {SYSTEM_ADMIN_PASSWORD}")
            print(f"   Role: {system_admin.role}")
            print(f"   User ID: {system_admin.id}")


if __name__ == "__main__":
    print("[*] Creating System Admin Account...")
    print("=" * 50)
    create_system_admin()
    print("=" * 50)
    print("[+] Done!")
