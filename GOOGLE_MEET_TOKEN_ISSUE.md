# Google Meet Integration Token Issue

## Problem
When trying to schedule an interview using Google Meet auto-generation, you get a **500 error** with the message:
```
Failed to generate google_meet meeting link. Google Meet error: 401 Client Error: Unauthorized
```

## Root Cause
Google OAuth 2.0 access tokens expire after **~1 hour**. The current implementation requires a static `GOOGLE_MEET_ACCESS_TOKEN` in the `.env` file, which expires quickly and needs to be manually refreshed using a refresh token.

## Solutions

### ✅ Solution 1: Use Zoom (Recommended)
Zoom is already configured with Server-to-Server OAuth 2.0, which automatically handles token refresh without manual intervention.

**To use Zoom:**
1. In the interview scheduling modal, select **"Zoom"** as the meeting provider
2. The system will automatically generate a Zoom meeting link
3. No manual token management required!

### ✅ Solution 2: Use Manual Meeting Links
Provide your own meeting link from any platform:

**To use manual links:**
1. Create a meeting in your preferred platform (Zoom, Google Meet, Teams, etc.)
2. Copy the meeting link
3. In the interview scheduling modal, select **"Manual Link"**
4. Paste your meeting link
5. Click "Send Interview Invite"

### ⚠️ Solution 3: Manually Refresh Google Meet Token (Temporary)
This is a temporary workaround and **NOT recommended** for production.

**Steps:**
1. Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) and check "Use your own OAuth credentials"
3. Enter your credentials from `.env`:
   - OAuth Client ID: `[YOUR_GOOGLE_CLIENT_ID_FROM_ENV]`
   - OAuth Client secret: `[YOUR_GOOGLE_CLIENT_SECRET_FROM_ENV]`
4. In Step 1, select:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. Click "Authorize APIs" and sign in
6. In Step 2, click "Exchange authorization code for tokens"
7. Copy the **access_token** value
8. Add to `.env`:
   ```
   GOOGLE_MEET_ACCESS_TOKEN=ya29.a0AfB_byC...your_token_here
   ```
9. Restart the backend server

**Note:** This token will expire in 1 hour, so this is only suitable for testing.

## Long-term Fix (For Developers)
Implement proper OAuth 2.0 refresh token flow for Google Meet:
1. Store refresh tokens in the database
2. Automatically refresh access tokens when they expire
3. Implement OAuth callback handling for initial authorization

See: https://developers.google.com/identity/protocols/oauth2/web-server#offline

## Quick Test After Fixes
1. Try scheduling an interview with **Zoom** (should work immediately)
2. Try scheduling with a **manual link** (should work immediately)
3. Backend changes applied - restart backend server if still running

## Files Fixed
- ✅ `backend2/app/routers/applications.py` - Fixed datetime parsing bug and improved error messages
- ✅ `backend2/app/services/video_providers.py` - Better error handling for expired Google tokens
