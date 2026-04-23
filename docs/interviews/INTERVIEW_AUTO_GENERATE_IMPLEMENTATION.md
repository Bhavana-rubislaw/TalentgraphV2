# Interview Scheduling Auto-Generate Video Links - Implementation Complete

## Overview

Enhanced the existing interview scheduling workflow on the Applications page to automatically generate video meeting links (Zoom, Microsoft Teams, Google Meet) based on the recruiter's configured video provider settings.

## What Was Implemented

### Backend Changes

#### 1. Updated `InterviewScheduleRequest` Schema
**File**: `backend2/app/routers/applications.py`

- Made `meeting_link` optional (was previously required)
- Added comment: "Optional - auto-generated from VideoProviderAccount if not provided"

```python
class InterviewScheduleRequest(BaseModel):
    candidate_email: str
    interview_datetime: str
    timezone: str
    meeting_link: Optional[str] = None  # NEW: Optional, auto-generated if empty
    notes: Optional[str] = None
    subject: Optional[str] = None
```

#### 2. Enhanced `schedule_interview()` Endpoint
**File**: `backend2/app/routers/applications.py`

**Added Imports**:
```python
from app.models import VideoProviderAccount
from app.services.video_providers import VideoProviderFactory, VideoProviderError
```

**Auto-Generation Logic**:
1. **If meeting_link provided**: Use it as-is (validates URL format)
2. **If meeting_link empty**: 
   - Query recruiter's `VideoProviderAccount` (where `is_primary=True` and `auto_generate_links=True`)
   - If no provider configured: Return error asking to configure provider or provide manual link
   - If provider configured: Use `VideoProviderFactory` to generate meeting
   - Generate meeting with details:
     - Topic: "{job_title} Interview - {candidate_name}"
     - Duration: 60 minutes (default)
     - Timezone: From request
     - Agenda: "Interview for {job_title} position at {company_name}"
     - Password: From provider's default settings
     - Waiting room: From provider's settings
   - Extract `join_url` from provider response
   - Track which provider was used (zoom/microsoft_teams/google_meet)

**Response Enhancement**:
```python
return {
    # ... existing fields ...
    "meeting_link": meeting_link,
    "video_provider": video_provider_used,  # NEW: "zoom", "microsoft_teams", "google_meet", or None
    "auto_generated": video_provider_used is not None,  # NEW: Boolean flag
    # ... existing fields ...
}
```

**Error Handling**:
- No provider configured + no manual link: Returns 400 with helpful error message
- Video provider API error: Returns 500 with error details
- Invalid manual link: Returns 400 with validation error

### Frontend Changes

#### 3. Updated API Client Type Definition
**File**: `frontend2/src/api/client.ts`

Made `meeting_link` optional in the `scheduleInterview` method:

```typescript
scheduleInterview: (applicationId: number, payload: {
    candidate_email: string;
    interview_datetime: string;
    timezone: string;
    meeting_link?: string;  // NEW: Optional
    notes?: string;
    subject?: string;
})
```

#### 4. Enhanced Schedule Interview Modal
**File**: `frontend2/src/components/interviews/ScheduleInterviewModal.tsx`

**Validation Changes**:
- Made meeting link field optional (removed "required" error)
- Only validates format IF a link is provided
- Removed mandatory validation for empty meeting link

**UI Changes**:
- Changed label from `Meeting Link *` to `Meeting Link (Optional - Auto-generated)`
- Updated placeholder: "Leave empty to auto-generate from your video provider settings"
- Added helpful hint: "💡 Leave empty to automatically generate a meeting link from your configured video provider (Zoom, Teams, or Google Meet)"

**Success Message Enhancement**:
- Added state to store API response data
- Enhanced success message to show auto-generated meeting details
- Displays:
  - ✅ "Auto-Generated Meeting Link" badge
  - Provider name (Zoom/Microsoft Teams/Google Meet)
  - Clickable meeting URL
  - Styled with green gradient card matching TalentGraph brand

**Payload Construction**:
- Only includes `meeting_link` in payload if provided
- Uses `any` type to allow optional meeting_link property

## User Workflow

### Scenario 1: Auto-Generate (Recommended)

1. **Setup** (One-time):
   - Recruiter navigates to Settings → Calendar Settings
   - Configures a video provider (Zoom, Teams, or Google Meet)
   - Sets as primary and enables "Auto-generate links"

2. **Schedule Interview**:
   - Go to Applications page
   - Click "Schedule Interview" button
   - Fill in:
     - Candidate email
     - Date and time
     - Timezone
     - Notes (optional)
   - **Leave meeting link field EMPTY**
   - Click Submit

3. **Result**:
   - System queries recruiter's primary video provider
   - Auto-generates meeting link via provider's API
   - Sends email with generated link to candidate AND recruiter
   - Shows success message with:
     - ✅ Confirmation
     - Provider name (e.g., "Zoom")
     - Generated meeting link

### Scenario 2: Manual Link (Fallback)

1. **Schedule Interview**:
   - Go to Applications page
   - Click "Schedule Interview"
   - Fill in all details
   - **Manually paste meeting link** (e.g., from personal Zoom account)
   - Click Submit

2. **Result**:
   - System uses provided link
   - Sends email with manual link
   - Shows success message (no auto-generate badge)

### Scenario 3: No Provider + No Link (Error)

1. **Schedule Interview**:
   - Go to Applications page
   - Click "Schedule Interview"
   - Fill in details
   - **Leave meeting link empty**
   - No video provider configured
   - Click Submit

2. **Result**:
   - Error: "No meeting link provided and no video provider configured. Please add meeting link or configure a video provider in Settings."
   - User can either:
     - Add manual link, OR
     - Go to Settings to configure provider

## Technical Architecture

### Video Provider Integration

The implementation leverages the Phase 2 video provider infrastructure:

```
ScheduleInterviewModal.tsx
    ↓
    → apiClient.scheduleInterview(applicationId, {meeting_link?: string})
    ↓
applications.py: schedule_interview()
    ↓
    → Query VideoProviderAccount (user_id, is_primary=True, auto_generate_links=True)
    ↓
    → VideoProviderFactory.get_provider(type, credentials)
    ↓
    → provider.create_meeting(topic, start_time, duration, ...)
    ↓
    → Extract join_url from response
    ↓
    → Include in email template
    ↓
    → Return to frontend with auto_generated flag
```

### Database Schema (Existing)

Uses existing `video_provider_account` table from Phase 2:

```sql
CREATE TABLE video_provider_account (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES user(id),
    provider VARCHAR NOT NULL,  -- 'zoom', 'microsoft_teams', 'google_meet'
    is_primary BOOLEAN DEFAULT FALSE,
    auto_generate_links BOOLEAN DEFAULT TRUE,
    api_key VARCHAR,
    api_secret VARCHAR,
    access_token VARCHAR,
    refresh_token VARCHAR,
    ...
);
```

## Files Modified

### Backend (3 files)

1. **`backend2/app/routers/applications.py`**
   - Line 449: Made meeting_link optional in InterviewScheduleRequest
   - Line 13: Added VideoProviderAccount import
   - Line 18: Added VideoProviderFactory and VideoProviderError imports
   - Lines 512-598: Added auto-generation logic (86 lines)
   - Lines 729-732: Added video_provider and auto_generated to response

### Frontend (2 files)

2. **`frontend2/src/api/client.ts`**
   - Line 212: Made meeting_link optional in scheduleInterview type

3. **`frontend2/src/components/interviews/ScheduleInterviewModal.tsx`**
   - Line 54: Added responseData state
   - Lines 117-119: Updated validation to make meeting_link optional
   - Lines 158-166: Updated payload construction
   - Lines 233-257: Enhanced success message with auto-generation details
   - Lines 358-369: Updated UI label and hint

## Testing Checklist

### Prerequisites

1. ✅ Backend server running (`cd backend2 && python -m uvicorn app.main:app --reload`)
2. ✅ Frontend server running (`cd frontend2 && npm run dev`)
3. ✅ Database has `video_provider_account` table (from Phase 2 migration)
4. ✅ User has recruiter account with company

### Test Case 1: Auto-Generate with Zoom

1. **Setup Video Provider**:
   - Login as recruiter
   - Navigate to Settings → Calendar Settings
   - Click "Add Video Provider"
   - Select "Zoom"
   - Enter Zoom API Key and Secret
   - Set as Primary: ✅
   - Auto-generate links: ✅
   - Save

2. **Schedule Interview**:
   - Go to Recruiter Dashboard → Applications tab
   - Find any application
   - Click "Schedule Interview"
   - Fill in:
     - Candidate email: `test@example.com`
     - Date: Tomorrow
     - Time: 10:00 AM
     - Timezone: Eastern Time (ET)
     - Notes: "Please prepare coding examples"
   - **Leave Meeting Link EMPTY**
   - Submit

3. **Verify**:
   - ✅ Success message appears
   - ✅ Shows "Auto-Generated Meeting Link" badge
   - ✅ Shows "Provider: Zoom"
   - ✅ Shows Zoom meeting URL (starts with `https://zoom.us/j/...`)
   - ✅ Email sent to candidate with Zoom link
   - ✅ Email sent to recruiter with Zoom link
   - ✅ Application status changed to "scheduled"

### Test Case 2: Manual Link (No Provider Configured)

1. **Schedule Interview**:
   - Go to Applications page
   - Click "Schedule Interview"
   - Fill in all fields
   - **Paste manual link**: `https://meet.google.com/abc-defg-hij`
   - Submit

2. **Verify**:
   - ✅ Success message appears
   - ✅ NO auto-generate badge (manual link used)
   - ✅ Email sent with manual Google Meet link

### Test Case 3: Error - No Provider, No Link

1. **Schedule Interview**:
   - Ensure NO video provider configured in settings
   - Go to Applications page
   - Click "Schedule Interview"
   - Fill in fields
   - **Leave Meeting Link EMPTY**
   - Submit

2. **Verify**:
   - ❌ Error message appears
   - ✅ Message says: "No meeting link provided and no video provider configured. Please add meeting link or configure a video provider in Settings."

### Test Case 4: Microsoft Teams Auto-Generate

1. **Setup**:
   - Configure Microsoft Teams provider in Settings (OAuth flow)
   - Set as primary

2. **Schedule Interview**:
   - Leave meeting link empty
   - Submit

3. **Verify**:
   - ✅ Auto-generated Teams link (starts with `https://teams.microsoft.com/...`)
   - ✅ Success message shows "Provider: Microsoft Teams"

### Test Case 5: Google Meet Auto-Generate

1. **Setup**:
   - Configure Google Meet provider in Settings (OAuth flow)
   - Set as primary

2. **Schedule Interview**:
   - Leave meeting link empty
   - Submit

3. **Verify**:
   - ✅ Auto-generated Meet link (starts with `https://meet.google.com/...`)
   - ✅ Success message shows "Provider: Google Meet"

## Configuration Guide for Recruiters

### Step 1: Configure Video Provider

**Zoom**:
1. Go to Settings → Calendar Settings
2. Click "Add Video Provider" → Select "Zoom"
3. Get credentials from [Zoom Marketplace](https://marketplace.zoom.us/):
   - Create JWT or OAuth app
   - Copy API Key and API Secret
4. Paste credentials
5. Check "Set as Primary" and "Auto-generate links"
6. Save

**Microsoft Teams**:
1. Go to Settings → Calendar Settings
2. Click "Connect Microsoft Teams"
3. Complete OAuth flow (login with Microsoft account)
4. Grant calendar and online meetings permissions
5. Check "Set as Primary" and "Auto-generate links"
6. Save

**Google Meet**:
1. Go to Settings → Calendar Settings
2. Click "Connect Google Calendar"
3. Complete OAuth flow (login with Google account)
4. Grant calendar permissions (Meet links created via Calendar API)
5. Check "Set as Primary" and "Auto-generate links"
6. Save

### Step 2: Verify Configuration

- Go to Settings → Calendar Settings
- Check "Video Providers" section
- Verify:
  - ✅ One provider marked as "Primary"
  - ✅ "Auto-generate" toggle is ON
  - ✅ Status shows "Connected"

### Step 3: Schedule Interview

- Go to Applications page
- Click "Schedule Interview"
- Fill in date/time/timezone
- **Leave meeting link empty** (system will auto-generate)
- Submit
- Verify success message shows auto-generated link

## Benefits

### For Recruiters
- ✅ **Faster**: No need to manually create meeting links
- ✅ **Consistent**: All interviews use company-configured provider
- ✅ **Professional**: Branded meeting links from company account
- ✅ **Tracked**: All meetings logged with provider for analytics
- ✅ **Flexible**: Can still manually add links if needed

### For Candidates
- ✅ **Instant Access**: Meeting link in email immediately
- ✅ **Reliable**: Links from official provider accounts (not personal)
- ✅ **Clear**: Provider name shown (Zoom/Teams/Meet)

### For System
- ✅ **Integrated**: Leverages Phase 2 infrastructure
- ✅ **Secure**: Uses encrypted credentials from database
- ✅ **Scalable**: Supports multiple providers per user
- ✅ **Maintainable**: Clean separation of concerns

## Next Steps (Optional Enhancements)

### 1. Calendar Sync
- Auto-add interview to recruiter's external calendar (Google/Microsoft)
- Block time on both recruiter and candidate calendars
- Send calendar invites with meeting link

### 2. Meeting Reminders
- Send reminder emails 1 day before interview
- Send reminder 1 hour before interview
- Include meeting link in reminders

### 3. Advanced Settings
- Allow per-interview meeting duration selection (30/45/60/90 min)
- Add custom meeting password option per interview
- Toggle waiting room per interview

### 4. Analytics Dashboard
- Track meeting link usage by provider
- Show interview completion rates
- Monitor meeting join times

### 5. Candidate Experience
- Allow candidates to add to their calendar
- One-click join button in dashboard
- Show countdown to interview time

## Troubleshooting

### Error: "Failed to generate meeting link"

**Causes**:
- Video provider credentials expired
- API rate limit exceeded
- Network error calling provider API

**Solutions**:
1. Go to Settings → Calendar Settings
2. Check provider status
3. If "Disconnected", reconnect provider
4. If "Connected", try disconnecting and reconnecting
5. Check provider account status (active subscription, not suspended)

### Error: "No video provider configured"

**Solution**:
- Go to Settings → Calendar Settings
- Add a video provider (Zoom/Teams/Meet)
- Set as primary and enable auto-generate
- Try scheduling again

### Meeting Link Not Showing in Email

**Check**:
1. Backend logs: `[INTERVIEW] Auto-generated {provider} meeting link: {url}`
2. Email template includes `meeting_link` variable
3. SMTP configured correctly in backend

## Support

For issues or questions:
- Check backend logs: `backend2/app.log`
- Check frontend console: Browser DevTools → Console
- Check email logs: Look for `[INTERVIEW]` prefix
- Review video provider status in Settings

## Success Metrics

This feature is successful when:
- ✅ 80%+ of interviews scheduled with auto-generated links
- ✅ <5% error rate on auto-generation
- ✅ Reduction in time to schedule interviews (no manual link creation)
- ✅ Positive recruiter feedback on ease of use

## Conclusion

The interview scheduling workflow now seamlessly integrates with Phase 2 video provider infrastructure to automatically generate meeting links based on recruiter preferences. This eliminates manual work, ensures consistency, and provides a professional candidate experience while maintaining flexibility for edge cases requiring manual links.
