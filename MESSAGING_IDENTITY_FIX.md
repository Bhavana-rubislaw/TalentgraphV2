# Messaging Identity & Bubble Ownership Fix

**Date**: March 9, 2026
**Status**: ✅ COMPLETE

## Overview

Fixed messaging participant identity resolution, header names, and message bubble ownership to work correctly across both Candidate and Recruiter dashboards with **dynamic, non-hardcoded logic**.

## Problems Solved

### 1. ✅ Dynamic Header Names
- **Candidate Dashboard** → Shows recruiter/company name
- **Recruiter Dashboard** → Shows candidate name
- **Zero hardcoded names** → All resolved dynamically based on current user

### 2. ✅ Correct Bubble Ownership
- **Own messages** → Right side, purple (#5b45e0), white text
- **Incoming messages** → Left side, light gray (#f0f0f0), dark text
- **Works in both dashboards** → Perspective switches automatically

### 3. ✅ Conversation List Identity
- Candidate sees recruiter names in conversation list
- Recruiter sees candidate names in conversation list
- Avatar, presence, and metadata all dynamically resolved

---

## Technical Implementation

### Backend Changes (chat.py)

#### Enhanced `_serialize_conversation()` Response

**Added explicit participant fields:**

```python
return {
    "id": conv.id,
    "company_id": conv.company_id,
    "candidate_id": conv.candidate_id,
    "job_posting_id": conv.job_posting_id,
    
    # ✅ NEW: Explicit participant info (always present)
    "candidate_name": candidate_name,
    "candidate_user_id": candidate_user_id,
    "recruiter_name": recruiter_name,
    "recruiter_user_id": recruiter_user_id,
    
    "job_title": job_title,
    "last_message_preview": last_message_preview,
    "unread_count": unread_count,
    
    # ✅ Dynamic "other" user (computed based on viewer_user_id)
    "other_user": {
        "id": other_user.id,
        "full_name": other_user.full_name,
        "is_online": is_online,
        "last_seen_at": last_seen_at,
    },
}
```

**Logic for determining "other" participant:**

```python
# Determine "other" participant based on viewer's identity
if viewer_user_id == candidate_user_id:
    # Viewer is the candidate → show recruiter as other user
    other_user = company_user
elif viewer_user_id == recruiter_user_id:
    # Viewer is the recruiter → show candidate as other user
    other_user = candidate_user
else:
    # Fallback
    other_user = company_user if company_user else candidate_user
```

### Frontend Changes (MessagesPage.tsx)

#### 1. Enhanced TypeScript Interfaces

```typescript
interface Conversation {
  id: number;
  candidate_id: number;
  job_posting_id: number;
  company_id: number;
  
  // ✅ NEW: Explicit participant info
  candidate_name: string;
  candidate_user_id: number | null;
  recruiter_name: string;
  recruiter_user_id: number | null;
  
  job_title: string;
  last_message_preview: string;
  last_message_at: string | null;
  unread_count: number;
  
  // ✅ Dynamic other user
  other_user: OtherUser;
}
```

#### 2. Helper Functions

```typescript
/**
 * Get the other participant's name dynamically based on current user.
 */
function getOtherParticipantName(
  conversation: Conversation, 
  currentUserId: number
): string {
  // Use pre-computed other_user from backend (most reliable)
  if (conversation.other_user?.full_name) {
    return conversation.other_user.full_name;
  }
  
  // Fallback: manually determine based on user IDs
  if (currentUserId === conversation.candidate_user_id) {
    return conversation.recruiter_name;
  } else if (currentUserId === conversation.recruiter_user_id) {
    return conversation.candidate_name;
  }
  
  return 'Unknown';
}

/**
 * Check if a message is from the current user (for bubble ownership).
 */
function isOwnMessage(message: Message, currentUserId: number): boolean {
  return message.sender_user_id === currentUserId;
}
```

#### 3. ChatThread Header

```typescript
// Get the other participant's name for the header
const otherParticipantName = getOtherParticipantName(conversation, currentUserId);

return (
  <div className="thread-header">
    <div className="thread-avatar">
      {otherParticipantName.charAt(0).toUpperCase()}
    </div>
    <div className="thread-header-info">
      <div className="thread-header-name">{otherParticipantName}</div>
      <div className="thread-header-meta">
        {conversation.job_title}
        {/* presence indicator */}
      </div>
    </div>
  </div>
);
```

#### 4. Message Bubble Ownership

```typescript
// Group messages with correct ownership
const groupedMessages = messages.map((msg, idx) => {
  // ✅ Use helper function for ownership
  const isMine = isOwnMessage(msg, currentUserId);
  const isFirstInGroup = !prevMsg || prevMsg.sender_user_id !== msg.sender_user_id;
  const isLastInGroup = !nextMsg || nextMsg.sender_user_id !== msg.sender_user_id;
  return { msg, isMine, isFirstInGroup, isLastInGroup };
});

// Render with dynamic classes
<div className={`msg-row ${isMine ? 'msg-row--mine' : 'msg-row--theirs'}`}>
  <div className={`msg-bubble ${isMine ? 'msg-bubble--mine' : 'msg-bubble--theirs'}`}>
    {msg.text}
  </div>
</div>
```

#### 5. Conversation List Items

```typescript
{conversations.map((conv) => {
  const otherParticipantName = getOtherParticipantName(conv, currentUserId);
  
  return (
    <li className="conv-item">
      <div className="conv-avatar">
        {otherParticipantName.charAt(0).toUpperCase()}
      </div>
      <div className="conv-info">
        <span className="conv-name">{otherParticipantName}</span>
        <span className="conv-job">{conv.job_title}</span>
      </div>
    </li>
  );
})}
```

---

## CSS Design Tokens (Already Correct)

```css
:root {
  --brand-primary: #5b45e0;        /* Purple - own messages */
  --bubble-mine-bg: #5b45e0;       /* Purple background */
  --bubble-mine-text: #ffffff;     /* White text */
  
  --bubble-theirs-bg: #f0f0f0;     /* Light gray background */
  --bubble-theirs-text: #1a1a2e;   /* Dark text */
  
  --meta-color: #8a8fa8;           /* Timestamp color */
  --receipt-read-color: #22c55e;   /* Green read receipts */
}
```

---

## How It Works

### Scenario 1: Candidate Dashboard (Sarah Anderson)

**Current User**: Sarah Anderson (candidate_user_id: 1)

**Conversation Data**:
```json
{
  "candidate_name": "Sarah Anderson",
  "candidate_user_id": 1,
  "recruiter_name": "Jennifer Smith", 
  "recruiter_user_id": 4,
  "other_user": {
    "id": 4,
    "full_name": "Jennifer Smith"
  }
}
```

**Result**:
- Header shows: **"Jennifer Smith"** ✅
- Sarah's messages: **right side, purple** ✅
- Jennifer's messages: **left side, gray** ✅
- Conversation list title: **"Jennifer Smith"** ✅

### Scenario 2: Recruiter Dashboard (Jennifer Smith)

**Current User**: Jennifer Smith (recruiter_user_id: 4)

**Same Conversation Data** (backend switches `other_user`):
```json
{
  "candidate_name": "Sarah Anderson",
  "candidate_user_id": 1,
  "recruiter_name": "Jennifer Smith",
  "recruiter_user_id": 4,
  "other_user": {
    "id": 1,
    "full_name": "Sarah Anderson"
  }
}
```

**Result**:
- Header shows: **"Sarah Anderson"** ✅
- Jennifer's messages: **right side, purple** ✅
- Sarah's messages: **left side, gray** ✅
- Conversation list title: **"Sarah Anderson"** ✅

---

## Acceptance Criteria ✅

- [x] Candidate Dashboard thread header shows recruiter name dynamically
- [x] Recruiter Dashboard thread header shows candidate name dynamically
- [x] No names are hardcoded anywhere
- [x] Candidate's own messages appear on right in candidate dashboard
- [x] Recruiter messages appear on left in candidate dashboard (gray)
- [x] Recruiter's own messages appear on right in recruiter dashboard
- [x] Candidate messages appear on left in recruiter dashboard (gray)
- [x] Conversation list shows correct opposite participant
- [x] Bubble ownership uses `message.sender_user_id === currentUser.id`
- [x] Both dashboards behave like same app with perspective switching
- [x] Presence indicators show for other participant
- [x] Read receipts work correctly
- [x] Timestamps display properly

---

## Testing Instructions

### 1. Test Candidate Dashboard (Sarah)

1. Log in as **sarah.anderson@email.com** / **Kutty_1304**
2. Navigate to Messages tab
3. Open conversation with Jennifer Smith
4. **Verify**:
   - Header shows "Jennifer Smith" ✅
   - Your messages (Sarah's) are on the RIGHT with PURPLE bubble ✅
   - Jennifer's messages are on the LEFT with GRAY bubble ✅
   - Conversation list shows "Jennifer Smith" ✅

### 2. Test Recruiter Dashboard (Jennifer)

1. Log in as **admin.jennifer@techcorp.com** / **Kutty_1304**
2. Navigate to Messages tab
3. Open same conversation
4. **Verify**:
   - Header shows "Sarah Anderson" ✅
   - Your messages (Jennifer's) are on the RIGHT with PURPLE bubble ✅
   - Sarah's messages are on the LEFT with GRAY bubble ✅
   - Conversation list shows "Sarah Anderson" ✅

### 3. Send Messages Both Ways

1. Send message from candidate → appears right-purple for candidate, left-gray for recruiter ✅
2. Send message from recruiter → appears right-purple for recruiter, left-gray for candidate ✅
3. Verify read receipts update correctly ✅

---

## Files Modified

### Backend
- **backend2/app/routers/chat.py**
  - Enhanced `_serialize_conversation()` to include explicit participant info
  - Already had correct viewer-based "other_user" logic

### Frontend
- **frontend2/src/pages/MessagesPage.tsx**
  - Added `candidate_user_id`, `recruiter_name`, `recruiter_user_id` to `Conversation` interface
  - Created `getOtherParticipantName()` helper function
  - Created `isOwnMessage()` helper function
  - Updated `ChatThread` header to use helper
  - Updated message grouping to use `isOwnMessage()`
  - Updated `ConversationList` to accept `currentUserId` prop
  - Updated conversation list items to use helper

### Styling (No Changes Needed)
- **frontend2/src/styles/MessagesPage.css**
  - CSS design tokens already correct
  - Bubble colors already properly defined

---

## Architecture Benefits

### 1. **Single Source of Truth**
- Backend determines "other_user" based on `viewer_user_id`
- Frontend trusts backend's computation
- Fallback logic ensures robustness

### 2. **Reusable Helper Functions**
- `getOtherParticipantName()` → Used in header + list
- `isOwnMessage()` → Used for bubble ownership
- Easy to maintain and test

### 3. **Type Safety**
- TypeScript interfaces match backend contract
- Explicit nullable types for IDs
- No unsafe casts or assertions

### 4. **Performance**
- Backend computes presence/identity once per conversation                                                                                                                                                                                                                                                                                                                                                                                                                   
- Frontend just displays pre-computed data
- No redundant calculations

### 5. **Accessibility**
- Proper ARIA labels
- Avatar alt text uses dynamic names
- Read status conveyed to screen readers

---

## Related Documentation

- Original messaging implementation: **MessagesPage.tsx** (WhatsApp-style UI)
- Backend chat endpoints: **backend2/app/routers/chat.py**
- Styling guide: **frontend2/src/styles/MessagesPage.css**
- Error handling improvements: **MESSAGING_ERROR_HANDLING.md** (see earlier fix)

---

## Future Enhancements

### Potential Improvements
- Multi-participant group chats (currently 1:1 only)
- Typing indicators showing other participant typing
- Message reactions/emojis
- File/image attachments in messages
- Voice/video call integration
- Search within conversation history
- Archive/mute conversations

### Current Limitations
- Conversations are 1:1 (one candidate, one company user)
- No support for multiple company users in same conversation
- Presence updates require page refresh (no WebSocket yet)

---

## Troubleshooting

### Issue: Header shows "Unknown"
**Cause**: Backend not returning `other_user.full_name`
**Fix**: Verify `_serialize_conversation()` returns proper User object

### Issue: All bubbles on same side
**Cause**: `currentUserId` not being passed correctly
**Fix**: Check `localStorage.getItem('user_id')` is set after login

### Issue: Wrong colors
**Cause**: CSS variables not applied
**Fix**: Verify `MessagesPage.css` is loaded and `:root` tokens defined

### Issue: Wrong names in list
**Cause**: `currentUserId` not passed to `ConversationList`
**Fix**: Verify prop is passed in MessagesPage render

---

## Summary

This fix implements **complete dynamic participant identity resolution** for the TalentGraph messaging system. Both Candidate and Recruiter dashboards now correctly show the other participant's name in headers and conversation lists, with proper bubble ownership (own messages right/purple, incoming left/gray). The implementation uses:

✅ **Backend-driven identity** via `viewer_user_id` parameter
✅ **Explicit participant fields** for clarity and reliability  
✅ **Reusable helper functions** for consistent logic
✅ **Type-safe TypeScript interfaces** matching backend contract
✅ **Zero hardcoded names or roles** - fully dynamic
✅ **Proper CSS design tokens** for consistent styling

The messaging system now provides a **professional, perspective-aware chat experience** that works correctly regardless of which dashboard the user is viewing.

**Status: Complete & Tested** ✅
