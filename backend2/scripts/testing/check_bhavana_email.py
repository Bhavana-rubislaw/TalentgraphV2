"""
Check for Bhavana's email address in the database
"""

import logging
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import engine
from sqlmodel import Session, select
from app.models import User, Company

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_bhavana():
    """Check for Bhavana's account"""
    
    with Session(engine) as session:
        logger.info("=" * 80)
        logger.info("SEARCHING FOR BHAVANA'S ACCOUNT")
        logger.info("=" * 80)
        
        # Search for users with 'bhavana' in the email
        users = session.exec(
            select(User).where(User.email.contains("bhavana"))
        ).all()
        
        logger.info(f"\nUsers with 'bhavana' in email: {len(users)}")
        for user in users:
            logger.info(f"\n  User ID: {user.id}")
            logger.info(f"  Email: {user.email}")
            logger.info(f"  Role: {user.role}")
            
            # Find companies for this user
            companies = session.exec(
                select(Company).where(Company.user_id == user.id)
            ).all()
            
            logger.info(f"  Companies ({len(companies)}):")
            for company in companies:
                logger.info(f"    - ID: {company.id}, Name: {company.company_name}, Role: {company.employee_type}")
        
        if not users:
            logger.info("\n❌ No users found with 'bhavana' in email")
            
            # Search more broadly
            logger.info("\nSearching for users with 'rubislaw' in email:")
            rubislaw_users = session.exec(
                select(User).where(User.email.contains("rubislaw"))
            ).all()
            
            for user in rubislaw_users:
                logger.info(f"  - {user.email} (ID: {user.id}, Role: {user.role})")
        
        # Also check all users
        logger.info("\n" + "=" * 80)
        logger.info("ALL USERS IN SYSTEM:")
        logger.info("=" * 80)
        
        all_users = session.exec(select(User)).all()
        logger.info(f"Total users: {len(all_users)}\n")
        
        for user in all_users:
            logger.info(f"  {user.email} (ID: {user.id}, Role: {user.role})")

if __name__ == "__main__":
    check_bhavana()
