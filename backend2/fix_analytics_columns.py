"""
Fix Analytics Rollup Daily Columns
Adds missing columns to analytics_rollup_daily table if they don't exist
"""

import os
import sys
from sqlalchemy import text

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine

def fix_analytics_columns():
    """Add missing columns to analytics_rollup_daily table"""
    
    with engine.connect() as conn:
        print("🔍 Checking analytics_rollup_daily table structure...")
        
        # Check if columns exist
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'analytics_rollup_daily'
            ORDER BY ordinal_position;
        """))
        
        existing_columns = [row[0] for row in result]
        print(f"📋 Existing columns: {', '.join(existing_columns)}")
        
        # Add missing columns
        migrations = []
        
        required_columns = [
            'jobs_viewed',
            'jobs_liked',
            'applications_submitted',
            'applications_viewed',
            'messages_sent',
            'emails_sent',
            'emails_opened'
        ]
        
        for column in required_columns:
            if column not in existing_columns:
                migrations.append(f"ALTER TABLE analytics_rollup_daily ADD COLUMN {column} INTEGER DEFAULT 0;")
        
        if not migrations:
            print("✅ All required columns already exist!")
            return
        
        print(f"\n🔧 Applying {len(migrations)} migration(s)...")
        
        for migration in migrations:
            print(f"  - {migration}")
            conn.execute(text(migration))
        
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
        # Show updated structure
        result = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'analytics_rollup_daily'
            ORDER BY ordinal_position;
        """))
        
        print("\n📋 Updated table structure:")
        for row in result:
            print(f"  - {row[0]}: {row[1]}")

if __name__ == "__main__":
    try:
        fix_analytics_columns()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
