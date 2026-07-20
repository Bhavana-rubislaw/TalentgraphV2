"""
Upsert the system admin user. Credentials are resolved from
SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (see app/core/seed_credentials.py).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlmodel import Session, select
from app.database import engine
from app.models import User, UserRole
from app.security import hash_password
from app.core.seed_credentials import get_seed_admin_credentials

TARGET_EMAIL, TARGET_PASSWORD, TARGET_NAME = get_seed_admin_credentials()

with Session(engine) as session:
    user = session.exec(select(User).where(User.email == TARGET_EMAIL)).first()

    if user:
        user.password_hash = hash_password(TARGET_PASSWORD)
        user.role = UserRole.ADMIN
        user.is_active = True
        session.add(user)
        session.commit()
        print(f"✅ Updated existing user → admin  |  {TARGET_EMAIL}")
        print(f"   User ID : {user.id}")
        print(f"   Role    : {user.role}")
    else:
        new_admin = User(
            email=TARGET_EMAIL,
            full_name=TARGET_NAME,
            password_hash=hash_password(TARGET_PASSWORD),
            role=UserRole.ADMIN,
            is_active=True,
        )
        session.add(new_admin)
        session.commit()
        session.refresh(new_admin)
        print(f"✅ Created new admin user  |  {TARGET_EMAIL}")
        print(f"   User ID : {new_admin.id}")
        print(f"   Role    : {new_admin.role}")

    print("\nDone. You can now log in to the admin portal with:")
    print(f"  Email   : {TARGET_EMAIL}")
    print(f"  Password: {TARGET_PASSWORD}")
