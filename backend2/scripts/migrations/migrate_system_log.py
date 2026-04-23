"""
Database migration script for SystemLog table
Creates the system_log table for comprehensive logging
"""

import logging
from sqlalchemy import text
from app.database import engine
from sqlmodel import Session

logger = logging.getLogger(__name__)

def create_system_log_table():
    """Create the systemlog table for comprehensive logging"""
    
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS systemlog (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        level VARCHAR(20) NOT NULL,
        logger VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        module VARCHAR(255) NOT NULL,
        function VARCHAR(255) NOT NULL,
        line_number INTEGER NOT NULL,
        request_id VARCHAR(36),
        user_id INTEGER,
        action VARCHAR(100),
        entity_type VARCHAR(100),
        entity_id VARCHAR(255),
        log_metadata TEXT,
        exception TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """
    
    # Create indexes for performance
    create_indexes_sql = [
        "CREATE INDEX IF NOT EXISTS idx_systemlog_timestamp ON systemlog(timestamp);",
        "CREATE INDEX IF NOT EXISTS idx_systemlog_level ON systemlog(level);",
        "CREATE INDEX IF NOT EXISTS idx_systemlog_request_id ON systemlog(request_id);",
        "CREATE INDEX IF NOT EXISTS idx_systemlog_user_id ON systemlog(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_systemlog_action ON systemlog(action);",
        "CREATE INDEX IF NOT EXISTS idx_systemlog_entity_type ON systemlog(entity_type);",
        "CREATE INDEX IF NOT EXISTS idx_systemlog_module ON systemlog(module);",
        "CREATE INDEX IF NOT EXISTS idx_systemlog_created_at ON systemlog(created_at);"
    ]
    
    try:
        with Session(engine) as session:
            # Create table
            session.exec(text(create_table_sql))
            logger.info("SystemLog table created successfully")
            
            # Create indexes
            for index_sql in create_indexes_sql:
                session.exec(text(index_sql))
            
            logger.info("SystemLog indexes created successfully")
            
            session.commit()
            
        return True
        
    except Exception as e:
        logger.error(f"Failed to create SystemLog table: {e}")
        return False

def add_log_retention_function():
    """Add a PostgreSQL function for automatic log cleanup"""
    
    function_sql = """
    CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 30)
    RETURNS INTEGER AS $$
    DECLARE
        deleted_count INTEGER;
    BEGIN
        DELETE FROM systemlog 
        WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        RETURN deleted_count;
    END;
    $$ LANGUAGE plpgsql;
    """
    
    try:
        with Session(engine) as session:
            session.exec(text(function_sql))
            session.commit()
            logger.info("Log retention function created successfully")
            return True
            
    except Exception as e:
        logger.error(f"Failed to create log retention function: {e}")
        return False

def run_migration():
    """Run the complete migration"""
    
    logger.info("Starting SystemLog migration...")
    
    # Create table and indexes
    if not create_system_log_table():
        logger.error("Migration failed: Could not create SystemLog table")
        return False
    
    # Add retention function
    if not add_log_retention_function():
        logger.warning("Migration warning: Could not create log retention function")
    
    logger.info("SystemLog migration completed successfully")
    return True

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Run migration
    success = run_migration()
    
    if success:
        print("✅ SystemLog migration completed successfully")
    else:
        print("❌ SystemLog migration failed")
        exit(1)