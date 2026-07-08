"""
Database configuration for TalentGraph V2
PostgreSQL with SQLModel ORM
"""

import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlmodel import SQLModel, Session

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# PostgreSQL connection from environment variables
# Format: postgresql://user:password@host:port/database
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/talentgraph_v2"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Test connections for liveness
    pool_size=int(os.getenv("DB_POOL_SIZE", "10")),      # Override via env for production scaling
    max_overflow=int(os.getenv("DB_POOL_OVERFLOW", "20")),  # Burst capacity beyond pool_size
    echo=os.getenv("DB_ECHO", "false").lower() == "true"  # Enable SQL logging via DB_ECHO=true
)


def init_db():
    """Initialize database - create all tables"""
    # Import all models so they're registered
    from app.models import (
        User, Candidate, Resume, Certification, Skill, JobProfile,
        Company, JobPosting, Swipe, Match, Application,
        Conversation, Message
    )
    
    SQLModel.metadata.create_all(engine)
    logger.info("[OK] Database initialized successfully!")


def get_session():
    """Dependency for FastAPI - get database session"""
    with Session(engine) as session:
        yield session
