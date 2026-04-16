"""
Logging API endpoints for comprehensive system monitoring
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, Field
from sqlmodel import Session, select, and_, or_

from ..database import get_session
from ..models import SystemLog, User
from ..core.logging_config import get_logger, log_change
from ..security import get_current_user

router = APIRouter(prefix="/api/logs", tags=["Logs"])
logger = get_logger(__name__)


# ============ SCHEMAS ============

class FrontendLogEntry(BaseModel):
    """Frontend log entry schema"""
    timestamp: str
    level: str = Field(pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    source: str = "frontend"
    message: str
    module: str
    action: Optional[str] = None
    entityType: Optional[str] = None
    entityId: Optional[str] = None
    userId: Optional[str] = None
    sessionId: str
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, str]] = None


class FrontendLogBatch(BaseModel):
    """Batch of frontend logs"""
    logs: List[FrontendLogEntry]
    timestamp: str


class LogQueryParams(BaseModel):
    """Parameters for querying logs"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    level: Optional[str] = None
    module: Optional[str] = None
    user_id: Optional[int] = None
    request_id: Optional[str] = None
    action: Optional[str] = None
    entity_type: Optional[str] = None
    search: Optional[str] = None
    limit: int = Field(default=100, le=1000)
    offset: int = Field(default=0, ge=0)


class LogResponse(BaseModel):
    """Response schema for log queries"""
    logs: List[Dict[str, Any]]
    total: int
    limit: int
    offset: int
    has_more: bool


class LogStats(BaseModel):
    """Log statistics"""
    total_logs: int
    by_level: Dict[str, int]
    by_module: Dict[str, int]
    error_rate: float
    recent_errors: int
    last_24h: int


# ============ ENDPOINTS ============

@router.post("/frontend", status_code=201)
async def receive_frontend_logs(
    log_batch: FrontendLogBatch,
    request: Request,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    """
    Receive and store frontend logs
    Accepts batched logs from frontend logging service
    """
    
    request_id = getattr(request.state, 'request_id', None)
    
    logger.info(
        f"Received {len(log_batch.logs)} frontend logs",
        extra={
            "action": "receive_logs",
            "entity_type": "frontend_logs",
            "request_id": request_id,
            "metadata": {"batch_size": len(log_batch.logs)}
        }
    )
    
    # Process logs in background to avoid blocking the response
    background_tasks.add_task(
        process_frontend_logs,
        log_batch.logs,
        request_id,
        session
    )
    
    return {"status": "accepted", "count": len(log_batch.logs)}


async def process_frontend_logs(
    logs: List[FrontendLogEntry],
    request_id: Optional[str],
    session: Session
):
    """Background task to process and store frontend logs"""
    
    try:
        for log_entry in logs:
            # Convert frontend log to system log
            system_log = SystemLog(
                timestamp=datetime.fromisoformat(log_entry.timestamp.replace('Z', '+00:00')),
                level=log_entry.level,
                logger=f"frontend.{log_entry.module}",
                message=log_entry.message,
                module=log_entry.module,
                function="",  # Not available from frontend
                line_number=0,  # Not available from frontend
                request_id=request_id,
                user_id=int(log_entry.userId) if log_entry.userId else None,
                action=log_entry.action,
                entity_type=log_entry.entityType,
                entity_id=log_entry.entityId,
                log_metadata=str(log_entry.metadata) if log_entry.metadata else None,
                exception=str(log_entry.error) if log_entry.error else None
            )
            
            session.add(system_log)
        
        session.commit()
        logger.info(f"Successfully stored {len(logs)} frontend logs")
        
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to store frontend logs: {e}")


@router.get("/", response_model=LogResponse)
async def get_logs(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    level: Optional[str] = None,
    module: Optional[str] = None,
    user_id: Optional[int] = None,
    request_id: Optional[str] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Query system logs with filters
    Requires admin role for access
    """
    
    # Only admins can access logs
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build query with filters
    query = select(SystemLog)
    conditions = []
    
    if start_date:
        conditions.append(SystemLog.timestamp >= start_date)
    if end_date:
        conditions.append(SystemLog.timestamp <= end_date)
    if level:
        conditions.append(SystemLog.level == level.upper())
    if module:
        conditions.append(SystemLog.module.ilike(f"%{module}%"))
    if user_id:
        conditions.append(SystemLog.user_id == user_id)
    if request_id:
        conditions.append(SystemLog.request_id == request_id)
    if action:
        conditions.append(SystemLog.action == action)
    if entity_type:
        conditions.append(SystemLog.entity_type == entity_type)
    if search:
        conditions.append(
            or_(
                SystemLog.message.ilike(f"%{search}%"),
                SystemLog.module.ilike(f"%{search}%")
            )
        )
    
    if conditions:
        query = query.where(and_(*conditions))
    
    # Count total results
    count_query = select(SystemLog).where(and_(*conditions)) if conditions else select(SystemLog)
    total = len(session.exec(count_query).all())
    
    # Apply pagination and ordering
    query = query.order_by(SystemLog.timestamp.desc()).offset(offset).limit(limit)
    logs = session.exec(query).all()
    
    # Convert to response format
    log_dicts = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "level": log.level,
            "logger": log.logger,
            "message": log.message,
            "module": log.module,
            "function": log.function,
            "line_number": log.line_number,
            "request_id": log.request_id,
            "user_id": log.user_id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "log_metadata": log.log_metadata,
            "exception": log.exception,
            "created_at": log.created_at.isoformat()
        }
        log_dicts.append(log_dict)
    
    logger.info(
        f"Log query executed - returned {len(logs)} of {total} logs",
        extra={
            "action": "query_logs",
            "entity_type": "system_logs",
            "user_id": current_user.id,
            "metadata": {
                "total": total,
                "returned": len(logs),
                "filters": {k: v for k, v in {
                    "level": level,
                    "module": module,
                    "user_id": user_id,
                    "search": search
                }.items() if v is not None}
            }
        }
    )
    
    return LogResponse(
        logs=log_dicts,
        total=total,
        limit=limit,
        offset=offset,
        has_more=(offset + len(logs)) < total
    )


@router.get("/stats", response_model=LogStats)
async def get_log_stats(
    hours: int = 24,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get aggregated log statistics
    Requires admin role for access
    """
    
    # Only admins can access log stats
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Time range
    since = datetime.utcnow() - timedelta(hours=hours)
    
    # Get logs in time range
    query = select(SystemLog).where(SystemLog.timestamp >= since)
    logs = session.exec(query).all()
    
    # Calculate statistics
    total_logs = len(logs)
    
    # Count by level
    by_level = {}
    by_module = {}
    error_count = 0
    
    for log in logs:
        # By level
        by_level[log.level] = by_level.get(log.level, 0) + 1
        
        # By module
        module = log.module.split('.')[0]  # First part of module name
        by_module[module] = by_module.get(module, 0) + 1
        
        # Error count
        if log.level in ['ERROR', 'CRITICAL']:
            error_count += 1
    
    error_rate = (error_count / total_logs * 100) if total_logs > 0 else 0
    
    # Recent errors (last hour)
    recent_since = datetime.utcnow() - timedelta(hours=1)
    recent_errors_query = select(SystemLog).where(
        and_(
            SystemLog.timestamp >= recent_since,
            SystemLog.level.in_(['ERROR', 'CRITICAL'])
        )
    )
    recent_errors = len(session.exec(recent_errors_query).all())
    
    logger.info(
        f"Log statistics generated for last {hours} hours",
        extra={
            "action": "get_stats",
            "entity_type": "system_logs",
            "user_id": current_user.id,
            "metadata": {"hours": hours, "total_logs": total_logs}
        }
    )
    
    return LogStats(
        total_logs=total_logs,
        by_level=by_level,
        by_module=by_module,
        error_rate=round(error_rate, 2),
        recent_errors=recent_errors,
        last_24h=total_logs
    )


@router.delete("/cleanup")
async def cleanup_old_logs(
    days: int = 30,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Clean up logs older than specified days
    Requires admin role for access
    """
    
    # Only admins can cleanup logs
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if days < 7:
        raise HTTPException(status_code=400, detail="Cannot delete logs newer than 7 days")
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Count logs to be deleted
    count_query = select(SystemLog).where(SystemLog.timestamp < cutoff_date)
    logs_to_delete = len(session.exec(count_query).all())
    
    if logs_to_delete == 0:
        return {"message": "No logs to delete", "deleted": 0}
    
    # Delete old logs
    session.query(SystemLog).filter(SystemLog.timestamp < cutoff_date).delete()
    session.commit()
    
    logger.warning(
        f"Cleaned up {logs_to_delete} logs older than {days} days",
        extra={
            "action": "cleanup_logs",
            "entity_type": "system_logs",
            "user_id": current_user.id,
            "metadata": {"days": days, "deleted": logs_to_delete}
        }
    )
    
    return {"message": f"Deleted {logs_to_delete} old logs", "deleted": logs_to_delete}


@router.get("/export")
async def export_logs(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    level: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Export logs as JSON for analysis
    Requires admin role for access
    """
    
    # Only admins can export logs
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build query
    query = select(SystemLog)
    conditions = []
    
    if start_date:
        conditions.append(SystemLog.timestamp >= start_date)
    if end_date:
        conditions.append(SystemLog.timestamp <= end_date)
    if level:
        conditions.append(SystemLog.level == level.upper())
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(SystemLog.timestamp.desc()).limit(10000)  # Limit exports
    logs = session.exec(query).all()
    
    # Format for export
    export_data = []
    for log in logs:
        export_data.append({
            "timestamp": log.timestamp.isoformat(),
            "level": log.level,
            "logger": log.logger,
            "message": log.message,
            "module": log.module,
            "function": log.function,
            "line_number": log.line_number,
            "request_id": log.request_id,
            "user_id": log.user_id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "metadata": log.metadata,
            "exception": log.exception
        })
    
    logger.info(
        f"Exported {len(export_data)} logs",
        extra={
            "action": "export_logs",
            "entity_type": "system_logs",
            "user_id": current_user.id,
            "metadata": {"exported_count": len(export_data)}
        }
    )
    
    return {
        "logs": export_data,
        "exported_at": datetime.utcnow().isoformat(),
        "count": len(export_data)
    }