"""
Migration script to add notes_updated_at column to application table
"""
from sqlmodel import Session, text
from app.database import engine

def migrate():
    """Add notes_updated_at column to application table"""
    
    with Session(engine) as session:
        try:
            # Add notes_updated_at column
            session.exec(text("""
                ALTER TABLE application 
                ADD COLUMN IF NOT EXISTS notes_updated_at TIMESTAMP
            """))
            session.commit()
            print("✓ Successfully added notes_updated_at column to application table")
        except Exception as e:
            print(f"Error during migration: {e}")
            session.rollback()
            raise

if __name__ == "__main__":
    migrate()
    print("Migration completed!")
