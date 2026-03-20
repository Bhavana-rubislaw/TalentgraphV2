# Job Lifecycle Management - Quick Start Guide

## For Recruiters

### How to Freeze a Job

1. Go to Recruiter Dashboard
2. Select the job posting from dropdown
3. Click **❄️ Freeze** button
4. Job is now frozen and will stop accepting applications
5. All existing applications are preserved

**When to freeze:**
- Temporarily pausing hiring
- Budget review in progress
- Waiting for internal approvals
- End of hiring season

---

### How to Reactivate a Frozen Job

1. Go to Recruiter Dashboard
2. Select a frozen job from the dropdown (if visible)
3. Click **🔄 Reactivate** button
4. Job reopens with status "Reposted"
5. Previous applicants are notified
6. Banner appears if prior applicants exist

**What happens:**
- Job accepts new applications
- Previous applicants notified
- Recruiter gets notification with applicant count
- All historical data retained

---

### How to Repost a Job

1. Go to Recruiter Dashboard
2. Select a frozen job
3. Click **📢 Repost** button
4. Job is refreshed for visibility
5. Applications remain intact

**When to repost:**
- Relaunching job after pause
- Boosting visibility
- New sourcing campaign

---

### Understanding Job Status Badges

- **🟢 Active** - Currently open and accepting applications
- **⚪ Frozen** - Temporarily closed, not accepting applications
- **🟣 Reposted** - Reopened job, may have prior applicants

---

### Reviewing Applications from Frozen Jobs

Even when a job is frozen:
- ✅ You can view all applications
- ✅ You can update application status
- ✅ You can add recruiter notes
- ✅ You can contact candidates
- ❌ New candidates cannot apply

---

### Prior Applicants Banner

When you reactivate a job that has previous applicants, you'll see a purple banner:

> 🔄 **Job Reopened with Previous Applicants**  
> This job has X prior applicant(s) from before it was frozen.  
> Review existing applications before sourcing new candidates.

**Action:** Click "View Applications" to review prior candidates.

---

## For Candidates

### What Happens When a Job is Frozen?

- You cannot submit new applications
- Error message: "This job is not currently accepting applications"
- Your existing application is preserved

### What Happens When a Job Reopens?

- You receive a notification: "Job Opportunity Reopened"
- Your prior application remains active
- You do NOT need to reapply
- Recruiter may review your existing application

---

## API Usage (Developers)

### Freeze a Job
```bash
POST /job-postings/26/status
Content-Type: application/json
Authorization: Bearer {token}

{
  "action": "freeze"
}
```

### Reactivate a Job
```bash
POST /job-postings/26/status
Content-Type: application/json
Authorization: Bearer {token}

{
  "action": "reactivate"
}
```

### Repost a Job
```bash
POST /job-postings/26/status
Content-Type: application/json
Authorization: Bearer {token}

{
  "action": "repost"
}
```

### Check Job Status
```bash
GET /job-postings/26
```

Response includes:
```json
{
  "id": 26,
  "status": "active" | "frozen" | "reposted",
  "frozen_at": "2026-03-19T10:20:00Z",
  "reposted_at": "2026-03-19T15:30:00Z",
  "last_reactivated_at": "2026-03-19T15:30:00Z"
}
```

---

## Common Scenarios

### Scenario 1: Temporary Hiring Pause

**Situation:** Company budget freeze for Q1

1. Freeze all active jobs
2. Preserve all applications received so far
3. When budget approved, reactivate jobs
4. Review prior applicants before new sourcing

### Scenario 2: Seasonal Hiring

**Situation:** Only hiring in certain months

1. Freeze jobs at end of season
2. Historical applications retained
3. Repost jobs when season starts
4. Prior candidates notified automatically

### Scenario 3: Internal Candidate Selection

**Situation:** Pausing external hiring to review internal candidates

1. Freeze job posting
2. Review internal candidates offline
3. If no internal hire, reactivate job
4. External applicants remain in system

### Scenario 4: Job Requirements Changed

**Situation:** Need to update job description

1. Freeze current job
2. Update job details
3. Repost with new description
4. Prior applicants informed of reopening

---

## Best Practices

### ✅ Do's

- Freeze jobs instead of deleting them
- Review prior applicants before sourcing new ones
- Use repost to signal renewed hiring efforts
- Keep historical applications for compliance

### ❌ Don'ts

- Don't delete jobs with applications
- Don't ignore prior applicants when reopening
- Don't reactivate jobs if requirements changed significantly
- Don't repost immediately after freezing (defeats purpose)

---

## FAQs

**Q: What's the difference between Freeze and Delete?**  
A: Freeze preserves everything; Delete marks job as frozen. Both keep applications. Use Freeze for temporary pauses.

**Q: Will candidates be auto-applied when a job reopens?**  
A: No. Their previous application remains, but they don't submit a new one.

**Q: Can I freeze a job that has no applications?**  
A: Yes. Freezing works regardless of application count.

**Q: How do I see frozen jobs?**  
A: Currently, frozen jobs are not shown in the main selector. Contact admin to view/manage frozen jobs.

**Q: What happens to matches when a job is frozen?**  
A: Matches are preserved. When reactivated, matching logic resumes.

**Q: Can I freeze multiple jobs at once?**  
A: Not yet. Freeze jobs individually. Bulk actions are a future enhancement.

**Q: Will frozen jobs appear in candidate search?**  
A: No. Only active and reposted jobs appear to candidates.

---

## Keyboard Shortcuts (Future)

Not yet implemented, but planned:

- `F` - Freeze selected job
- `R` - Reactivate selected job
- `P` - Repost selected job

---

## Need Help?

- **Backend Issues:** Check `/docs` endpoint or contact backend team
- **Frontend Issues:** Check browser console or contact frontend team
- **Migration Issues:** See migration troubleshooting in main documentation

---

**Last Updated:** March 19, 2026
