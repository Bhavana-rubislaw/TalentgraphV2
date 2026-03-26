"""
Billing Service for TalentGraph
================================
Stripe integration for subscription management and billing

Features:
- Checkout session creation
- Billing portal access
- Webhook event handling
- Entitlement management

Subscription Plans:
- Starter: $99/month - 5 active jobs, basic analytics
- Professional: $299/month - 25 active jobs, advanced analytics, priority support
- Enterprise: $999/month - Unlimited jobs, custom integrations, dedicated support
"""

import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Tuple, Dict, Any, Optional

import stripe
from sqlmodel import Session, select

from app.models import (
    Subscription, Invoice, Entitlement,
    SubscriptionStatus, InvoiceStatus
)

logger = logging.getLogger(__name__)

# Stripe API key
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
APP_BASE_URL = os.getenv("APP_BASE_URL", "https://talentgraph.com")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3003")


# ═══════════════════════════════════════════════════════════════════════════
# SUBSCRIPTION PLAN CONFIGURATIONS
# ═══════════════════════════════════════════════════════════════════════════

SUBSCRIPTION_PLANS = {
    "starter": {
        "name": "Starter Plan",
        "description": "Perfect for small teams",
        "price_month": 9900,  # $99 in cents
        "price_year": 99000,  # $990 in cents (2 months free)
        "stripe_price_id_month": os.getenv("STRIPE_PRICE_STARTER_MONTH"),
        "stripe_price_id_year": os.getenv("STRIPE_PRICE_STARTER_YEAR"),
        "features": {
            "active_jobs_limit": 5,
            "basic_analytics_enabled": True,
            "advanced_analytics_enabled": False,
            "custom_branding_enabled": False,
            "api_access_enabled": False,
            "priority_support_enabled": False,
        }
    },
    "professional": {
        "name": "Professional Plan",
        "description": "For growing recruitment teams",
        "price_month": 29900,  # $299
        "price_year": 299000,  # $2990
        "stripe_price_id_month": os.getenv("STRIPE_PRICE_PROFESSIONAL_MONTH"),
        "stripe_price_id_year": os.getenv("STRIPE_PRICE_PROFESSIONAL_YEAR"),
        "features": {
            "active_jobs_limit": 25,
            "basic_analytics_enabled": True,
            "advanced_analytics_enabled": True,
            "custom_branding_enabled": True,
            "api_access_enabled": False,
            "priority_support_enabled": True,
        }
    },
    "enterprise": {
        "name": "Enterprise Plan",
        "description": "For large organizations",
        "price_month": 99900,  # $999
        "price_year": 999000,  # $9990
        "stripe_price_id_month": os.getenv("STRIPE_PRICE_ENTERPRISE_MONTH"),
        "stripe_price_id_year": os.getenv("STRIPE_PRICE_ENTERPRISE_YEAR"),
        "features": {
            "active_jobs_limit": -1,  # Unlimited
            "basic_analytics_enabled": True,
            "advanced_analytics_enabled": True,
            "custom_branding_enabled": True,
            "api_access_enabled": True,
            "priority_support_enabled": True,
        }
    }
}


# ═══════════════════════════════════════════════════════════════════════════
# BILLING SERVICE
# ═══════════════════════════════════════════════════════════════════════════

class BillingService:
    """Service for managing Stripe billing and subscriptions"""
    
    def create_checkout_session(
        self,
        company_id: int,
        plan_code: str,
        billing_period: str = "month",
        customer_email: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Create Stripe checkout session
        
        Args:
            company_id: TalentGraph company ID
            plan_code: starter, professional, or enterprise
            billing_period: month or year
            customer_email: Customer email for pre-fill
        
        Returns:
            Tuple of (checkout_url, session_id)
        """
        
        if plan_code not in SUBSCRIPTION_PLANS:
            raise ValueError(f"Invalid plan code: {plan_code}")
        
        plan = SUBSCRIPTION_PLANS[plan_code]
        
        # Get Stripe price ID
        if billing_period == "month":
            price_id = plan["stripe_price_id_month"]
        elif billing_period == "year":
            price_id = plan["stripe_price_id_year"]
        else:
            raise ValueError(f"Invalid billing period: {billing_period}")
        
        if not price_id:
            raise ValueError(f"Stripe price ID not configured for {plan_code}/{billing_period}")
        
        # Create checkout session
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price": price_id,
                    "quantity": 1,
                }],
                mode="subscription",
                success_url=f"{FRONTEND_URL}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{FRONTEND_URL}/billing/cancel",
                customer_email=customer_email,
                metadata={
                    "company_id": company_id,
                    "plan_code": plan_code,
                    "billing_period": billing_period
                },
                subscription_data={
                    "trial_period_days": 14,  # 14-day trial
                    "metadata": {
                        "company_id": company_id,
                        "plan_code": plan_code
                    }
                },
                allow_promotion_codes=True
            )
            
            logger.info(f"Created checkout session {session.id} for company {company_id}")
            
            return session.url, session.id
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating checkout: {e}")
            raise
    
    def create_portal_session(self, customer_id: str) -> str:
        """
        Create Stripe billing portal session
        
        Args:
            customer_id: Stripe customer ID
        
        Returns:
            Portal URL
        """
        
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=f"{FRONTEND_URL}/billing"
            )
            
            logger.info(f"Created portal session for customer {customer_id}")
            
            return session.url
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating portal: {e}")
            raise
    
    def verify_webhook(self, payload: bytes, signature: str) -> Dict[str, Any]:
        """
        Verify Stripe webhook signature
        
        Args:
            payload: Raw webhook body
            signature: Stripe-Signature header
        
        Returns:
            Verified event object
        
        Raises:
            ValueError: If signature is invalid
        """
        
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, STRIPE_WEBHOOK_SECRET
            )
            return event
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {e}")
            raise ValueError("Invalid signature")
    
    def handle_webhook_event(self, session: Session, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Route and handle Stripe webhook event
        
        Args:
            session: Database session
            event: Stripe event object
        
        Returns:
            Result dictionary
        """
        
        event_type = event['type']
        
        # Route to appropriate handler
        handlers = {
            'checkout.session.completed': self._handle_checkout_completed,
            'customer.subscription.created': self._handle_subscription_created,
            'customer.subscription.updated': self._handle_subscription_updated,
            'customer.subscription.deleted': self._handle_subscription_deleted,
            'invoice.paid': self._handle_invoice_paid,
            'invoice.payment_failed': self._handle_invoice_payment_failed,
        }
        
        handler = handlers.get(event_type)
        
        if handler:
            return handler(session, event)
        else:
            logger.info(f"No handler for event type: {event_type}")
            return {"status": "ignored", "reason": "no_handler"}
    
    def _handle_checkout_completed(self, session: Session, event: Dict[str, Any]) -> Dict[str, Any]:
        """Handle checkout.session.completed"""
        
        checkout_session = event['data']['object']
        
        company_id = int(checkout_session['metadata']['company_id'])
        plan_code = checkout_session['metadata']['plan_code']
        subscription_id = checkout_session['subscription']
        customer_id = checkout_session['customer']
        
        logger.info(f"Checkout completed for company {company_id}, subscription {subscription_id}")
        
        # Subscription will be created by customer.subscription.created event
        # Just log here
        
        return {"status": "logged", "subscription_id": subscription_id}
    
    def _handle_subscription_created(self, session: Session, event: Dict[str, Any]) -> Dict[str, Any]:
        """Handle customer.subscription.created"""
        
        stripe_sub = event['data']['object']
        
        company_id = int(stripe_sub['metadata'].get('company_id', 0))
        if not company_id:
            logger.warning("No company_id in subscription metadata")
            return {"status": "error", "reason": "missing_company_id"}
        
        plan_code = stripe_sub['metadata'].get('plan_code', 'starter')
        
        # Determine billing period from items
        billing_period = "month"
        if stripe_sub['items']['data']:
            interval = stripe_sub['items']['data'][0]['plan']['interval']
            billing_period = "year" if interval == "year" else "month"
        
        # Create subscription record
        subscription = Subscription(
            company_id=company_id,
            stripe_subscription_id=stripe_sub['id'],
            stripe_customer_id=stripe_sub['customer'],
            plan_code=plan_code,
            status=SubscriptionStatus(stripe_sub['status']),
            current_period_start=datetime.fromtimestamp(stripe_sub['current_period_start'], tz=timezone.utc),
            current_period_end=datetime.fromtimestamp(stripe_sub['current_period_end'], tz=timezone.utc),
            cancel_at_period_end=stripe_sub['cancel_at_period_end'],
            amount=stripe_sub['items']['data'][0]['plan']['amount'],
            currency=stripe_sub['currency'],
            billing_period=billing_period
        )
        
        # Handle trial
        if stripe_sub.get('trial_end'):
            subscription.trial_end = datetime.fromtimestamp(stripe_sub['trial_end'], tz=timezone.utc)
        
        session.add(subscription)
        session.flush()
        
        # Grant entitlements
        self._grant_plan_entitlements(session, company_id, plan_code)
        
        logger.info(f"Created subscription {subscription.id} for company {company_id}")
        
        return {"status": "created", "subscription_id": subscription.id}
    
    def _handle_subscription_updated(self, session: Session, event: Dict[str, Any]) -> Dict[str, Any]:
        """Handle customer.subscription.updated"""
        
        stripe_sub = event['data']['object']
        
        # Find existing subscription
        subscription = session.exec(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_sub['id']
            )
        ).first()
        
        if not subscription:
            logger.warning(f"Subscription not found: {stripe_sub['id']}")
            return {"status": "error", "reason": "subscription_not_found"}
        
        # Update fields
        subscription.status = SubscriptionStatus(stripe_sub['status'])
        subscription.current_period_start = datetime.fromtimestamp(stripe_sub['current_period_start'], tz=timezone.utc)
        subscription.current_period_end = datetime.fromtimestamp(stripe_sub['current_period_end'], tz=timezone.utc)
        subscription.cancel_at_period_end = stripe_sub['cancel_at_period_end']
        
        # Check for plan change
        previous_attributes = event['data'].get('previous_attributes', {})
        if 'metadata' in previous_attributes:
            old_plan = previous_attributes['metadata'].get('plan_code')
            new_plan = stripe_sub['metadata'].get('plan_code')
            
            if old_plan and new_plan and old_plan != new_plan:
                subscription.plan_code = new_plan
                # Update entitlements
                self._grant_plan_entitlements(session, subscription.company_id, new_plan)
                logger.info(f"Plan changed from {old_plan} to {new_plan}")
        
        session.add(subscription)
        
        logger.info(f"Updated subscription {subscription.id}, status={subscription.status.value}")
        
        return {"status": "updated", "subscription_id": subscription.id}
    
    def _handle_subscription_deleted(self, session: Session, event: Dict[str, Any]) -> Dict[str, Any]:
        """Handle customer.subscription.deleted"""
        
        stripe_sub = event['data']['object']
        
        subscription = session.exec(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_sub['id']
            )
        ).first()
        
        if not subscription:
            return {"status": "error", "reason": "subscription_not_found"}
        
        subscription.status = SubscriptionStatus.CANCELED
        session.add(subscription)
        
        # Revoke entitlements
        self._revoke_entitlements(session, subscription.company_id)
        
        logger.info(f"Subscription {subscription.id} deleted")
        
        return {"status": "deleted", "subscription_id": subscription.id}
    
    def _handle_invoice_paid(self, session: Session, event: Dict[str, Any]) -> Dict[str, Any]:
        """Handle invoice.paid"""
        
        stripe_invoice = event['data']['object']
        subscription_id = stripe_invoice.get('subscription')
        
        if not subscription_id:
            return {"status": "ignored", "reason": "no_subscription"}
        
        # Find subscription
        subscription = session.exec(
            select(Subscription).where(
                Subscription.stripe_subscription_id == subscription_id
            )
        ).first()
        
        if not subscription:
            return {"status": "error", "reason": "subscription_not_found"}
        
        # Create invoice record
        invoice = Invoice(
            company_id=subscription.company_id,
            subscription_id=subscription.id,
            stripe_invoice_id=stripe_invoice['id'],
            status=InvoiceStatus.PAID,
            amount_due=stripe_invoice['amount_due'],
            amount_paid=stripe_invoice['amount_paid'],
            currency=stripe_invoice['currency'],
            invoice_date=datetime.fromtimestamp(stripe_invoice['created'], tz=timezone.utc),
            due_date=datetime.fromtimestamp(stripe_invoice['due_date'], tz=timezone.utc) if stripe_invoice.get('due_date') else None,
            paid_at=datetime.fromtimestamp(stripe_invoice['status_transitions']['paid_at'], tz=timezone.utc),
            hosted_invoice_url=stripe_invoice.get('hosted_invoice_url'),
            invoice_pdf_url=stripe_invoice.get('invoice_pdf')
        )
        
        session.add(invoice)
        
        logger.info(f"Invoice paid: {invoice.stripe_invoice_id}")
        
        return {"status": "recorded", "invoice_id": invoice.id}
    
    def _handle_invoice_payment_failed(self, session: Session, event: Dict[str, Any]) -> Dict[str, Any]:
        """Handle invoice.payment_failed"""
        
        stripe_invoice = event['data']['object']
        subscription_id = stripe_invoice.get('subscription')
        
        if not subscription_id:
            return {"status": "ignored", "reason": "no_subscription"}
        
        subscription = session.exec(
            select(Subscription).where(
                Subscription.stripe_subscription_id == subscription_id
            )
        ).first()
        
        if not subscription:
            return {"status": "error", "reason": "subscription_not_found"}
        
        # Update subscription status to past_due
        subscription.status = SubscriptionStatus.PAST_DUE
        session.add(subscription)
        
        logger.warning(f"Payment failed for subscription {subscription.id}")
        
        # TODO: Send notification to company admin
        
        return {"status": "marked_past_due", "subscription_id": subscription.id}
    
    def _grant_plan_entitlements(self, session: Session, company_id: int, plan_code: str):
        """Grant entitlements based on plan"""
        
        if plan_code not in SUBSCRIPTION_PLANS:
            logger.error(f"Invalid plan code: {plan_code}")
            return
        
        plan_features = SUBSCRIPTION_PLANS[plan_code]['features']
        
        # Clear existing entitlements
        self._revoke_entitlements(session, company_id)
        
        # Create new entitlements
        for feature_code, value in plan_features.items():
            if feature_code.endswith('_limit'):
                # Numeric limit
                entitlement = Entitlement(
                    company_id=company_id,
                    feature_code=feature_code,
                    is_enabled=True,
                    usage_limit=value if value > 0 else None,
                    current_usage=0
                )
            elif feature_code.endswith('_enabled'):
                # Boolean feature
                entitlement = Entitlement(
                    company_id=company_id,
                    feature_code=feature_code,
                    is_enabled=value
                )
            else:
                continue
            
            session.add(entitlement)
        
        logger.info(f"Granted {len(plan_features)} entitlements to company {company_id}")
    
    def _revoke_entitlements(self, session: Session, company_id: int):
        """Revoke all entitlements for company"""
        
        entitlements = session.exec(
            select(Entitlement).where(Entitlement.company_id == company_id)
        ).all()
        
        for entitlement in entitlements:
            session.delete(entitlement)
        
        logger.info(f"Revoked {len(entitlements)} entitlements for company {company_id}")
