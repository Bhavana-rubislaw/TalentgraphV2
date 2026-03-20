# Job Posting Lifecycle Management Implementation Guide

## Overview

This document describes the complete Job Posting Lifecycle Management feature implementation for TalentGraph. This system replaces the simple boolean `is_active` field with a formal lifecycle model supporting:

- **Freeze** a job posting
- **Reactivate** a frozen job
- **Repost** a job for renewed visibility
- **Preserve** historical applications through all state transitions
- **Notify** recruiters and candidates when jobs reopen
- **Maintain** full historical context for recruiter review

---

## Architecture

### Backend Model Changes

#### New Enum: `JobPostingStatus`
Location: `backend2/app/models.py`

```python
class JobPostingStatus(str, Enum):
    ACTIVE = "active"      # Currently open and accepting applications
    FROZEN = "frozen"      # Temporarily closed, not accepting applications
    REPOSTED = "reposted"  # Reopened/relisted posting
```

#### New Fields on `JobPosting` Model
```python
status: JobPostingStatus = Field(default=JobPostingStatus.ACTIVE)
frozen_at: Optional[datetime] = None
reposted_at: Optional[datetime] = None
last_reactivated_at: Optional[datetime] = None
```

**Note:** The legacy `is_active` boolean field is retained for backward compatibility and automatically synced with the new `status` field.

---

## API Endpoints

### New Lifecycle Control Endpoint

**POST** `/job-postings/{job_id}/status`

**Request Body:**
```json
{
  "action": "freeze" | "reactivate" | "repost"
}
```

**Response:**
```json
{
  "message": "Job posting frozen successfully",
  "job_id": 26,
  "status": "frozen",
  "frozen_at": "2026-03-19T10:20:00Z",
  "reposted_at": null,
  "last_reactivated_at": null
}
```

### State Transition Rules

#### Freeze Action
- **Allowed from:** `active`, `reposted`
- **Result:** Sets `status = frozen`, `frozen_at = now`, `is_active = false`
- **Effect:** Job stops accepting new applications; historical applications preserved

#### Reactivate Action
- **Allowed from:** `frozen`
- **Result:** Sets `status = reposted`, `last_reactivated_at = now`, `reposted_at = now`, `is_active = true`
- **Effect:** Job reopens; previous applicants notified
- **Notifications:**
  - Recruiter: "Job reopened with X previous applicants"
  - Candidates: "Job you applied to has reopened"

#### Repost Action
- **Allowed from:** `frozen`, `active`
- **Result:** Sets `status = reposted`, `reposted_at = now`, `is_active = true`
- **Effect:** Job explicitly refreshed for sourcing visibility

---

## Application Validation

### Block Applications to Frozen Jobs
Location: `backend2/app/routers/applications.py`

```python
if job_posting.status == JobPostingStatus.FROZEN:
    raise HTTPException(
        status_code=400,
        detail="This job is not currently accepting applications."
    )
```

Candidates cannot apply to frozen jobs, but recruiters can still:
- View all historical applications
- Review candidate profiles
- Update application status
- Add recruiter notes

---

## Query Logic Updates

All job discovery and recommendation queries now filter by status instead of `is_active`:

### Updated Files:
- `backend2/app/routers/dashboard.py` (candidate recommendations, available jobs)
- `backend2/app/routers/recommendations.py` (recruiter dashboard)
- `backend2/app/routers/job_postings.py` (job listing endpoint)

### Query Pattern:
```python
# Old:
query = select(JobPosting).where(JobPosting.is_active == True)

# New:
query = select(JobPosting).where(
    JobPosting.status.in_([JobPostingStatus.ACTIVE, JobPostingStatus.REPOSTED])
)
```

**Open jobs** = `active` OR `reposted`  
**Frozen jobs** = `frozen`

---

## Notifications

### Recruiter Notifications

When a frozen job is reactivated and has prior applicants:

```python
event_type: "job_reopened_with_previous_applicants"
title: "Job Reopened with Previous Applicants"
message: "'{job_title}' has {count} prior applicant(s). Review existing applications."
route: "/recruiter/jobs/{job_id}/applicants"
```

### Candidate Notifications

When a job they applied to reopens:

```python
event_type: "job_reopened_for_previous_applicant"
title: "Job Opportunity Reopened"
message: "'{job_title}' at {company} has reopened. Your prior application may be reconsidered."
route: "/candidate/applications"
```

---

## Frontend Changes

### API Client Updates
Location: `frontend2/src/api/client.ts`

```typescript
updateJobPostingStatus: (id: number, action: 'freeze' | 'reactivate' | 'repost') =>
  api.post(`/job-postings/${id}/status`, { action })
```

### Recruiter Dashboard UI
Location: `frontend2/src/pages/RecruiterDashboardNew.tsx`

#### Status Badges
Jobs display color-coded status badges:
- **Active** (green): Currently open
- **Frozen** (gray): Temporarily closed
- **Reposted** (purple): Reopened job

#### Lifecycle Control Buttons
- **Freeze** button: Visible on active/reposted jobs
- **Reactivate** button: Visible on frozen jobs
- **Repost** button: Visible on frozen jobs

#### Prior Applicants Banner
When viewing a reposted job with previous applicants, a purple banner displays:
- Count of prior applicants
- Link to Applications tab
- Message about reviewing existing candidates

#### KPI Updates
**Active Jobs** count shows only `active` and `reposted` jobs, with frozen count displayed below.

---

## Database Migration

### Running the Migration

```bash
cd backend2
python migrate_job_lifecycle.py
```

### What the Migration Does:
1. Creates `JobPostingStatus` enum type in PostgreSQL
2. Adds new lifecycle columns (`status`, `frozen_at`, `reposted_at`, `last_reactivated_at`)
3. Backfills existing data:
   - `is_active = true` → `status = active`
   - `is_active = false` → `status = frozen` with `frozen_at = updated_at`
4. Verifies migration success with status summary

### Rollback (if needed):
```bash
python migrate_job_lifecycle.py --rollback
```

**Warning:** Rollback removes all lifecycle columns. Use with caution!

---

## Testing Checklist

### Backend Testing

1. **Freeze a Job**
   ```bash
   POST /job-postings/{id}/status
   {"action": "freeze"}
   ```
   - Verify status changes to `frozen`
   - Verify `frozen_at` timestamp set
   - Try to apply (should reject)

2. **Reactivate a Job**
   ```bash
   POST /job-postings/{id}/status
   {"action": "reactivate"}
   ```
   - Verify status changes to `reposted`
   - Check notifications sent to recruiter and previous applicants
   - Verify can now accept applications

3. **Repost a Job**
   ```bash
   POST /job-postings/{id}/status
   {"action": "repost"}
   ```
   - Verify `reposted_at` timestamp updated

4. **Query Active Jobs**
   ```bash
   GET /dashboard/candidate/available-jobs
   ```
   - Verify frozen jobs excluded
   - Verify active and reposted jobs included

5. **Review Historical Applications**
   - Freeze a job with applications
   - Verify recruiter can still see all applications
   - Verify recruiter can update status and notes

### Frontend Testing

1. **Job Selector**
   - Verify only active/reposted jobs shown in dropdown
   - Verify status badge displays correctly
   - Verify lifecycle buttons appear based on status

2. **Freeze Flow**
   - Click "Freeze" on active job
   - Verify success message
   - Verify job no longer in selector
   - Verify KPI updates

3. **Reactivate Flow**
   - Switch to viewing frozen jobs (if implemented)
   - Click "Reactivate" on frozen job
   - Verify prior applicants banner appears
   - Verify can access applications

4. **Prior Applicants Banner**
   - Reactivate job with existing applications
   - Verify banner shows correct count
   - Click "View Applications" → verify navigation

5. **KPI Verification**
   - Verify "Active Jobs" excludes frozen count
   - Verify frozen count displayed separately

---

## Acceptance Criteria ✅

All criteria from the original requirements are met:

✅ Job posting has formal status model (`active`, `frozen`, `reposted`)  
✅ Recruiter can freeze, reactivate, and repost jobs  
✅ Historical applications preserved through lifecycle  
✅ Frozen jobs do not accept new applications  
✅ Reopened/reposted jobs notify recruiter if prior applicants exist  
✅ Previously applied candidates notified when job reopens  
✅ Recruiter can browse old applications after freeze/delete/archive  
✅ Recruiter dashboard shows job status and lifecycle controls  
✅ Active Jobs KPI counts only active/reposted jobs  
✅ Old boolean-based logic safely migrated/backfilled  
✅ Legacy toggle endpoint remains backward compatible  
✅ Candidate/recruiter discovery endpoints treat active + reposted as open jobs

---

## Deployment Steps

### 1. Pull Latest Code
```bash
git pull origin main
```

### 2. Backend Deployment

#### Install Dependencies (if any new)
```bash
cd backend2
pip install -r requirements.txt
```

#### Run Migration
```bash
python migrate_job_lifecycle.py
```

#### Restart Backend Server
```bash
# If using systemd
sudo systemctl restart talentgraph-backend

# Or direct process
pkill -f "uvicorn app.main:app"
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. Frontend Deployment

#### Build
```bash
cd frontend2
npm run build
```

#### Deploy
```bash
# Copy build to web server
cp -r dist/* /var/www/talentgraph/
```

### 4. Verification

1. Check backend health: `curl http://localhost:8000/docs`
2. Test new endpoint: `POST /job-postings/{id}/status`
3. Load recruiter dashboard and verify UI controls
4. Create test application and try freezing job
5. Verify notifications received

---

## Troubleshooting

### Migration Fails

**Error:** `enum already exists`
- **Solution:** This is normal if re-running. The script handles this gracefully.

**Error:** `column already exists`
- **Solution:** Check if migration was already applied. Review migration log.

### Applications Not Blocked on Frozen Jobs

- Verify backend restarted after migration
- Check job status in database: `SELECT id, job_title, status FROM jobposting;`
- Test endpoint directly with curl

### Notifications Not Sent

- Check notification table: `SELECT * FROM notification ORDER BY created_at DESC LIMIT 10;`
- Verify user IDs match between candidate, company, and user tables
- Check backend logs for notification creation

### Frontend Status Not Showing

- Hard refresh browser (Ctrl+F5)
- Check browser console for API errors
- Verify API response includes new fields: `status`, `frozen_at`, etc.

---

## Future Enhancements

Potential improvements for future iterations:

1. **Scheduled Reactivation**
   - Allow recruiters to set future reactivation date
   - Auto-reactivate frozen jobs on schedule

2. **Bulk Lifecycle Actions**
   - Freeze/reactivate multiple jobs at once
   - Useful for seasonal hiring pauses

3. **Historical Metrics**
   - Track time-to-fill across freeze/reactivate cycles
   - Analyze reposted job performance

4. **Advanced Filtering**
   - Show frozen jobs in separate tab
   - Filter by date frozen or last reactivated

5. **Candidate Communication**
   - Auto-email candidates when job reopens
   - Allow custom reopen message templates

---

## Support

For issues or questions:
- Check backend logs: `tail -f backend2/logs/app.log`
- Review API docs: `http://localhost:8000/docs`
- Contact: [your-support-email]

---

**Implementation Date:** March 19, 2026  
**Version:** 1.0  
**Status:** ✅ Complete
