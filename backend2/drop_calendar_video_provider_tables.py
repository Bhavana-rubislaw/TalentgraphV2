"""
Drop Calendar & Video Provider Account Tables
===============================================

Removes calendar_account and video_provider_account — the per-user
calendar OAuth and Zoom/Teams/Meet API-key tables. Superseded by:
- Zoom auto-generation now uses one company-wide Server-to-Server OAuth
  app (ZOOM_ACCOUNT_ID/CLIENT_ID/CLIENT_SECRET in .env), not per-user
  stored credentials.
- Calendar sync (Google/Microsoft) settings UI and backend router were
  removed as unused complexity — both tables were empty in production.

Safe to run: both tables were verified empty before this migration was
written. If either has since gained real rows, back them up first.
"""

from sqlalchemy import text
from app.database import engine

def main():
    print("Dropping calendar_account and video_provider_account tables...")

    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS calendar_account"))
        conn.execute(text("DROP TABLE IF EXISTS video_provider_account"))

    print("Done.")

if __name__ == "__main__":
    main()
