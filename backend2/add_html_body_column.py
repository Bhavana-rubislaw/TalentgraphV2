"""
Add html_body column to email_delivery table
"""
from sqlmodel import Session, text
from app.database import engine

def migrate():
    with Session(engine) as session:
        try:
            # Add html_body column to email_delivery table
            session.exec(text("ALTER TABLE email_delivery ADD COLUMN IF NOT EXISTS html_body TEXT;"))
            session.commit()
            print("✅ Successfully added html_body column to email_delivery table")
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            session.rollback()

if __name__ == "__main__":
    migrate()
