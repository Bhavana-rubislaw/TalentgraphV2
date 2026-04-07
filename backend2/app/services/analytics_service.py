"""
Analytics Service for TalentGraph
==================================
Event tracking and aggregation for analytics pipeline

Features:
- Event tracking with metadata
- Daily rollup aggregation
- Funnel calculations
- Time-to-action metrics

Event Types (20 total):
- JOB_VIEWED, JOB_LIKED, APPLICATION_SUBMITTED
- APPLICATION_VIEWED, APPLICATION_STATUS_CHANGED
- INTERVIEW_SCHEDULED, INTERVIEW_COMPLETED, INTERVIEW_CANCELLED
- OFFER_MADE, OFFER_ACCEPTED, OFFER_REJECTED
- CANDIDATE_HIRED, CANDIDATE_REJECTED
- MESSAGE_SENT, MESSAGE_READ
- EMAIL_SENT, EMAIL_OPENED, EMAIL_CLICKED
- SEARCH_PERFORMED, PROFILE_VIEWED, PAYMENT_COMPLETED
"""

import json
import logging
from datetime import datetime, timezone, timedelta, date
from typing import Dict, Any, Optional, List

from sqlmodel import Session, select, func

from app.models import (
    AnalyticsEvent, AnalyticsRollupDaily,
    AnalyticsEventType
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# ANALYTICS SERVICE
# ═══════════════════════════════════════════════════════════════════════════

class AnalyticsService:
    """Service for tracking and aggregating analytics events"""
    
    def track_event(
        self,
        session: Session,
        company_id: int,
        event_type: AnalyticsEventType,
        job_posting_id: Optional[int] = None,
        candidate_id: Optional[int] = None,
        application_id: Optional[int] = None,
        user_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        correlation_id: Optional[str] = None
    ) -> int:
        """
        Track an analytics event
        
        Args:
            session: Database session
            company_id: Company ID
            event_type: Type of event
            job_posting_id: Related job posting
            candidate_id: Related candidate
            application_id: Related application
            user_id: User who triggered event
            metadata: Additional metadata (source, device, etc.)
            correlation_id: For tracking user journey
        
        Returns:
            Event ID
        """
        
        event = AnalyticsEvent(
            company_id=company_id,
            event_type=event_type,
            event_time=datetime.now(timezone.utc),
            job_posting_id=job_posting_id,
            candidate_id=candidate_id,
            application_id=application_id,
            user_id=user_id,
            metadata_json=json.dumps(metadata) if metadata else None,
            correlation_id=correlation_id
        )
        
        session.add(event)
        session.flush()
        
        logger.debug(f"Tracked event {event_type.value} (ID: {event.id})")
        
        return event.id
    
    def aggregate_daily(self, session: Session, target_date: date):
        """
        Aggregate events into daily rollup table
        
        Should be run daily by analytics worker
        
        Args:
            session: Database session
            target_date: Date to aggregate (usually yesterday)
        """
        
        start_time = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc)
        end_time = datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc)
        
        logger.info(f"Starting daily aggregation for {target_date}")
        
        # Get all events for the day
        events = session.exec(
            select(AnalyticsEvent).where(
                AnalyticsEvent.event_time >= start_time,
                AnalyticsEvent.event_time <= end_time
            )
        ).all()
        
        # Group by company_id and job_posting_id
        rollups: Dict[tuple, Dict[str, int]] = {}
        
        for event in events:
            key = (event.company_id, event.job_posting_id)
            
            if key not in rollups:
                rollups[key] = {
                    'views': 0,
                    'likes': 0,
                    'applications': 0,
                    'interviews_scheduled': 0,
                    'interviews_completed': 0,
                    'offers_made': 0,
                    'hires': 0
                }
            
            # Increment counters based on event type
            if event.event_type == AnalyticsEventType.JOB_VIEWED:
                rollups[key]['views'] += 1
            elif event.event_type == AnalyticsEventType.JOB_LIKED:
                rollups[key]['likes'] += 1
            elif event.event_type == AnalyticsEventType.APPLICATION_SUBMITTED:
                rollups[key]['applications'] += 1
            elif event.event_type == AnalyticsEventType.INTERVIEW_SCHEDULED:
                rollups[key]['interviews_scheduled'] += 1
            elif event.event_type == AnalyticsEventType.INTERVIEW_COMPLETED:
                rollups[key]['interviews_completed'] += 1
            elif event.event_type == AnalyticsEventType.OFFER_MADE:
                rollups[key]['offers_made'] += 1
            elif event.event_type == AnalyticsEventType.CANDIDATE_HIRED:
                rollups[key]['hires'] += 1
        
        # Create or update rollup records
        created_count = 0
        updated_count = 0
        
        for (company_id, job_posting_id), metrics in rollups.items():
            # Check if rollup exists
            existing = session.exec(
                select(AnalyticsRollupDaily).where(
                    AnalyticsRollupDaily.rollup_date == target_date,
                    AnalyticsRollupDaily.company_id == company_id,
                    AnalyticsRollupDaily.job_posting_id == job_posting_id
                )
            ).first()
            
            if existing:
                # Update existing
                existing.views += metrics['views']
                existing.likes += metrics['likes']
                existing.applications += metrics['applications']
                existing.interviews_scheduled += metrics['interviews_scheduled']
                existing.interviews_completed += metrics['interviews_completed']
                existing.offers_made += metrics['offers_made']
                existing.hires += metrics['hires']
                existing.updated_at = datetime.now(timezone.utc)
                session.add(existing)
                updated_count += 1
            else:
                # Create new
                rollup = AnalyticsRollupDaily(
                    rollup_date=target_date,
                    company_id=company_id,
                    job_posting_id=job_posting_id,
                    views=metrics['views'],
                    likes=metrics['likes'],
                    applications=metrics['applications'],
                    interviews_scheduled=metrics['interviews_scheduled'],
                    interviews_completed=metrics['interviews_completed'],
                    offers_made=metrics['offers_made'],
                    hires=metrics['hires']
                )
                session.add(rollup)
                created_count += 1
        
        session.commit()
        
        logger.info(f"Daily aggregation complete: {created_count} created, {updated_count} updated")
    
    def get_funnel_metrics(
        self,
        session: Session,
        company_id: int,
        start_date: date,
        end_date: date,
        job_posting_id: Optional[int] = None
    ) -> Dict[str, int]:
        """
        Get funnel metrics for date range
        
        Args:
            session: Database session
            company_id: Company ID
            start_date: Start date
            end_date: End date
            job_posting_id: Optional job filter
        
        Returns:
            Dictionary with funnel stage counts
        """
        
        query = select(AnalyticsRollupDaily).where(
            AnalyticsRollupDaily.company_id == company_id,
            AnalyticsRollupDaily.rollup_date >= start_date,
            AnalyticsRollupDaily.rollup_date <= end_date
        )
        
        if job_posting_id:
            query = query.where(AnalyticsRollupDaily.job_posting_id == job_posting_id)
        
        rollups = session.exec(query).all()
        
        # Aggregate
        metrics = {
            'views': sum(r.views for r in rollups),
            'likes': sum(r.likes for r in rollups),
            'applications': sum(r.applications for r in rollups),
            'interviews_scheduled': sum(r.interviews_scheduled for r in rollups),
            'interviews_completed': sum(r.interviews_completed for r in rollups),
            'offers_made': sum(r.offers_made for r in rollups),
            'hires': sum(r.hires for r in rollups)
        }
        
        return metrics
    
    def get_time_to_action(
        self,
        session: Session,
        company_id: int,
        job_posting_id: int,
        from_event: AnalyticsEventType,
        to_event: AnalyticsEventType
    ) -> Optional[float]:
        """
        Calculate average time between two event types
        
        Example: Time from JOB_VIEWED to APPLICATION_SUBMITTED
        
        Args:
            session: Database session
            company_id: Company ID
            job_posting_id: Job ID
            from_event: Starting event type
            to_event: Ending event type
        
        Returns:
            Average time in hours, or None if no data
        """
        
        # Get all from_events
        from_events = session.exec(
            select(AnalyticsEvent).where(
                AnalyticsEvent.company_id == company_id,
                AnalyticsEvent.job_posting_id == job_posting_id,
                AnalyticsEvent.event_type == from_event
            )
        ).all()
        
        # Get all to_events
        to_events = session.exec(
            select(AnalyticsEvent).where(
                AnalyticsEvent.company_id == company_id,
                AnalyticsEvent.job_posting_id == job_posting_id,
                AnalyticsEvent.event_type == to_event
            )
        ).all()
        
        # Build map by candidate_id
        from_map = {}
        for event in from_events:
            if event.candidate_id:
                if event.candidate_id not in from_map or event.event_time < from_map[event.candidate_id]:
                    from_map[event.candidate_id] = event.event_time
        
        to_map = {}
        for event in to_events:
            if event.candidate_id:
                if event.candidate_id not in to_map or event.event_time > to_map[event.candidate_id]:
                    to_map[event.candidate_id] = event.event_time
        
        # Calculate time differences
        differences = []
        for candidate_id in from_map:
            if candidate_id in to_map:
                diff = (to_map[candidate_id] - from_map[candidate_id]).total_seconds() / 3600
                differences.append(diff)
        
        if not differences:
            return None
        
        return sum(differences) / len(differences)
    
    def backfill_aggregation(
        self,
        session: Session,
        start_date: date,
        end_date: date
    ):
        """
        Backfill aggregation for date range
        
        Useful for filling gaps or re-running aggregation
        
        Args:
            session: Database session
            start_date: Start date
            end_date: End date
        """
        
        current_date = start_date
        
        while current_date <= end_date:
            logger.info(f"Backfilling aggregation for {current_date}")
            self.aggregate_daily(session, current_date)
            current_date += timedelta(days=1)
        
        logger.info(f"Backfill complete from {start_date} to {end_date}")
    
    def get_top_sources(
        self,
        session: Session,
        company_id: int,
        job_posting_id: Optional[int] = None,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get top traffic sources from event metadata
        
        Args:
            session: Database session
            company_id: Company ID
            job_posting_id: Optional job filter
            days: Days to look back
        
        Returns:
            List of {source, count} dictionaries
        """
        
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        
        query = select(AnalyticsEvent).where(
            AnalyticsEvent.company_id == company_id,
            AnalyticsEvent.event_type == AnalyticsEventType.JOB_VIEWED,
            AnalyticsEvent.event_time >= cutoff
        )
        
        if job_posting_id:
            query = query.where(AnalyticsEvent.job_posting_id == job_posting_id)
        
        events = session.exec(query).all()
        
        # Extract sources from metadata
        sources_count: Dict[str, int] = {}
        
        for event in events:
            if event.metadata_json and 'source' in event.metadata_json:
                source = event.metadata_json['source']
                sources_count[source] = sources_count.get(source, 0) + 1
        
        # Sort by count
        sorted_sources = sorted(
            sources_count.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [
            {"source": source, "count": count}
            for source, count in sorted_sources[:10]
        ]
    
    def get_candidate_journey(
        self,
        session: Session,
        candidate_id: int,
        job_posting_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get ordered list of events for candidate journey
        
        Args:
            session: Database session
            candidate_id: Candidate ID
            job_posting_id: Optional job filter
        
        Returns:
            List of events with timestamps
        """
        
        query = select(AnalyticsEvent).where(
            AnalyticsEvent.candidate_id == candidate_id
        ).order_by(AnalyticsEvent.event_time)
        
        if job_posting_id:
            query = query.where(AnalyticsEvent.job_posting_id == job_posting_id)
        
        events = session.exec(query).all()
        
        return [
            {
                "event_type": event.event_type.value,
                "event_time": event.event_time.isoformat(),
                "job_posting_id": event.job_posting_id,
                "metadata": event.metadata_json
            }
            for event in events
        ]


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def track_job_view(
    session: Session,
    company_id: int,
    job_posting_id: int,
    candidate_id: Optional[int] = None,
    source: Optional[str] = None
):
    """Helper to track job view"""
    service = AnalyticsService()
    metadata = {"source": source} if source else {}
    service.track_event(
        session=session,
        company_id=company_id,
        event_type=AnalyticsEventType.JOB_VIEWED,
        job_posting_id=job_posting_id,
        candidate_id=candidate_id,
        metadata=metadata
    )


def track_application_submitted(
    session: Session,
    company_id: int,
    job_posting_id: int,
    candidate_id: int,
    application_id: int
):
    """Helper to track application submission"""
    service = AnalyticsService()
    service.track_event(
        session=session,
        company_id=company_id,
        event_type=AnalyticsEventType.APPLICATION_SUBMITTED,
        job_posting_id=job_posting_id,
        candidate_id=candidate_id,
        application_id=application_id
    )


def track_interview_scheduled(
    session: Session,
    company_id: int,
    job_posting_id: int,
    candidate_id: int,
    application_id: int
):
    """Helper to track interview scheduled"""
    service = AnalyticsService()
    service.track_event(
        session=session,
        company_id=company_id,
        event_type=AnalyticsEventType.INTERVIEW_SCHEDULED,
        job_posting_id=job_posting_id,
        candidate_id=candidate_id,
        application_id=application_id
    )


def track_hire(
    session: Session,
    company_id: int,
    job_posting_id: int,
    candidate_id: int,
    application_id: int
):
    """Helper to track successful hire"""
    service = AnalyticsService()
    service.track_event(
        session=session,
        company_id=company_id,
        event_type=AnalyticsEventType.CANDIDATE_HIRED,
        job_posting_id=job_posting_id,
        candidate_id=candidate_id,
        application_id=application_id
    )
