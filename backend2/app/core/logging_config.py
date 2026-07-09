import json
import logging
import sys
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any, Dict, Optional

from sqlmodel import Session, select
from ..database import get_session
from ..models import SystemLog

class StructuredFormatter(logging.Formatter):
    """Custom formatter that outputs structured JSON logs"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add extra fields if available
        if hasattr(record, 'request_id'):
            log_entry['request_id'] = record.request_id
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = record.user_id
        if hasattr(record, 'action'):
            log_entry['action'] = record.action
        if hasattr(record, 'entity_type'):
            log_entry['entity_type'] = record.entity_type
        if hasattr(record, 'entity_id'):
            log_entry['entity_id'] = record.entity_id
        if hasattr(record, 'log_metadata'):
            log_entry['log_metadata'] = record.log_metadata
            
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
            
        return json.dumps(log_entry, ensure_ascii=False)

class DatabaseLogHandler(logging.Handler):
    """Custom handler that writes logs to database for persistence"""
    
    def __init__(self, level=logging.NOTSET):
        super().__init__(level)
        self.batch_size = 1  # Write immediately so admin portal shows logs in real-time
        self.batch = []
    
    def emit(self, record: logging.LogRecord):
        try:
            # Serialize log_metadata dict to JSON string for database storage
            log_metadata = getattr(record, 'log_metadata', None)
            if log_metadata and isinstance(log_metadata, dict):
                import json
                log_metadata = json.dumps(log_metadata)
            
            log_entry = {
                "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
                "module": record.module,
                "function": record.funcName,
                "line_number": record.lineno,
                "request_id": getattr(record, 'request_id', None),
                "user_id": getattr(record, 'user_id', None),
                "action": getattr(record, 'action', None),
                "entity_type": getattr(record, 'entity_type', None),
                "entity_id": getattr(record, 'entity_id', None),
                "log_metadata": log_metadata,
                "exception": self.format(record) if record.exc_info else None
            }
            
            self.batch.append(log_entry)
            
            if len(self.batch) >= self.batch_size:
                self.flush_batch()
                
        except Exception as e:
            logger.error(f"DatabaseLogHandler emit failed: {e}", exc_info=True)
            self.handleError(record)
    
    def flush_batch(self):
        if not self.batch:
            return
            
        try:
            with next(get_session()) as session:
                for entry in self.batch:
                    system_log = SystemLog(**entry)
                    session.add(system_log)
                session.commit()
            self.batch.clear()
        except Exception as e:
            print(f"Failed to write logs to database: {e}", file=sys.stderr)
            self.batch.clear()
    
    def close(self):
        self.flush_batch()
        super().close()

def setup_logging():
    """Configure comprehensive logging system"""
    
    # Create logs directory
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Clear existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Console handler with structured format
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_formatter = StructuredFormatter()
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # Rotating file handler
    file_handler = RotatingFileHandler(
        logs_dir / "talentgraph_v2.log",
        maxBytes=50 * 1024 * 1024,  # 50MB
        backupCount=10
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(console_formatter)
    root_logger.addHandler(file_handler)
    
    # Database handler for persistence
    db_handler = DatabaseLogHandler()
    db_handler.setLevel(logging.INFO)  # INFO and above to DB so admin portal shows all logs
    root_logger.addHandler(db_handler)
    
    # Specific loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    return root_logger

def get_logger(name: str) -> logging.Logger:
    """Get a logger with the structured formatter"""
    return logging.getLogger(name)

def log_change(
    logger: logging.Logger,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    user_id: Optional[str] = None,
    request_id: Optional[str] = None,
    log_metadata: Optional[Dict[str, Any]] = None,
    message: Optional[str] = None
):
    """Structured logging for changes"""
    
    log_message = message or f"{action} on {entity_type}"
    
    logger.info(
        log_message,
        extra={
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "user_id": user_id,
            "request_id": request_id,
            "log_metadata": log_metadata
        }
    )