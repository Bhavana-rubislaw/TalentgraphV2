"""
Database migration: Add read_at and sender_role to Message table
================================================================

This migration adds support for read receipts with timestamps to the chat system.

New fields:
- message.sender_role (str, nullable) - Role of message sender
- message.read_at (datetime, nullable) - When message was read

Run this migration after updating the models.py file.
"""

import os
import sys
from datetime import datetime
from sqlalchemy import text

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine


def migrate():
    """Add new fields to message table."""
    print("🔄 Starting migration: Add read receipts to chat system")
    
    with engine.begin() as conn:
        # Check if columns already exist
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'message' 
            AND column_name IN ('sender_role', 'read_at')
        """))
        existing_columns = {row[0] for row in result}
        
        # Add sender_role if it doesn't exist
        if 'sender_role' not in existing_columns:
            print("  ➕ Adding message.sender_role column...")
            conn.execute(text("""
                ALTER TABLE message 
                ADD COLUMN sender_role VARCHAR(50)
            """))
            print("  ✅ Added sender_role")
        else:
            print("  ⏭️  sender_role already exists")
        
        # Add read_at if it doesn't exist
        if 'read_at' not in existing_columns:
            print("  ➕ Adding message.read_at column...")
            conn.execute(text("""
                ALTER TABLE message 
                ADD COLUMN read_at TIMESTAMP
            """))
            print("  ✅ Added read_at")
            
            # Backfill read_at for messages that are already marked as read
            print("  🔄 Backfilling read_at for previously read messages...")
            result = conn.execute(text("""
                UPDATE message 
                SET read_at = created_at 
                WHERE is_read = TRUE AND read_at IS NULL
            """))
            print(f"  ✅ Backfilled {result.rowcount} messages")
        else:
            print("  ⏭️  read_at already exists")
        
        # Backfill sender_role from user table
        if 'sender_role' not in existing_columns or True:  # Always try to backfill
            print("  🔄 Backfilling sender_role from user records...")
            result = conn.execute(text("""
                UPDATE message m
                SET sender_role = u.role
                FROM "user" u
                WHERE m.sender_user_id = u.id
                AND m.sender_role IS NULL
            """))
            print(f"  ✅ Backfilled sender_role for {result.rowcount} messages")
    
    print("✅ Migration completed successfully!")
    print("\n📋 Next steps:")
    print("   1. Restart your FastAPI backend")
    print("   2. Test the chat functionality")
    print("   3. Verify read receipts appear correctly")


if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)
