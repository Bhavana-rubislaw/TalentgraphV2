"""
Analytics Router for TalentGraph
=================================
Provides recruiter analytics, funnel metrics, and job performance data

Endpoints:
- GET /analytics/overview - High-level KPIs for date range
- GET /analytics/funnel - Conversion funnel metrics
- GET /analytics/job/{job_id} - Job-specific analytics
- POST /analytics/events - Manual event tracking (if needed)

Features:
- Date range filtering
- Job-level granularity
- Funnel conversion rates
- Feature gating for advanced analytics
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel

from app.database import get_session
from app.models import (
    AnalyticsEvent, AnalyticsRollupDaily,
    AnalyticsEventType, JobPosting, Company, User, Application,
    Swipe, Meeting, MeetingStatus, MeetingType
)
from app.security import get_current_user
# from app.routers.billing import require_entitlement  # Disabled until billing is configured

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class OverviewMetrics(BaseModel):
    """High-level KPIs"""
    total_job_views: int
    total_applications: int
    total_interviews_scheduled: int
    total_offers_made: int
    total_hires: int
    
    application_rate: float  # applications / views
    interview_rate: float  # interviews / applications
    offer_rate: float  # offers / interviews
    hire_rate: float  # hires / offers
    
    active_jobs: int
    candidates_in_pipeline: int


class FunnelStage(BaseModel):
    """Single funnel stage"""
    stage: str
    count: int
    conversion_rate: Optional[float] = None


class FunnelMetrics(BaseModel):
    """Conversion funnel"""
    stages: List[FunnelStage]
    date_range_start: datetime
    date_range_end: datetime
    job_id: Optional[int] = None


class JobAnalytics(BaseModel):
    """Job-specific analytics"""
    job_id: int
    job_title: str
    
    views: int
    likes: int
    applications: int
    interviews_scheduled: int
    interviews_completed: int
    offers_made: int
    hires: int
    
    like_rate: float
    application_rate: float
    interview_rate: float
    offer_rate: float
    hire_rate: float
    
    avg_time_to_application_hours: Optional[float]
    avg_time_to_hire_days: Optional[float]
    
    top_sources: List[Dict[str, Any]]


class TrackEventRequest(BaseModel):
    """Manual event tracking"""
    event_type: str
    job_posting_id: Optional[int] = None
    candidate_id: Optional[int] = None
    application_id: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


# ═══════════════════════════════════════════════════════════════════════════
# OVERVIEW METRICS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/overview", response_model=OverviewMetrics)
async def get_overview_metrics(
    range_days: int = Query(30, ge=1, le=365, description="Date range in days"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get high-level KPI metrics for date range
    
    Aggregates from AnalyticsRollupDaily table
    """
    
    # Get company from user
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    company_id = company.id
    
    # Calculate date range
    end_date = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=range_days)
    
    # Query rollup table
    rollups = session.exec(
        select(AnalyticsRollupDaily).where(
            AnalyticsRollupDaily.company_id == company_id,
            AnalyticsRollupDaily.rollup_date >= start_date,
            AnalyticsRollupDaily.rollup_date <= end_date
        )
    ).all()
    
    # Aggregate metrics
    total_views = sum(r.jobs_viewed for r in rollups)
    total_likes = sum(r.jobs_liked for r in rollups)
    total_applications = sum(r.applications_submitted for r in rollups)
    total_interviews = sum(r.interviews_scheduled for r in rollups)
    total_offers = sum(r.offers_made for r in rollups)
    total_hires = sum(r.hires for r in rollups)
    
    # Calculate conversion rates
    application_rate = (total_applications / total_views * 100) if total_views > 0 else 0
    interview_rate = (total_interviews / total_applications * 100) if total_applications > 0 else 0
    offer_rate = (total_offers / total_interviews * 100) if total_interviews > 0 else 0
    hire_rate = (total_hires / total_offers * 100) if total_offers > 0 else 0
    
    # Get active jobs count
    active_jobs_count = session.exec(
        select(func.count(JobPosting.id)).where(
            JobPosting.company_id == company_id,
            JobPosting.status == "open"
        )
    ).first() or 0
    
    # Count candidates in pipeline (approximate from recent events)
    candidates_in_pipeline = session.exec(
        select(func.count(func.distinct(AnalyticsEvent.candidate_id))).where(
            AnalyticsEvent.company_id == company_id,
            AnalyticsEvent.event_time >= datetime.now(timezone.utc) - timedelta(days=range_days),
            AnalyticsEvent.candidate_id.isnot(None)
        )
    ).first() or 0
    
    return OverviewMetrics(
        total_job_views=total_views,
        total_applications=total_applications,
        total_interviews_scheduled=total_interviews,
        total_offers_made=total_offers,
        total_hires=total_hires,
        application_rate=round(application_rate, 2),
        interview_rate=round(interview_rate, 2),
        offer_rate=round(offer_rate, 2),
        hire_rate=round(hire_rate, 2),
        active_jobs=active_jobs_count,
        candidates_in_pipeline=candidates_in_pipeline
    )


# ═══════════════════════════════════════════════════════════════════════════
# FUNNEL METRICS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/funnel", response_model=FunnelMetrics)
# @require_entitlement("analytics_advanced_enabled")  # Premium feature
async def get_funnel_metrics(
    range_days: int = Query(30, ge=1, le=365),
    job_id: Optional[int] = Query(None, description="Filter by job ID"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get conversion funnel metrics
    
    Stages: Views → Likes → Applications → Interviews → Offers → Hires
    
    Premium feature: requires analytics_advanced_enabled entitlement
    """
    
    # Get company from user
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    company_id = company.id
    
    # Calculate date range
    end_date = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=range_days)
    
    # Build query
    query = select(AnalyticsRollupDaily).where(
        AnalyticsRollupDaily.company_id == company_id,
        AnalyticsRollupDaily.rollup_date >= start_date,
        AnalyticsRollupDaily.rollup_date <= end_date
    )
    
    if job_id:
        # Validate job ownership
        job = session.get(JobPosting, job_id)
        if not job or job.company_id != company_id:
            raise HTTPException(status_code=404, detail="Job not found")
        
        query = query.where(AnalyticsRollupDaily.job_posting_id == job_id)
    
    rollups = session.exec(query).all()
    
    # Aggregate by stage
    total_views = sum(r.jobs_viewed for r in rollups)
    total_likes = sum(r.jobs_liked for r in rollups)
    total_applications = sum(r.applications_submitted for r in rollups)
    total_interviews = sum(r.interviews_scheduled for r in rollups)
    total_offers = sum(r.offers_made for r in rollups)
    total_hires = sum(r.hires for r in rollups)
    
    # Build funnel stages
    stages = [
        FunnelStage(stage="Views", count=total_views, conversion_rate=100.0),
        FunnelStage(
            stage="Likes",
            count=total_likes,
            conversion_rate=round((total_likes / total_views * 100) if total_views > 0 else 0, 2)
        ),
        FunnelStage(
            stage="Applications",
            count=total_applications,
            conversion_rate=round((total_applications / total_views * 100) if total_views > 0 else 0, 2)
        ),
        FunnelStage(
            stage="Interviews",
            count=total_interviews,
            conversion_rate=round((total_interviews / total_applications * 100) if total_applications > 0 else 0, 2)
        ),
        FunnelStage(
            stage="Offers",
            count=total_offers,
            conversion_rate=round((total_offers / total_interviews * 100) if total_interviews > 0 else 0, 2)
        ),
        FunnelStage(
            stage="Hires",
            count=total_hires,
            conversion_rate=round((total_hires / total_offers * 100) if total_offers > 0 else 0, 2)
        )
    ]
    
    return FunnelMetrics(
        stages=stages,
        date_range_start=datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc),
        date_range_end=datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc),
        job_id=job_id
    )


# ═══════════════════════════════════════════════════════════════════════════
# JOB-SPECIFIC ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/job/{job_id}", response_model=JobAnalytics)
async def get_job_analytics(
    job_id: int,
    range_days: int = Query(90, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get detailed analytics for specific job
    
    Includes:
    - Funnel metrics
    - Conversion rates
    - Time-to-action metrics
    - Top traffic sources
    """
    
    # Get company from user
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    company_id = company.id
    
    # Get job
    job = session.get(JobPosting, job_id)
    if not job or job.company_id != company_id:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Calculate date range
    end_date = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=range_days)
    start_datetime = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    
    # ═══════════════════════════════════════════════════════════════════
    # QUERY REAL TABLES DIRECTLY (not rollup) for accurate real-time counts
    # ═══════════════════════════════════════════════════════════════════
    
    # 1. COUNT VIEWS - from AnalyticsEvent table (JOB_VIEWED events)
    view_events = session.exec(
        select(AnalyticsEvent).where(
            AnalyticsEvent.job_posting_id == job_id,
            AnalyticsEvent.event_type == AnalyticsEventType.JOB_VIEWED,
            AnalyticsEvent.event_time >= start_datetime
        )
    ).all()
    views = len(view_events)
    
    # 2. COUNT LIKES - from Swipe table (candidate likes on this job)
    like_swipes = session.exec(
        select(Swipe).where(
            Swipe.job_posting_id == job_id,
            Swipe.action == "like",
            Swipe.action_by == "candidate",
            Swipe.created_at >= start_datetime
        )
    ).all()
    likes = len(like_swipes)
    
    # 3. COUNT APPLICATIONS - from Application table
    applications_list = session.exec(
        select(Application).where(
            Application.job_posting_id == job_id,
            Application.applied_at >= start_datetime
        )
    ).all()
    applications = len(applications_list)
    
    # 4. COUNT INTERVIEWS - from Meeting table (scheduled interviews for this job)
    try:
        # Get all meetings for this job, then filter by type
        all_meetings = session.exec(
            select(Meeting).where(
                Meeting.job_posting_id == job_id,
                Meeting.scheduled_start >= start_datetime
            )
        ).all()
        # Filter for interview type meetings
        interview_meetings = [m for m in all_meetings if m.meeting_type == "interview"]
        interviews_scheduled = len(interview_meetings)
        
        # Count completed interviews (not cancelled)
        interviews_completed = len([
            m for m in interview_meetings 
            if m.status not in ["cancelled", MeetingStatus.CANCELLED]
        ])
    except Exception as e:
        logger.warning(f"Could not fetch interview meetings: {e}")
        interviews_scheduled = 0
        interviews_completed = 0
    
    # 5. COUNT OFFERS - applications that reached offer stage
    # Assuming status contains "selected" or similar indicates offer made
    offers = len([
        app for app in applications_list 
        if app.status and 'selected' in app.status.lower()
    ])
    
    # 6. COUNT HIRES - would need a "hired" status or separate table
    # For now, we'll check if there's a "hired" status in applications
    hires = len([
        app for app in applications_list 
        if app.status and 'hired' in app.status.lower()
    ])
    
    # Log real-time metrics for debugging
    logger.info(f"[REAL-TIME METRICS] Job {job_id} ({job.job_title}): "
                f"Views={views}, Likes={likes}, Applications={applications}, "
                f"Interviews={interviews_scheduled}, Offers={offers}, Hires={hires}")
    
    # Calculate conversion rates
    like_rate = (likes / views * 100) if views > 0 else 0
    application_rate = (applications / views * 100) if views > 0 else 0
    interview_rate = (interviews_scheduled / applications * 100) if applications > 0 else 0
    offer_rate = (offers / interviews_completed * 100) if interviews_completed > 0 else 0
    hire_rate = (hires / offers * 100) if offers > 0 else 0
    
    # Calculate time-to-action metrics (from events)
    # Time to application: time from JOB_VIEWED to APPLICATION_SUBMITTED
    # This is expensive query, so we'll approximate or skip for now
    avg_time_to_application_hours = None  # TODO: Calculate from events
    avg_time_to_hire_days = None  # TODO: Calculate from events
    
    # Get top sources from events metadata
    source_events = session.exec(
        select(AnalyticsEvent).where(
            AnalyticsEvent.company_id == company_id,
            AnalyticsEvent.job_posting_id == job_id,
            AnalyticsEvent.event_type == AnalyticsEventType.JOB_VIEWED,
            AnalyticsEvent.event_time >= datetime.now(timezone.utc) - timedelta(days=range_days)
        )
    ).all()
    
    # Extract sources from metadata
    sources_count: Dict[str, int] = {}
    for event in source_events:
        if event.metadata_json and 'source' in event.metadata_json:
            source = event.metadata_json['source']
            sources_count[source] = sources_count.get(source, 0) + 1
    
    top_sources = [
        {"source": source, "count": count}
        for source, count in sorted(sources_count.items(), key=lambda x: x[1], reverse=True)[:5]
    ]
    
    return JobAnalytics(
        job_id=job_id,
        job_title=job.job_title,
        views=views,
        likes=likes,
        applications=applications,
        interviews_scheduled=interviews_scheduled,
        interviews_completed=interviews_completed,
        offers_made=offers,
        hires=hires,
        like_rate=round(like_rate, 2),
        application_rate=round(application_rate, 2),
        interview_rate=round(interview_rate, 2),
        offer_rate=round(offer_rate, 2),
        hire_rate=round(hire_rate, 2),
        avg_time_to_application_hours=avg_time_to_application_hours,
        avg_time_to_hire_days=avg_time_to_hire_days,
        top_sources=top_sources
    )


# ═══════════════════════════════════════════════════════════════════════════
# MANUAL EVENT TRACKING
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/events")
async def track_event(
    request: TrackEventRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Manually track analytics event
    
    Usually events are tracked automatically by other endpoints,
    but this allows manual tracking for custom events or backfill
    """
    
    # Get company from user
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    company_id = company.id
    
    # Validate event type
    try:
        event_type_enum = AnalyticsEventType(request.event_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid event type: {request.event_type}")
    
    # Validate job ownership if provided
    if request.job_posting_id:
        job = session.get(JobPosting, request.job_posting_id)
        if not job or job.company_id != company_id:
            raise HTTPException(status_code=404, detail="Job not found")
    
    # Create event
    event = AnalyticsEvent(
        company_id=company_id,
        event_type=event_type_enum,
        event_time=datetime.now(timezone.utc),
        job_posting_id=request.job_posting_id,
        candidate_id=request.candidate_id,
        application_id=request.application_id,
        metadata_json=request.metadata
    )
    
    session.add(event)
    session.commit()
    
    logger.info(f"Tracked event {event_type_enum.value} for company {company_id}")
    
    return {"status": "tracked", "event_id": event.id}


