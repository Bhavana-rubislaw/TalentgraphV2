# TalentGraph Phase 3 & 4 Deployment Guide

## Overview

This guide walks through deploying Phase 3 & 4 features:
- **Phase 3.1**: File attachments with S3 storage
- **Phase 3.2**: Inbound email threading with SendGrid
- **Phase 4.1**: Subscription billing with Stripe
- **Phase 4.2**: Analytics pipeline with event tracking
- **Phase 4.3**: Automated lifecycle actions

**Estimated Time**: 4-6 hours for full deployment

## Prerequisites

- [ ] Python 3.10+
- [ ] PostgreSQL 14+
- [ ] Access to AWS, SendGrid, and Stripe accounts
- [ ] Domain with DNS configuration access
- [ ] Database backup taken

## Phase 1: Infrastructure Setup

### 1.1 AWS S3 Bucket

```bash
# Create S3 bucket
aws s3 mb s3://talentgraph-attachments --region us-east-1

# Configure CORS
aws s3api put-bucket-cors --bucket talentgraph-attachments --cors-configuration file://s3-cors.json
```

**s3-cors.json**:
```json
{
  "CORSRules": [{
    "AllowedOrigins": ["https://talentgraph.com", "http://localhost:3003"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }]
}
```

Create IAM user with S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
      "s3:ListBucket"
    ],
    "Resource": [
      "arn:aws:s3:::talentgraph-attachments",
      "arn:aws:s3:::talentgraph-attachments/*"
    ]
  }]
}
```

Save the Access Key ID and Secret Access Key.

### 1.2 SendGrid Configuration

1. **Create Account**: Sign up at https://sendgrid.com

2. **Verify Domain**: 
   - Go to Settings → Sender Authentication
   - Verify your domain (e.g., talentgraph.com)
   - Add required DNS records (SPF, DKIM, CNAME)

3. **Create API Key**:
   - Go to Settings → API Keys
   - Create key with "Mail Send" and "Webhooks" permissions
   - Save the API key (starts with `SG.`)

4. **Configure Inbound Parse**:
   - Go to Settings → Inbound Parse
   - Add hostname: `reply.talentgraph.com`
   - Set webhook URL: `https://api.talentgraph.com/webhooks/email/inbound`
   - Add DNS MX record: `reply.talentgraph.com MX 10 mx.sendgrid.net`

5. **Event Webhooks**:
   - Go to Settings → Mail Settings → Event Webhook
   - HTTP POST URL: `https://api.talentgraph.com/webhooks/email/events`
   - Select events: Delivered, Opened, Clicked, Bounced
   - Enable signature verification

### 1.3 Stripe Configuration

1. **Create Account**: Sign up at https://stripe.com

2. **Get API Keys**:
   - Dashboard → Developers → API Keys
   - Save both Publishable and Secret keys
   - Use test keys initially (`pk_test_*`, `sk_test_*`)

3. **Create Products & Prices**:

```bash
# Starter Plan
stripe products create \\
  --name="Starter Plan" \\
  --description="Perfect for small teams"

# Monthly price
stripe prices create \\
  --product=prod_starter \\
  --unit-amount=9900 \\
  --currency=usd \\
  --recurring interval=month

# Yearly price (save price ID as STRIPE_PRICE_STARTER_YEAR)
stripe prices create \\
  --product=prod_starter \\
  --unit-amount=99000 \\
  --currency=usd \\
  --recurring interval=year

# Repeat for Professional ($299) and Enterprise ($999)
```

4. **Configure Webhooks**:
   - Dashboard → Developers → Webhooks
   - Add endpoint: `https://api.talentgraph.com/billing/webhooks/stripe`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
   - Save the webhook secret (starts with `whsec_`)

## Phase 2: Application Deployment

### 2.1 Install Dependencies

```bash
cd backend2
pip install -r requirements.txt
```

New dependencies:
- `boto3==1.34.0` - AWS S3
- `sendgrid==6.11.0` - Email service
- `stripe==8.0.0` - Payments
- `apscheduler==3.10.4` - Background workers

### 2.2 Configure Environment Variables

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
nano .env
```

**Required Variables**:
```bash
# Storage
STORAGE_PROVIDER=s3
S3_BUCKET_NAME=talentgraph-attachments
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG....
SENDGRID_WEBHOOK_SECRET=...
SENDGRID_FROM_EMAIL=noreply@talentgraph.com
REPLY_TO_DOMAIN=talentgraph.com

# Billing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTH=price_...
STRIPE_PRICE_STARTER_YEAR=price_...
STRIPE_PRICE_PROFESSIONAL_MONTH=price_...
STRIPE_PRICE_PROFESSIONAL_YEAR=price_...
STRIPE_PRICE_ENTERPRISE_MONTH=price_...
STRIPE_PRICE_ENTERPRISE_YEAR=price_...

# Application
APP_BASE_URL=https://api.talentgraph.com
FRONTEND_URL=https://talentgraph.com

# Workers
WORKERS_ENABLED=true
```

### 2.3 Database Migration

```bash
# Backup database
pg_dump talentgraph_v2 > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migration
python migrate_phase3_phase4.py
```

This creates 9 new tables:
- `message_attachment`
- `email_thread_link`
- `inbound_email_event`
- `subscription`
- `invoice`
- `payment_event`
- `entitlement`
- `analytics_event`
- `analytics_rollup_daily`

### 2.4 Update Application Code

**app/main.py**: Register new routers

```python
from app.routers import attachments, email_webhooks, billing, analytics
from app.workers import start_workers, stop_workers

# Register routers
app.include_router(attachments.router)
app.include_router(email_webhooks.router)
app.include_router(billing.router)
app.include_router(analytics.router)

# Start workers on startup
@app.on_event("startup")
async def startup_event():
    start_workers()
    logger.info("Background workers started")

# Stop workers on shutdown
@app.on_event("shutdown")
async def shutdown_event():
    stop_workers()
    logger.info("Background workers stopped")
```

**app/models.py**: Import Phase 3 & 4 models

```python
from PHASE3_PHASE4_MODELS import (
    AttachmentScanStatus, EmailProvider, SubscriptionStatus, InvoiceStatus,
    AnalyticsEventType, MessageAttachment, EmailThreadLink, InboundEmailEvent,
    Subscription, Invoice, PaymentEvent, Entitlement,
    AnalyticsEvent, AnalyticsRollupDaily
)
```

### 2.5 Restart Application

```bash
# Stop current process
sudo systemctl stop talentgraph-api

# Start with new code
sudo systemctl start talentgraph-api

# Check status
sudo systemctl status talentgraph-api

# Check logs
sudo journalctl -u talentgraph-api -f
```

## Phase 3: Testing

### 3.1 Test File Uploads

```bash
# Test presigned URL generation
curl -X POST https://api.talentgraph.com/attachments/upload-url \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "filename": "resume.pdf",
    "mime_type": "application/pdf",
    "size_bytes": 102400,
    "checksum_sha256": "abc123..."
  }'

# Should return presigned upload URL
```

### 3.2 Test Email Webhooks

```bash
# Test inbound email parsing
curl -X POST https://api.talentgraph.com/webhooks/email/inbound \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "reply-test-token@talentgraph.com",
    "from": "candidate@example.com",
    "subject": "Re: Interview",
    "text": "Thank you for the opportunity!"
  }'
```

### 3.3 Test Billing Flow

```bash
# Create checkout session
curl -X POST https://api.talentgraph.com/billing/create-checkout-session \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "plan_code": "starter",
    "billing_period": "month"
  }'

# Complete checkout in Stripe test mode
# Verify subscription created in database
```

### 3.4 Test Workers

```bash
# Check scheduler status
python -c "
from app.workers.scheduler import get_scheduler_status
print(get_scheduler_status())
"

# Manually trigger lifecycle worker
python -c "
from app.workers.scheduler import trigger_job_now
trigger_job_now('lifecycle_worker')
"
```

## Phase 4: Monitoring

### 4.1 Application Logs

```bash
# Watch application logs
tail -f /var/log/talentgraph/app.log | grep -E "ERROR|WARNING|worker"

# Watch worker logs specifically
tail -f /var/log/talentgraph/app.log | grep "\\[.*_worker\\]"
```

### 4.2 Database Monitoring

```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check attachment storage usage
SELECT 
    COUNT(*) as total_attachments,
    SUM(size_bytes) as total_bytes,
    pg_size_pretty(SUM(size_bytes)::bigint) as total_size
FROM message_attachment;

-- Check subscription status
SELECT 
    status,
    COUNT(*) as count
FROM subscription
GROUP BY status;

-- Check analytics events by type
SELECT 
    event_type,
    COUNT(*) as count
FROM analytics_event
WHERE event_time >= NOW() - INTERVAL '7 days'
GROUP BY event_type
ORDER BY count DESC;
```

### 4.3 External Service Health

```bash
# Test S3 access
aws s3 ls s3://talentgraph-attachments/

# Test SendGrid API
curl -X GET https://api.sendgrid.com/v3/user/profile \\
  -H "Authorization: Bearer $SENDGRID_API_KEY"

# Test Stripe API
curl https://api.stripe.com/v1/customers?limit=1 \\
  -u $STRIPE_SECRET_KEY:
```

## Phase 5: Rollout Schedule

### Week 1: Attachments (Phase 3.1)
- [ ] Deploy storage service
- [ ] Deploy attachments router
- [ ] Enable `FEATURE_ATTACHMENTS_ENABLED=true`
- [ ] Monitor S3 usage and costs
- [ ] Test with internal users

### Week 2: Email Threading (Phase 3.2)
- [ ] Deploy email service
- [ ] Configure SendGrid inbound parse
- [ ] Deploy email webhooks router
- [ ] Enable `FEATURE_EMAIL_THREADING_ENABLED=true`
- [ ] Test with sample emails

### Week 3: Billing Soft Launch (Phase 4.1)
- [ ] Deploy billing service and router
- [ ] Configure Stripe webhooks
- [ ] Enable `FEATURE_BILLING_ENABLED=true`
- [ ] Test with Stripe test cards
- [ ] Invite beta testers

### Week 4: Analytics & Workers (Phase 4.2 & 4.3)
- [ ] Deploy analytics service and router
- [ ] Start background workers
- [ ] Enable `FEATURE_ANALYTICS_ENABLED=true`
- [ ] Enable `FEATURE_LIFECYCLE_AUTOMATION_ENABLED=true`
- [ ] Monitor worker execution

### Week 5: Full Production
- [ ] Switch to Stripe live keys
- [ ] Announce new features
- [ ] Monitor metrics
- [ ] Collect user feedback

## Troubleshooting

### Issue: S3 Upload Fails

**Symptoms**: 403 Forbidden when uploading to presigned URL

**Solution**:
1. Check S3 bucket CORS configuration
2. Verify IAM user has `s3:PutObject` permission
3. Check bucket policy doesn't block uploads
4. Verify presigned URL hasn't expired

### Issue: Email Webhooks Not Received

**Symptoms**: Inbound emails not creating messages

**Solution**:
1. Verify MX record: `dig reply.talentgraph.com MX`
2. Check SendGrid inbound parse configuration
3. Test webhook endpoint directly
4. Check webhook logs in SendGrid dashboard

### Issue: Worker Not Running

**Symptoms**: Lifecycle actions not executing

**Solution**:
```bash
# Check if scheduler started
python -c "
from app.workers.scheduler import get_scheduler_status
status = get_scheduler_status()
print('Running:', status['running'])
print('Jobs:', status['jobs'])
"

# Check for errors
grep "worker" /var/log/talentgraph/app.log | tail -50

# Manually trigger job
python -c "
from app.workers.scheduler import trigger_job_now
trigger_job_now('lifecycle_worker')
"
```

### Issue: Stripe Webhook Signature Verification Fails

**Symptoms**: 401 errors on webhook endpoint

**Solution**:
1. Verify `STRIPE_WEBHOOK_SECRET` matches dashboard
2. Check webhook is using correct endpoint URL
3. Test signature verification:

```python
import stripe
stripe.Webhook.construct_event(
    request.body,
    request.headers['Stripe-Signature'],
    os.getenv('STRIPE_WEBHOOK_SECRET')
)
```

## Rollback Plan

If critical issues occur:

```bash
# 1. Disable new features
cat > .env.local <<EOF
FEATURE_ATTACHMENTS_ENABLED=false
FEATURE_EMAIL_THREADING_ENABLED=false
FEATURE_BILLING_ENABLED=false
FEATURE_ANALYTICS_ENABLED=false
FEATURE_LIFECYCLE_AUTOMATION_ENABLED=false
WORKERS_ENABLED=false
EOF

# 2. Restart application
sudo systemctl restart talentgraph-api

# 3. Restore database if needed
psql talentgraph_v2 < backup_YYYYMMDD_HHMMSS.sql

# 4. Revert code
git revert <commit-hash>
```

## Success Criteria

### Phase 3.1 (Attachments)
- [ ] Users can upload files to messages
- [ ] Files stored in S3 with correct naming
- [ ] Download URLs work and expire correctly
- [ ] Scan status prevents blocked file downloads

### Phase 3.2 (Email Threading)
- [ ] Interview invitations sent with tokenized reply-to
- [ ] Inbound emails create in-app messages
- [ ] Tokenized action links work (confirm/cancel)
- [ ] Email audit trail captured

### Phase 4.1 (Billing)
- [ ] Checkout flow completes successfully
- [ ] Subscriptions sync with Stripe
- [ ] Invoices recorded correctly
- [ ] Entitlements enforce feature limits

### Phase 4.2 (Analytics)
- [ ] Events tracked automatically
- [ ] Daily rollup aggregates correctly
- [ ] Funnel metrics calculate accurately
- [ ] Dashboard displays data

### Phase 4.3 (Lifecycle)
- [ ] Expiry warnings sent 3 days before
- [ ] Expired jobs auto-frozen
- [ ] Interview reminders sent 24h before
- [ ] Workers execute on schedule

## Support & Documentation

- **API Documentation**: https://api.talentgraph.com/docs
- **Architecture Diagrams**: See `PHASE3_PHASE4_IMPLEMENTATION_PLAN.md`
- **Model Reference**: See `PHASE3_PHASE4_MODELS.py`
- **Service Docs**: See individual service files in `app/services/`

## Post-Deployment

### Week 1 After Launch
- Monitor error rates daily
- Check S3/SendGrid/Stripe costs
- Review worker execution logs
- Collect user feedback

### Week 2-4
- Optimize slow queries
- Adjust worker schedules if needed
- Fine-tune rate limits
- Add missing features based on feedback

### Month 2+
- Review analytics data quality
- Consider archival strategy for old events
- Evaluate additional storage providers
- Plan next phase features
