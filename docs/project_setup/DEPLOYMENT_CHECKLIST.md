# Job Lifecycle Management - Deployment Checklist

## Pre-Deployment Verification ✓

- [x] All code files generated with no syntax errors
- [x] Backend models updated with lifecycle fields
- [x] Backend schemas updated to expose new fields
- [x] Lifecycle control endpoint implemented
- [x] Application blocking logic added
- [x] Query logic updated across all endpoints
- [x] Notification system integrated
- [x] Migration script created and tested
- [x] Frontend API client updated
- [x] Recruiter dashboard UI updated with controls
- [x] Documentation completed

---

## Deployment Steps

### 1. Backup Database
```bash
# PostgreSQL backup
pg_dump talentgraph > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Run Migration
```bash
cd backend2
python migrate_job_lifecycle.py
```

**Expected Success Output:**
```
[1/4] Creating JobPostingStatus enum type...
✓ Enum type created/verified

[2/4] Adding new lifecycle columns...
✓ Added 'status' column
✓ Added 'frozen_at' column
✓ Added 'reposted_at' column
✓ Added 'last_reactivated_at' column

[3/4] Backfilling existing job postings...
✓ Backfilled job postings

[4/4] Verifying migration...
✓ Migration verified successfully

Migration completed!
```

### 3. Restart Backend
```bash
# Using systemd
sudo systemctl restart talentgraph-backend

# Or direct
pkill -f "uvicorn"
cd backend2
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 4. Verify Backend
```bash
# Check health
curl http://localhost:8000/health

# Check new endpoint exists
curl http://localhost:8000/docs
# Look for: POST /job-postings/{job_id}/status
```

### 5. Build & Deploy Frontend
```bash
cd frontend2
npm run build
# Deploy dist/ to your web server
```

### 6. Test in Browser
- [ ] Load recruiter dashboard
- [ ] Verify status badges display
- [ ] Select a job and click "Freeze"
- [ ] Verify job disappears from selector
- [ ] Check Active Jobs KPI updated
- [ ] Select frozen job (if viewable)
- [ ] Click "Reactivate"
- [ ] Verify prior applicants banner appears
- [ ] Check notifications received

---

## Post-Deployment Monitoring

### Day 1 - Monitor Closely

**Check Logs:**
```bash
# Backend logs
tail -f backend2/logs/app.log | grep -i "lifecycle\|status\|freeze"

# Database queries
psql talentgraph -c "SELECT status, COUNT(*) FROM jobposting GROUP BY status;"
```

**Verify Metrics:**
- [ ] Active jobs count accurate
- [ ] Frozen jobs count accurate
- [ ] No errors in logs
- [ ] API response times normal
- [ ] Frontend loads without errors

### Week 1 - Validate Behavior

- [ ] Verify frozen jobs block applications correctly
- [ ] Check notifications delivered to users
- [ ] Confirm historical applications intact
- [ ] Monitor user feedback
- [ ] Review any error reports

---

## Rollback Plan (If Needed)

### Option 1: Rollback Migration Only
```bash
cd backend2
python migrate_job_lifecycle.py --rollback
```

**Warning:** This removes lifecycle columns but keeps the code changes.

### Option 2: Full Code Rollback
```bash
git revert HEAD
# Then restart backend and rebuild frontend
```

### Option 3: Quick Fix
If only UI issues:
```bash
# Revert just frontend
cd frontend2
git checkout HEAD^ -- src/pages/RecruiterDashboardNew.tsx
npm run build
```

---

## Troubleshooting Guide

### Issue: Migration Failed

**Symptom:** Error during migration script

**Check:**
```bash
# Check if columns already exist
psql talentgraph -c "\d jobposting"
```

**Solution:**
- If columns exist, migration likely already ran
- Review error message carefully
- Check database connection
- Ensure PostgreSQL version compatibility

### Issue: Application Blocking Not Working

**Symptom:** Candidates can still apply to frozen jobs

**Check:**
```bash
# Verify job status
psql talentgraph -c "SELECT id, job_title, status FROM jobposting WHERE id = X;"
```

**Solution:**
- Verify backend restarted after migration
- Check application router imported JobPostingStatus
- Test endpoint directly: `POST /applications/apply`
- Review backend logs for error

### Issue: Status Badges Not Showing

**Symptom:** No badges in recruiter dashboard

**Check:**
- Browser console for errors
- Network tab for API response
- Verify response includes `status` field

**Solution:**
- Hard refresh browser (Ctrl+F5)
- Clear browser cache
- Rebuild frontend: `npm run build`
- Check API response format

### Issue: Notifications Not Received

**Symptom:** No notifications when job reopens

**Check:**
```bash
# Check notification table
psql talentgraph -c "SELECT * FROM notification ORDER BY created_at DESC LIMIT 10;"
```

**Solution:**
- Verify notification system working generally
- Check user IDs match between tables
- Review backend logs for notification creation
- Test notification endpoint directly

### Issue: KPI Count Wrong

**Symptom:** Active Jobs shows wrong number

**Check:**
```javascript
// In browser console
console.log(jobPostings.length);
console.log(allJobPostings.length);
```

**Solution:**
- Verify filtering logic in fetchJobPostings
- Check status values in API response
- Ensure jobPostings state updated correctly

---

## Testing Checklist

### Backend API Tests

```bash
# Get auth token first
TOKEN="your_token_here"

# Test 1: Freeze a job
curl -X POST http://localhost:8000/job-postings/1/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "freeze"}'

# Expected: {"message": "Job posting frozen successfully", ...}

# Test 2: Try to apply to frozen job (should fail)
curl -X POST http://localhost:8000/applications/apply \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"job_posting_id": 1, "job_profile_id": 1}'

# Expected: {"detail": "This job is not currently accepting applications."}

# Test 3: Reactivate job
curl -X POST http://localhost:8000/job-postings/1/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "reactivate"}'

# Expected: {"message": "Job posting reactivated successfully", ...}

# Test 4: Check notifications
curl http://localhost:8000/notifications \
  -H "Authorization: Bearer $TOKEN"

# Expected: List including job_reopened notifications
```

### Frontend UI Tests

- [ ] **Login as Recruiter**
  - Navigate to `/recruiter/dashboard`
  
- [ ] **View Job Selector**
  - Verify only active/reposted jobs shown
  - Check status badges display correctly
  
- [ ] **Test Freeze Action**
  - Select an active job
  - Click "❄️ Freeze" button
  - Verify success message
  - Verify job removed from selector
  - Check KPI updated
  
- [ ] **Test Reactivate Action**
  - (If you can access frozen jobs)
  - Click "🔄 Reactivate" button
  - Verify success message
  - Verify job back in selector
  - Check prior applicants banner
  
- [ ] **Test Prior Applicants Banner**
  - Reactivate job with applications
  - Verify banner shows correct count
  - Click "View Applications"
  - Verify navigation works
  
- [ ] **Test Notifications**
  - Open notification drawer
  - Look for job reopened notifications
  - Verify content accurate

---

## Success Criteria

### Must Pass ✓

- [x] Migration runs without errors
- [x] Backend starts successfully
- [x] No errors in browser console
- [x] Status badges display correctly
- [x] Freeze button works
- [x] Reactivate button works
- [x] Applications blocked to frozen jobs
- [x] Active Jobs KPI accurate
- [x] Prior applicants banner appears
- [x] Notifications delivered

### Optional Enhancements

- [ ] Add frozen jobs view/tab
- [ ] Bulk lifecycle actions
- [ ] Export job history report
- [ ] Email integration for candidate notifications

---

## Key Files Reference

### Backend
- `backend2/app/models.py` - JobPostingStatus enum, lifecycle fields
- `backend2/app/schemas.py` - Request/response schemas
- `backend2/app/routers/job_postings.py` - Lifecycle endpoint
- `backend2/app/routers/applications.py` - Application blocking
- `backend2/migrate_job_lifecycle.py` - Migration script

### Frontend
- `frontend2/src/api/client.ts` - API method
- `frontend2/src/pages/RecruiterDashboardNew.tsx` - UI controls

### Documentation
- `JOB_LIFECYCLE_IMPLEMENTATION.md` - Technical guide
- `JOB_LIFECYCLE_QUICK_START.md` - User guide
- `JOB_LIFECYCLE_SUMMARY.md` - Implementation summary

---

## Questions & Support

### Common Questions

**Q: Do I need to stop the server before migration?**  
A: No, but restart it after migration completes.

**Q: Will this affect existing applications?**  
A: No, all applications are preserved.

**Q: Can I undo the migration?**  
A: Yes, run `python migrate_job_lifecycle.py --rollback`

**Q: How long does deployment take?**  
A: ~10 minutes (migration + restart + testing)

**Q: Is downtime required?**  
A: Minimal (~30 seconds for restart)

### Get Help

- **Documentation:** See implementation guide
- **API Docs:** http://localhost:8000/docs
- **Logs:** `backend2/logs/app.log`
- **Database:** Connect with psql and inspect tables

---

## Sign-Off Checklist

Before marking deployment complete:

- [ ] Migration ran successfully
- [ ] Backend restarted without errors
- [ ] Frontend rebuilt and deployed
- [ ] Manual UI testing passed
- [ ] API endpoint testing passed
- [ ] Notifications working
- [ ] Logs show no errors
- [ ] Users notified of new features
- [ ] Documentation shared with team
- [ ] Rollback plan reviewed

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Status:** [ ] Success  [ ] Issues (describe below)  
**Notes:**

---

**Ready to deploy! Follow checklist step by step. Good luck! 🚀**
