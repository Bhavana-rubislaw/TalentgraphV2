# Test Meeting Participant Features

## Quick Test Commands

### 1. Test User Search Endpoint
```bash
# Get your auth token first, then:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/auth/users/search?q=bhavana"
```

Expected response:
```json
[
  {
    "id": 37,
    "full_name": "Bhavana Bayya",
    "email": "bhavana@example.com",
    "role": "company"
  }
]
```

### 2. Test Meeting Details with Participant Names
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/meetings/1"
```

Expected response should include:
```json
{
  "participants": [
    {
      "user_id": 37,
      "participant_name": "Bhavana Bayya",
      "participant_email": "bhavana@example.com",
      "has_confirmed": true
    }
  ]
}
```

## Fixes Applied

### Backend Changes:

1. **Added eager loading** in [meetings.py](backend2/app/routers/meetings.py):
   - Import: `from sqlalchemy.orm import selectinload`
   - Updated `get_meeting()` to use `.options(selectinload(Meeting.participants).selectinload(MeetingParticipant.user))`
   - Updated `list_meetings()` to use the same eager loading
   - This ensures user data is loaded with participants

2. **Fixed schema serialization** in [schemas.py](backend2/app/schemas.py):
   - Updated `MeetingParticipantRead.from_orm()` method
   - Now properly extracts `participant_name` and `participant_email` from user relationship
   - Returns fully populated participant objects

### Frontend Changes:

1. **Enhanced search with better feedback** in [CreateMeetingModal.tsx](frontend2/src/components/meetings/CreateMeetingModal.tsx):
   - Added console.log statements for debugging
   - Shows dropdown even when no results (displays "No users found" message)
   - Better error handling and logging
   - Shows "Type at least 2 characters to search" hint

2. **Improved dropdown behavior**:
   - Always shows dropdown when searching (even if no results)
   - Clear feedback messages
   - Better visual states

## Testing Steps

### Step 1: Restart Backend
```bash
# In terminal with backend2 activated
cd backend2
# Stop uvicorn if running (Ctrl+C)
# Restart:
uvicorn app.main:app --reload
```

### Step 2: Check Browser Console
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Navigate to Schedule New Meeting
4. Type in participant search box
5. Watch for console logs:
   - "Searching for users: ..."
   - "Search response status: ..."
   - "Search results: ..."

### Step 3: Test Participant Search
1. Click "Schedule New Meeting"
2. Type at least 2 characters in Participants field
3. Should see dropdown with:
   - User names and emails if found
   - "No users found" if nothing matches
4. Click a user to select
5. Should see green card with name and email

### Step 4: View Existing Meeting
1. Click on an existing meeting
2. Check Participants section
3. Should see:
   - ✅ "Bhavana Bayya" instead of "User #37"
   - ✅ Email address below name
   - ✅ (Organizer) label if applicable
   - ✅ Confirmed/Pending status

## Troubleshooting

### Issue: Still seeing "User #37"
**Solution:** 
- Make sure backend was restarted after changes
- Check backend console for any errors
- Verify the user relationship exists in database

### Issue: Search dropdown not appearing
**Solution:**
- Check browser console for error messages
- Verify auth token exists: `localStorage.getItem('access_token')`
- Ensure backend is running on port 8000
- Check backend logs for search endpoint requests

### Issue: "No users found" but users exist
**Solution:**
- Check if users have `full_name` populated in database
- Try searching by email instead of name
- Verify search endpoint returns data in console

## Database Check (Optional)

```python
# If you want to verify user data in database:
from app.database import SessionLocal
from app.models import User

session = SessionLocal()
users = session.query(User).all()
for user in users:
    print(f"ID: {user.id}, Name: {user.full_name}, Email: {user.email}")
```

## Success Criteria

✅ Typing in participant search shows dropdown
✅ Dropdown displays user names and emails
✅ Selecting user adds them as green card
✅ Meeting details show participant names (not IDs)
✅ Meeting details show participant emails
✅ Console shows search requests and responses

## Next Steps After Testing

1. Test creating a meeting with name/email participants
2. Verify the meeting is created successfully
3. Check that notifications include proper names
4. Verify meeting list shows names correctly
