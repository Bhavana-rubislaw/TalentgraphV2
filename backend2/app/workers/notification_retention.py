"""
Notification Retention & Cleanup — TalentGraph V2
==================================================
Automated cleanup jobs for notification data retention policy.

RETENTION POLICY:
- In-app notifications: Keep for 90 days, then archive/delete
- Email delivery records: Keep for 180 days (compliance)
- Read notifications: Delete after 30 days
- Unread notifications: Keep full 90 days

Schedule this job to run daily at off-peak hours.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any
from sqlmodel import Session, select, delete

from app.database import engine
from app.models import Notification, EmailDelivery, EmailDeliveryStatus

logger = logging.getLogger(__name__)


class NotificationRetentionPolicy:
    """Manages notification data retention and cleanup"""
    
    # Configurable retention periods (in days)
    READ_NOTIFICATION_RETENTION_DAYS = 30
    UNREAD_NOTIFICATION_RETENTION_DAYS = 90
    EMAIL_DELIVERY_RETENTION_DAYS = 180
    
    @staticmethod
    def cleanup_old_notifications(
        session: Session,
        dry_run: bool = False
    ) -> Dict[str, int]:
        """
        Clean up old notifications based on retention policy.
        
        Args:
            session: Database session
            dry_run: If True, only count records without deleting
            
        Returns:
            Dict with counts of deleted records
        """
        results = {
            "read_deleted": 0,
            "unread_deleted": 0,
            "total_deleted": 0
        }
        
        try:
            # Calculate cutoff dates
            read_cutoff = datetime.utcnow() - timedelta(
                days=NotificationRetentionPolicy.READ_NOTIFICATION_RETENTION_DAYS
            )
            unread_cutoff = datetime.utcnow() - timedelta(
                days=NotificationRetentionPolicy.UNREAD_NOTIFICATION_RETENTION_DAYS
            )
            
            # Delete old READ notifications
            read_query = select(Notification).where(
                Notification.is_read == True,
                Notification.created_at < read_cutoff
            )
            read_notifications = session.exec(read_query).all()
            results["read_deleted"] = len(read_notifications)
            
            if not dry_run:
                for notif in read_notifications:
                    session.delete(notif)
                
                logger.info(
                    f"[RETENTION] Deleted {results['read_deleted']} read notifications "
                    f"older than {NotificationRetentionPolicy.READ_NOTIFICATION_RETENTION_DAYS} days"
                )
            
            # Delete old UNREAD notifications (very old, likely abandoned)
            unread_query = select(Notification).where(
                Notification.is_read == False,
                Notification.created_at < unread_cutoff
            )
            unread_notifications = session.exec(unread_query).all()
            results["unread_deleted"] = len(unread_notifications)
            
            if not dry_run:
                for notif in unread_notifications:
                    session.delete(notif)
                
                logger.info(
                    f"[RETENTION] Deleted {results['unread_deleted']} unread notifications "
                    f"older than {NotificationRetentionPolicy.UNREAD_NOTIFICATION_RETENTION_DAYS} days"
                )
            
            results["total_deleted"] = results["read_deleted"] + results["unread_deleted"]
            
            if not dry_run:
                session.commit()
                logger.info(
                    f"[RETENTION] Total notifications deleted: {results['total_deleted']}"
                )
            else:
                logger.info(
                    f"[RETENTION] DRY RUN - Would delete {results['total_deleted']} notifications"
                )
            
            return results
        
        except Exception as e:
            logger.error(f"[RETENTION] Failed to cleanup notifications: {e}", exc_info=True)
            session.rollback()
            return results
    
    @staticmethod
    def cleanup_old_email_deliveries(
        session: Session,
        dry_run: bool = False
    ) -> Dict[str, int]:
        """
        Clean up old email delivery records.
        
        Keep for longer than notifications for compliance/debugging.
        """
        results = {
            "deliveries_deleted": 0
        }
        
        try:
            cutoff = datetime.utcnow() - timedelta(
                days=NotificationRetentionPolicy.EMAIL_DELIVERY_RETENTION_DAYS
            )
            
            # Delete old email delivery records (all statuses)
            query = select(EmailDelivery).where(
                EmailDelivery.created_at < cutoff
            )
            deliveries = session.exec(query).all()
            results["deliveries_deleted"] = len(deliveries)
            
            if not dry_run:
                for delivery in deliveries:
                    session.delete(delivery)
                
                session.commit()
                
                logger.info(
                    f"[RETENTION] Deleted {results['deliveries_deleted']} email delivery records "
                    f"older than {NotificationRetentionPolicy.EMAIL_DELIVERY_RETENTION_DAYS} days"
                )
            else:
                logger.info(
                    f"[RETENTION] DRY RUN - Would delete {results['deliveries_deleted']} email deliveries"
                )
            
            return results
        
        except Exception as e:
            logger.error(f"[RETENTION] Failed to cleanup email deliveries: {e}", exc_info=True)
            session.rollback()
            return results
    
    @staticmethod
    def run_full_cleanup(dry_run: bool = False) -> Dict[str, Any]:
        """
        Run complete retention cleanup (notifications + emails).
        
        Schedule this function to run daily via cron or APScheduler.
        """
        logger.info("[RETENTION] Starting notification retention cleanup...")
        
        with Session(engine) as session:
            notification_results = NotificationRetentionPolicy.cleanup_old_notifications(
                session, dry_run
            )
            
            email_results = NotificationRetentionPolicy.cleanup_old_email_deliveries(
                session, dry_run
            )
        
        combined_results = {
            **notification_results,
            **email_results,
            "timestamp": datetime.utcnow().isoformat(),
            "dry_run": dry_run
        }
        
        logger.info(
            f"[RETENTION] Cleanup completed: {combined_results}"
        )
        
        return combined_results
    
    @staticmethod
    def get_retention_stats(session: Session) -> Dict[str, Any]:
        """
        Get statistics about notification data for monitoring.
        
        Useful for dashboards and alerting.
        """
        try:
            # Count notifications by age
            now = datetime.utcnow()
            day_30 = now - timedelta(days=30)
            day_60 = now - timedelta(days=60)
            day_90 = now - timedelta(days=90)
            
            total = session.exec(select(Notification)).all()
            total_count = len(total)
            
            read_count = len([n for n in total if n.is_read])
            unread_count = len([n for n in total if not n.is_read])
            
            older_30 = len([n for n in total if n.created_at < day_30])
            older_60 = len([n for n in total if n.created_at < day_60])
            older_90 = len([n for n in total if n.created_at < day_90])
            
            # Email delivery stats
            deliveries = session.exec(select(EmailDelivery)).all()
            email_total = len(deliveries)
            email_sent = len([d for d in deliveries if d.status == EmailDeliveryStatus.SENT.value])
            email_failed = len([d for d in deliveries if d.status == EmailDeliveryStatus.FAILED.value])
            email_queued = len([d for d in deliveries if d.status == EmailDeliveryStatus.QUEUED.value])
            
            return {
                "notifications": {
                    "total": total_count,
                    "read": read_count,
                    "unread": unread_count,
                    "older_than_30_days": older_30,
                    "older_than_60_days": older_60,
                    "older_than_90_days": older_90
                },
                "email_deliveries": {
                    "total": email_total,
                    "sent": email_sent,
                    "failed": email_failed,
                    "queued": email_queued
                },
                "timestamp": now.isoformat()
            }
        
        except Exception as e:
            logger.error(f"[RETENTION] Failed to get stats: {e}")
            return {}


# Scheduler integration (add to app/workers/scheduler.py)
def schedule_retention_cleanup():
    """
    Register retention cleanup job with APScheduler.
    
    Add this to your main scheduler configuration.
    """
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    
    scheduler = BackgroundScheduler()
    
    # Run daily at 2 AM
    scheduler.add_job(
        func=NotificationRetentionPolicy.run_full_cleanup,
        trigger=CronTrigger(hour=2, minute=0),
        args=[False],  # dry_run=False
        id="notification_retention_cleanup",
        name="Notification Retention Cleanup",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("[RETENTION] Scheduled daily notification cleanup at 2 AM")
    
    return scheduler


# CLI command for manual execution
if __name__ == "__main__":
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    dry_run = "--dry-run" in sys.argv
    
    if dry_run:
        print("Running in DRY RUN mode (no data will be deleted)")
    
    results = NotificationRetentionPolicy.run_full_cleanup(dry_run=dry_run)
    
    print("\n=== Retention Cleanup Results ===")
    print(f"Read notifications deleted: {results.get('read_deleted', 0)}")
    print(f"Unread notifications deleted: {results.get('unread_deleted', 0)}")
    print(f"Email deliveries deleted: {results.get('deliveries_deleted', 0)}")
    print(f"Total deleted: {results.get('total_deleted', 0)}")
    print(f"Timestamp: {results.get('timestamp')}")
