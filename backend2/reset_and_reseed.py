#!/usr/bin/env python3
"""Complete database reset and reseed with corrected admin structure."""

import subprocess
import sys
import os

def run_command(description, command):
    """Run a command and report results."""
    print(f"\n{'='*80}")
    print(f"🔧 {description}")
    print(f"{'='*80}")
    print(f"Command: {command}\n")
    
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    
    if result.stdout:
        print(result.stdout)
    if result.stderr and result.returncode != 0:
        print(f"⚠️ Error: {result.stderr}")
        return False
    
    if result.returncode == 0:
        print(f"✅ {description} - SUCCESS")
    else:
        print(f"❌ {description} - FAILED (exit code: {result.returncode})")
        return False
    
    return True

def main():
    print("\n" + "="*80)
    print("🔄 COMPLETE DATABASE RESET & RESEED")
    print("="*80)
    print("\nThis will:")
    print("  1. Drop and recreate the database schema")
    print("  2. Recreate all tables from models")
    print("  3. Create the system admin account (talentgraph.interviews@gmail.com)")
    print("  4. Seed test data with recruiter2.* emails (no admin.* accounts)")
    print("\n" + "="*80)
    
    # Step 1: Drop and recreate schema using Python
    print(f"\n{'='*80}")
    print("🔧 Step 1: Drop and recreate schema")
    print(f"{'='*80}\n")
    
    try:
        from sqlalchemy import text
        from app.database import engine
        
        with engine.connect() as conn:
            conn.execute(text('DROP SCHEMA public CASCADE'))
            conn.execute(text('CREATE SCHEMA public'))
            conn.commit()
        print("✅ Step 1: Drop and recreate schema - SUCCESS")
    except Exception as e:
        print(f"❌ Failed to reset schema: {e}")
        return 1
    
    # Step 2: Recreate all tables
    if not run_command(
        "Step 2: Recreate all tables from models",
        'python -c "from app.database import engine; from app.models import *; from sqlmodel import SQLModel; SQLModel.metadata.create_all(engine); print(\\"Tables created\\")"'
    ):
        print("\n❌ Failed to create tables.")
        return 1
    
    # Step 3: Create system admin
    if not run_command(
        "Step 3: Create system admin account",
        "python create_system_admin_email.py"
    ):
        print("\n❌ Failed to create system admin.")
        return 1
    
    # Step 4: Reseed test data
    if not run_command(
        "Step 4: Reseed test data with corrected emails",
        r"python scripts\test_data\seed_data_v2.py"
    ):
        print("\n❌ Failed to seed test data.")
        return 1
    
    # Final verification
    print("\n" + "="*80)
    print("🎉 DATABASE RESET COMPLETE!")
    print("="*80)
    print("\nVerifying admin accounts...")
    
    run_command(
        "Verification: List all admins",
        'python -c "from app.database import engine; from app.models import User, UserRole; from sqlmodel import Session, select; session = Session(engine); admins = session.exec(select(User).where(User.role == UserRole.ADMIN)).all(); print(f\\"\\\\nTotal ADMIN accounts: {len(admins)}\\"); [print(f\\"  >> {a.email} | {a.full_name}\\") for a in admins]"'
    )
    
    print("\n" + "="*80)
    print("📋 NEXT STEPS:")
    print("="*80)
    print("  1. Start backend: uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload")
    print("  2. Start frontend: cd frontend2 && npm run dev -- --port 3002")
    print("  3. Test admin login: talentgraph.interviews@gmail.com / Kutty_1304")
    print("  4. Test recruiter: recruiter2.lisa@globalsystems.com / Kutty_1304")
    print("="*80 + "\n")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
