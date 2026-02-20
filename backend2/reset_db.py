"""Reset database - drop and recreate all tables"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlmodel import SQLModel
from app.database import engine
from app.models import *

print("Dropping all tables...")
SQLModel.metadata.drop_all(engine)
print("Recreating all tables...")
SQLModel.metadata.create_all(engine)
print("✅ Database reset complete!")
