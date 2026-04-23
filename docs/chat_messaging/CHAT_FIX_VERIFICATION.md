# 🧪 Chat System Fix Verification Script

## Quick Test Plan - 5 Minutes

### Pre-Test Setup

1. **Backend running?**
   ```bash
   curl http://localhost:8001/health
   # Expected: {"status":"ok"}
   ```

2. **Frontend running?**
   - Open: http://localhost:3001 OR http://localhost:5173
   - Should see login page

---

## Test 1: CORS Fix ✅

**Objective:** Verify no CORS errors on message endpoints

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Log in as recruiter
4. Navigate to Messages tab
5. Select a conversation
6. Send a message: "Testing CORS fix"

**Expected Result:**
- ✅ POST to `/chat/conversations/{id}/messages` returns 201
- ✅ No red CORS errors in console
- ✅ Message appears in thread immediately
- ✅ Response headers include `Access-Control-Allow-Origin`

**Pass/Fail:** _______

---

## Test 2: Conversation Auto-Selection ✅

**Objective:** Verify latest conversation opens automatically

**Steps:**
1. Log in as recruiter
2. Navigate to Dashboard
3. Click "Messages" tab
4. **Do NOT click any conversation**

**Expected Result:**
- ✅ Latest conversation automatically selected
- ✅ Messages visible immediately (not "Select a conversation")
- ✅ URL updates to `?tab=messages&c=X`
- ✅ Left panel highlights selected conversation

**Pass/Fail:** _______

---

## Test 3: URL Restoration ✅

**Objective:** Verify `?c=` param restores conversation with messages

**Steps:**
1. Open conversation in Messages tab
2. Note the URL: `/recruiter-dashboard?tab=messages&c=5`
3. Copy entire URL
4. Open new browser tab
5. Paste URL and press Enter

**Expected Result:**
- ✅ Page loads to Messages tab
- ✅ Conversation #5 is selected
- ✅ Messages are visible immediately
- ✅ Thread shows full conversation history
- ✅ No need to click anything

**Pass/Fail:** _______

---

## Test 4: Refresh Persistence ✅

**Objective:** Verify conversation stays selected after refresh

**Steps:**
1. Open any conversation
2. Scroll through messages
3. Press F5 to refresh page
4. Wait for page to reload

**Expected Result:**
- ✅ Same conversation still selected
- ✅ Messages reload and display
- ✅ Scroll position may reset (acceptable)
- ✅ URL still has `?c=X`

**Pass/Fail:** _______

---

## Test 5: Left/Right Bubble Rendering ✅

**Objective:** Verify messages show on correct sides

**Test 5a: Recruiter View**

**Steps:**
1. Log in as recruiter
2. Open conversation with candidate
3. Look at message layout

**Expected Result:**
- ✅ YOUR messages (recruiter):
  - Aligned RIGHT
  - Purple background
  - White text
  - No avatar
  - Shows "10:42 AM · Sent/Read"
- ✅ CANDIDATE messages:
  - Aligned LEFT
  - White background
  - Dark text
  - Small avatar on left
  - Candidate name above bubble
  - Shows "10:43 AM" (no status)

**Pass/Fail:** _______

**Test 5b: Candidate View**

**Steps:**
1. Open incognito window (or different browser)
2. Log in as candidate
3. Go to Messages tab
4. Open same conversation

**Expected Result:**
- ✅ YOUR messages (candidate):
  - Aligned RIGHT
  - Purple background
  - White text
- ✅ RECRUITER messages:
  - Aligned LEFT
  - White background
  - Dark text
  - Recruiter avatar on left

**Pass/Fail:** _______

---

## Test 6: Read Receipts ✅

**Objective:** Verify "Sent" changes to "Read"

**Steps:**
1. Recruiter window: Send new message "Test read receipt"
2. Note timestamp shows "10:42 AM · Sent"
3. Candidate window: Open that conversation
4. Wait 5-10 seconds
5. Recruiter window: Check message status (may need to wait for poll)

**Expected Result:**
- ✅ Initially: "10:42 AM · Sent"
- ✅ After candidate views: "10:42 AM · Read"
- ✅ Unread count decrements to 0

**Pass/Fail:** _______

---

## Test 7: Send Message (No CORS) ✅

**Objective:** Verify sending works without errors

**Steps:**
1. Open conversation
2. Type: "Testing message send"
3. Press Enter (or click Send button)

**Expected Result:**
- ✅ Send button disables briefly
- ✅ Message appears on right side
- ✅ Purple bubble
- ✅ Timestamp shows "Just now" or current time
- ✅ Status shows "Sent"
- ✅ No errors in console

**Pass/Fail:** _______

---

## Test 8: Empty States ✅

**Objective:** Verify clean UI when no conversations exist

**Steps:**
1. Use test account with no conversations
2. Navigate to Messages tab

**Expected Result:**
- ✅ Left panel shows "No conversations yet"
- ✅ Right panel shows "Select a conversation"
- ✅ Icons/illustrations visible
- ✅ No errors or broken UI

**Pass/Fail:** _______

---

## Test 9: Conversation List ✅

**Objective:** Verify conversation list displays correctly

**Steps:**
1. View Messages tab with multiple conversations
2. Check conversation list items

**Expected Result:**
- ✅ Shows participant name
- ✅ Shows job title context
- ✅ Shows latest message preview (80 chars)
- ✅ Shows timestamp (relative)
- ✅ Shows unread badge if applicable
- ✅ Shows green dot if participant online
- ✅ Sorted by most recent first
- ✅ Selected item highlighted

**Pass/Fail:** _______

---

## Test 10: Mobile Responsive ✅

**Objective:** Verify layout works on mobile

**Steps:**
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or similar
4. Navigate to Messages tab

**Expected Result:**
- ✅ Conversation list visible
- ✅ Thread scrollable
- ✅ Bubbles don't overflow
- ✅ Composer at bottom
- ✅ Touch-friendly tap targets

**Pass/Fail:** _______

---

## 🔧 Troubleshooting

### If Test 1 Fails (CORS)
**Check:**
```bash
# Verify backend includes port in origins
grep -n "5173" backend2/app/main.py
# Should show line with port 5173
```

**Fix:** Restart backend after changes
```bash
cd backend2
uvicorn app.main:app --reload --port 8001
```

---

### If Test 2/3 Fails (Auto-Selection)
**Check browser console:**
- Look for error messages
- Check if `getConversations` API call succeeds
- Verify `loadMessages` is called

**Debug:**
```javascript
// Open browser console and check:
localStorage.getItem('user_id')  // Should be a number
localStorage.getItem('token')    // Should exist
```

---

### If Test 5 Fails (Left/Right)
**Check message data:**
```javascript
// In browser console, inspect a message:
console.log(messages[0])
// Should have: sender_user_id, sender_name, sender_role
```

**Verify logic:**
```javascript
// Check current user ID:
console.log(currentUserId)  // Should match your user
```

---

### If Test 6 Fails (Read Receipts)
**Check backend migration:**
```bash
cd backend2
python migrate_chat_read_receipts.py
# Should show success
```

**Check database:**
```sql
SELECT id, text, is_read, read_at FROM message LIMIT 5;
-- read_at should be populated for read messages
```

---

## ✅ Summary

**Total Tests:** 10  
**Tests Passed:** ___ / 10  
**Tests Failed:** ___ / 10  

**Overall Status:** ☐ PASS  ☐ FAIL

---

## 📋 Issues Found

If any tests failed, document here:

**Test #:** ___  
**Issue:** ____________________________________  
**Error Message:** ____________________________________  
**Screenshots:** [Attach if applicable]

---

## 🎯 Sign-Off

- [ ] All 10 tests passed
- [ ] No CORS errors observed
- [ ] Conversation auto-selection works
- [ ] URL restoration works
- [ ] Messages display correctly
- [ ] Read receipts update
- [ ] Mobile responsive
- [ ] No console errors

**Tested By:** _________________  
**Date:** _________________  
**Browser:** _________________  
**Version:** _________________  

**Status:** ✅ APPROVED / ⚠️ ISSUES FOUND / ❌ FAILED

---

## 🚀 Ready for Production?

If all tests pass:
- ✅ System is production-ready
- ✅ Deploy to staging for final validation
- ✅ Plan production deployment

If tests fail:
- ⚠️ Review CHAT_FIXES_REPORT.md
- ⚠️ Check troubleshooting section
- ⚠️ Contact development team

---

**Quick Test Completed:** ☐ Yes  
**Ready to Deploy:** ☐ Yes  
**Notes:** ____________________________________
