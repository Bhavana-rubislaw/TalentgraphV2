# Chat System Testing Checklist

## Pre-Testing Setup

### 1. Run Database Migration
```bash
cd backend2
python migrate_chat_read_receipts.py
```

**Expected Output:**
```
🔄 Starting migration: Add read receipts to chat system
  ➕ Adding message.sender_role column...
  ✅ Added sender_role
  ➕ Adding message.read_at column...
  ✅ Added read_at
  🔄 Backfilling read_at for previously read messages...
  ✅ Backfilled X messages
  🔄 Backfilling sender_role from user records...
  ✅ Backfilled sender_role for X messages
✅ Migration completed successfully!
```

### 2. Restart Backend
```bash
cd backend2
uvicorn app.main:app --reload --port 8001
```

### 3. Restart Frontend (if needed)
```bash
cd frontend2
npm run dev
```

---

## Acceptance Criteria Testing

### ✅ 1. Recruiter Can Message First Only

**Test Case 1.1:** Recruiter starts conversation
- [ ] Log in as recruiter
- [ ] Navigate to Matches or Recommendations tab
- [ ] Find a candidate you've liked or matched with
- [ ] Click "Message" button
- [ ] Verify conversation is created
- [ ] Send a message
- [ ] Verify message appears with "Sent" status

**Expected Result:** ✅ Conversation created successfully, message sent

**Test Case 1.2:** Candidate cannot start conversation
- [ ] Log in as candidate
- [ ] Go to Messages tab
- [ ] Verify no "New Message" or "Start Conversation" button exists
- [ ] Verify candidate can only see existing conversations

**Expected Result:** ✅ Candidate cannot initiate conversations

---

### ✅ 2. Both Can Reply Once Conversation Exists

**Test Case 2.1:** Candidate replies to recruiter
- [ ] Log in as candidate
- [ ] Go to Messages tab
- [ ] Open existing conversation (started by recruiter)
- [ ] Type a reply message
- [ ] Press Enter or click Send
- [ ] Verify message appears on right side (purple bubble)
- [ ] Verify message shows "Sent" status

**Expected Result:** ✅ Candidate can reply successfully

**Test Case 2.2:** Recruiter replies back
- [ ] Log in as recruiter
- [ ] Go to Messages tab
- [ ] Open the same conversation
- [ ] Verify candidate's message appears on left side (white bubble)
- [ ] Verify candidate's message shows timestamp only (no status)
- [ ] Send a reply
- [ ] Verify your message appears on right side (purple bubble)

**Expected Result:** ✅ Both parties can continue conversation

---

### ✅ 3. Different Colors for Recruiter and Candidate

**Test Case 3.1:** Visual differentiation in recruiter view
- [ ] Log in as recruiter
- [ ] Open a conversation with back-and-forth messages
- [ ] Verify YOUR messages are:
  - [ ] Aligned to the right
  - [ ] Purple background (#6366f1)
  - [ ] White text
  - [ ] Rounded corners with tail on top-right
- [ ] Verify CANDIDATE messages are:
  - [ ] Aligned to the left
  - [ ] White background
  - [ ] Black text
  - [ ] Small avatar circle on left
  - [ ] Rounded corners with tail on top-left

**Expected Result:** ✅ Clear visual distinction between participants

**Test Case 3.2:** Visual differentiation in candidate view
- [ ] Log in as candidate
- [ ] Open same conversation
- [ ] Verify YOUR messages are:
  - [ ] Aligned to the right
  - [ ] Purple background
  - [ ] White text
- [ ] Verify RECRUITER messages are:
  - [ ] Aligned to the left
  - [ ] White background
  - [ ] Black text
  - [ ] Small avatar circle with recruiter initial

**Expected Result:** ✅ Colors swap based on viewer perspective

---

### ✅ 4. Left/Right Chat Bubble Layout

**Test Case 4.1:** Bubble alignment
- [ ] Log in as any user
- [ ] Open conversation with multiple messages
- [ ] Verify layout matches WhatsApp/iMessage style:
  - [ ] Own messages flush right, max-width 70%
  - [ ] Other messages flush left, max-width 70%
  - [ ] Messages don't span full width
  - [ ] Clear whitespace on opposite side

**Test Case 4.2:** Avatar display
- [ ] Verify small avatar circle appears with OTHER user's messages
- [ ] Verify NO avatar for own messages
- [ ] Avatar shows first letter of name in uppercase
- [ ] Avatar has purple gradient background

**Expected Result:** ✅ Professional chat app layout

---

### ✅ 5. Every Message Shows Timestamp

**Test Case 5.1:** Timestamp formatting
- [ ] Send messages at different times
- [ ] Verify timestamps show:
  - [ ] `10:42 AM` for messages today
  - [ ] `Yesterday 8:10 PM` for yesterday
  - [ ] `Mon 2:30 PM` for this week
  - [ ] `Mar 9, 10:42 AM` for older messages

**Test Case 5.2:** Timestamp placement
- [ ] Verify timestamp appears BELOW message bubble
- [ ] For own messages: timestamp aligned right
- [ ] For other messages: timestamp aligned left
- [ ] Font size small (11px), gray color

**Expected Result:** ✅ All messages have readable timestamps

---

### ✅ 6. Read/Sent Status Under Own Messages

**Test Case 6.1:** Sent status
- [ ] Log in as recruiter
- [ ] Send a new message
- [ ] Immediately check status under message
- [ ] Verify shows: `10:42 AM · Sent`
- [ ] Status in gray color, small font

**Expected Result:** ✅ Shows "Sent" immediately after sending

**Test Case 6.2:** Read status update
- [ ] Keep recruiter logged in
- [ ] Log in as candidate in different browser/tab
- [ ] Candidate opens the conversation
- [ ] Wait 2-3 seconds
- [ ] Back in recruiter view, refresh or wait for poll
- [ ] Verify message now shows: `10:42 AM · Read`

**Expected Result:** ✅ Status updates to "Read" after recipient views

**Test Case 6.3:** Other user's messages (no status)
- [ ] Verify RECEIVED messages only show timestamp
- [ ] No "Sent" or "Read" label for incoming messages
- [ ] Example: `10:43 AM`

**Expected Result:** ✅ Status only shown for own messages

---

### ✅ 7. Conversations Persist in DB

**Test Case 7.1:** Data persistence
- [ ] Start conversation and send messages
- [ ] Note conversation ID from URL: `?c=1`
- [ ] Close browser completely
- [ ] Reopen browser and log in
- [ ] Go to Messages tab
- [ ] Verify conversation appears in list
- [ ] Open conversation
- [ ] Verify all messages are still there
- [ ] Verify timestamps unchanged
- [ ] Verify read status preserved

**Expected Result:** ✅ Nothing lost after restart

**Test Case 7.2:** Cross-device persistence
- [ ] Send messages on desktop
- [ ] Open same account on mobile browser
- [ ] Verify same conversations and messages appear
- [ ] Send message from mobile
- [ ] Check desktop (refresh if needed)
- [ ] Verify new message appears on desktop

**Expected Result:** ✅ Synchronized across sessions

---

### ✅ 8. Messages Tab Always Loads History

**Test Case 8.1:** Initial load
- [ ] Clear browser cache (optional)
- [ ] Log in fresh
- [ ] Click Messages tab
- [ ] Verify conversations list loads
- [ ] Open any conversation
- [ ] Verify message history appears
- [ ] Verify oldest messages first, newest last
- [ ] Auto-scroll to bottom

**Expected Result:** ✅ Complete history loads correctly

**Test Case 8.2:** Pagination (if >50 messages)
- [ ] Create conversation with 60+ messages
- [ ] Open conversation
- [ ] Verify "Load earlier messages" button appears
- [ ] Click button
- [ ] Verify older messages load above
- [ ] Scroll position preserved

**Expected Result:** ✅ Pagination works smoothly

---

### ✅ 9. Selected Conversation Restores with Query Param

**Test Case 9.1:** Direct URL navigation
- [ ] Open conversation, note URL: `/recruiter-dashboard?tab=messages&c=5`
- [ ] Copy URL
- [ ] Open new tab, paste URL
- [ ] Verify Messages tab is active
- [ ] Verify conversation #5 is selected
- [ ] Verify messages load automatically

**Expected Result:** ✅ Deep linking works

**Test Case 9.2:** Browser back/forward
- [ ] Open conversation A
- [ ] Open conversation B
- [ ] Click browser back button
- [ ] Verify conversation A is selected again
- [ ] Click forward button
- [ ] Verify conversation B is selected

**Expected Result:** ✅ Browser navigation works correctly

**Test Case 9.3:** Refresh preservation
- [ ] Open specific conversation
- [ ] Press F5 to refresh page
- [ ] Verify same conversation is still selected
- [ ] Verify messages still loaded

**Expected Result:** ✅ Refresh doesn't lose selection

---

### ✅ 10. No Duplicate Conversations

**Test Case 10.1:** Idempotent creation
- [ ] Log in as recruiter
- [ ] Find candidate "Alice Smith" for "Job A"
- [ ] Click Message button → creates conversation #1
- [ ] Note conversation ID
- [ ] Go back to candidate profile
- [ ] Click Message button AGAIN
- [ ] Verify returns to SAME conversation #1
- [ ] Verify no duplicate conversation created

**Expected Result:** ✅ Same conversation reused

**Test Case 10.2:** Database constraint
- [ ] Check database:
  ```sql
  SELECT company_id, candidate_id, job_posting_id, COUNT(*)
  FROM conversation
  GROUP BY company_id, candidate_id, job_posting_id
  HAVING COUNT(*) > 1;
  ```
- [ ] Verify result is empty (no duplicates)

**Expected Result:** ✅ Unique constraint enforced

---

## UI/UX Testing

### Conversation List

- [ ] Shows participant name
- [ ] Shows job title context
- [ ] Shows latest message preview (80 chars)
- [ ] Shows latest timestamp
- [ ] Shows unread count badge (if applicable)
- [ ] Online presence indicator (green dot if active)
- [ ] Hover effect on items
- [ ] Selected item highlighted
- [ ] Sorted by most recent activity

### Empty States

- [ ] "No conversations yet" when list is empty
- [ ] "Select a conversation" when none selected
- [ ] "Loading messages…" when fetching messages
- [ ] "Load earlier messages" button for pagination

### Error Handling

- [ ] Error banner if conversation load fails
- [ ] Inline error if message send fails
- [ ] Retry option for failed sends
- [ ] Draft preserved on send failure

### Accessibility

- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Screen reader labels present
- [ ] ARIA roles set correctly
- [ ] Focus management proper

---

## Performance Testing

### Polling

- [ ] Conversations refresh every 10 seconds
- [ ] Active thread refreshes every 10 seconds
- [ ] Polling continues in background
- [ ] Polling stops when component unmounts
- [ ] Silent failures don't interrupt UX

### Message Sending

- [ ] Send button disables during send
- [ ] Loading spinner shows while sending
- [ ] Message appears instantly after success
- [ ] Textarea clears after send
- [ ] Auto-scroll to new message

### Read Receipts

- [ ] Mark as read called when opening conversation
- [ ] Unread count decrements after marking read
- [ ] Status updates on next poll cycle
- [ ] Multiple unread messages marked together

---

## Edge Cases

### Long Messages

- [ ] Message with 4000 characters sends successfully
- [ ] Text wraps properly in bubble
- [ ] Bubble doesn't break layout
- [ ] Scrollbar appears if needed

### Special Characters

- [ ] Emoji render correctly 😀👍
- [ ] Line breaks preserved (Shift+Enter)
- [ ] URLs don't break formatting
- [ ] Code snippets display properly

### Network Issues

- [ ] Graceful handling of 403 Forbidden
- [ ] Graceful handling of 404 Not Found
- [ ] Graceful handling of 500 Server Error
- [ ] Retry mechanism for transient failures

### Concurrent Users

- [ ] Two recruiters from same company see shared conversations
- [ ] Messages from both appear correctly
- [ ] Read status works for both
- [ ] No race conditions or conflicts

---

## Mobile Responsiveness

- [ ] Layout adapts to mobile viewport
- [ ] Conversation list scrollable on mobile
- [ ] Message thread scrollable on mobile
- [ ] Touch interactions work
- [ ] Virtual keyboard doesn't break layout

---

## Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

---

## Security Testing

### Authorization

- [ ] Candidate cannot access recruiter-only conversations
- [ ] Recruiter cannot access other company's conversations
- [ ] 401 returned for invalid token
- [ ] 403 returned for unauthorized access

### Input Validation

- [ ] Empty messages rejected
- [ ] Messages >4000 chars truncated
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized

---

## Regression Testing

### Existing Features

- [ ] Recommendations tab still works
- [ ] Matches tab still works
- [ ] Applications tab still works
- [ ] Job posting creation still works
- [ ] Profile editing still works
- [ ] Notifications still work

---

## Performance Benchmarks

### Load Times

- [ ] Conversation list loads in <1 second
- [ ] Message thread loads in <1 second
- [ ] Message sends in <500ms
- [ ] Read receipt updates in <2 seconds

### Database Queries

- [ ] No N+1 queries
- [ ] Indexes properly used
- [ ] Pagination efficient
- [ ] Polling doesn't cause excessive queries

---

## Sign-Off

After completing all tests:

- [ ] All critical acceptance criteria met
- [ ] No blocking bugs found
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete

**Tested By:** _________________  
**Date:** _________________  
**Status:** ✅ PASSED / ⚠️ ISSUES FOUND / ❌ FAILED

**Notes:**
_______________________________________________________
_______________________________________________________
_______________________________________________________

---

## Known Issues / Future Improvements

Document any non-blocking issues found:

1. 
2. 
3. 

---

**Version:** 2.0.0  
**Last Updated:** March 9, 2026
