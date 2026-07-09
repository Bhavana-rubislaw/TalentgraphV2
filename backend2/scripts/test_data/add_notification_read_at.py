"""
Migration script: Add read_at column to Notification table
=============================================================
Run this script to add the read_at timestamp column to existing notification table.

Usage:
    python backend2/add_notification_read_at.py
"""

import sys
from pathlib import Path

# Add backend2 directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from app.database import engine
from sqlmodel import Session

def migrate():
    """Add read_at column to notification table."""
    
    with Session(engine) as session:
        try:
            # Check if column already exists
            result = session.exec(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='notification' AND column_name='read_at';
            """))
            
            if result.first():
                print("✅ Column 'read_at' already exists in notification table")
                return
            
            # Add the column
            print("🔧 Adding read_at column to notification table...")
            session.exec(text("""
                ALTER TABLE notification 
                ADD COLUMN read_at TIMESTAMP DEFAULT NULL;
            """))
            session.commit()
            print("✅ Successfully added read_at column to notification table")
            
            # Update existing read notifications to set read_at
            print("🔧 Setting read_at for existing read notifications...")
            session.exec(text("""
                UPDATE notification 
                SET read_at = created_at 
                WHERE is_read = true AND read_at IS NULL;
            """))
            session.commit()
            print("✅ Updated existing read notifications")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            session.rollback()
            raise

if __name__ == "__main__":
    print("=" * 60)
    print("Notification Table Migration - Add read_at column")
    print("=" * 60)
    migrate()
    print("\n✅ Migration completed successfully!")
