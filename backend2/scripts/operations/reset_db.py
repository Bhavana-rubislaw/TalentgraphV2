"""Reset database schema only — drops and recreates all tables, no reseed.
For a full reset that also creates the system admin and reseeds test data,
use reset_and_reseed.py or reset_db_clean.py instead.

Run from backend2/ directory:
    python scripts/operations/reset_db.py
"""
import sys
from pathlib import Path
# sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlmodel import SQLModel
from app.database import engine
from app.models import *

print("Dropping all tables...")
SQLModel.metadata.drop_all(engine)
print("Recreating all tables...")
SQLModel.metadata.create_all(engine)
print("✅ Database reset complete!")
