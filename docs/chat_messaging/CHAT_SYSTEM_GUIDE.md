# Chat System Implementation Guide

## Overview

TalentGraph now has a production-quality persistent chat system with WhatsApp/LinkedIn-style messaging UI, complete with read receipts, timestamps, and proper left/right bubble layouts.

---

## ✅ Acceptance Criteria Met

### 1. Business Rules
- ✅ **Recruiter-first messaging**: Only recruiters can initiate conversations
- ✅ **Candidate reply-only**: Candidates can only reply to existing conversations
- ✅ **Persistent history**: All messages stored in DB and reload on app restart
- ✅ **No duplicates**: Unique constraint on (company_id, candidate_id, job_posting_id)

### 2. UI Requirements
- ✅ **Chat bubble layout**: Left/right alignment based on sender
- ✅ **Color differentiation**: Purple bubbles for current user, white for others
- ✅ **Timestamps**: Human-readable format (10:42 AM, Yesterday 8:10 PM)
- ✅ **Read receipts**: Status displayed under each message (Sent/Read)
- ✅ **Conversation list**: Shows latest message, timestamp, unread count
- ✅ **Empty/loading states**: Clean UI for all states

### 3. Technical Implementation
- ✅ **Message ownership**: Correctly identifies current user's messages
- ✅ **Persistence**: Conversations restore with ?c= query param
- ✅ **Authorization**: Proper 401/403/404 error handling
- ✅ **Read tracking**: Per-message read state with timestamps

---

## Database Schema

### Message Model (Updated)

```python
class Message(SQLModel, table=True):
    id: Optional[int]
    conversation_id: int
    sender_user_id: int
    sender_role: Optional[str]     # NEW: "candidate", "recruiter", "hr", "admin"
    text: str
    is_read: bool
    read_at: Optional[datetime]    # NEW: Timestamp when message was read
    created_at: datetime
```

### Conversation Model (Existing)

```python
class Conversation(SQLModel, table=True):
    id: Optional[int]
    company_id: int
    candidate_id: int
    job_posting_id: int
    created_by_user_id: int
    last_message_at: Optional[datetime]
    created_at: datetime
    # Unique constraint: (company_id, candidate_id, job_posting_id)
```

---

## Backend API Endpoints

### 1. Create Conversation (Recruiter Only)
```http
POST /chat/conversations
Authorization: Bearer <token>

{
  "candidate_id": 123,
  "job_posting_id": 456
}

Response 200:
{
  "id": 1,
  "company_id": 10,
  "candidate_id": 123,
  "job_posting_id": 456,
  "candidate_name": "Sarah Johnson",
  "job_title": "Senior Python Developer",
  "last_message_preview": "",
  "unread_count": 0,
  "other_user": {
    "id": 124,
    "full_name": "Sarah Johnson",
    "is_online": true,
    "last_seen_at": "2026-03-09T15:30:00Z"
  },
  ...
}
```

**Rules:**
- Only recruiter/hr/admin can create
- Eligibility required (recruiter must have liked/invited candidate)
- Idempotent - returns existing conversation if already present
- Sends notification to candidate

### 2. List Conversations
```http
GET /chat/conversations
Authorization: Bearer <token>

Response 200: [
  {
    "id": 1,
    "candidate_name": "Sarah Johnson",
    "job_title": "Senior Python Developer",
    "last_message_preview": "Thanks for reaching out!",
    "last_message_at": "2026-03-09T15:45:00Z",
    "unread_count": 2,
    "other_user": { ... }
  },
  ...
]
```

**Behavior:**
- Recruiters see all company conversations
- Candidates see only their conversations
- Sorted by last_message_at (newest first)

### 3. Get Messages
```http
GET /chat/conversations/{id}/messages?limit=50&before=100
Authorization: Bearer <token>

Response 200: [
  {
    "id": 101,
    "conversation_id": 1,
    "sender_user_id": 5,
    "sender_name": "Jennifer Smith",
    "sender_role": "recruiter",
    "text": "Hello Sarah, we'd love to discuss this role with you!",
    "is_read": true,
    "read_at": "2026-03-09T15:35:00Z",
    "status": "read",
    "created_at": "2026-03-09T15:30:00Z"
  },
  ...
]
```

**Features:**
- Paginated (default limit: 50)
- Cursor-based pagination with `before` param
- Returns messages with read status
- Updates sender's last_seen_at

### 4. Send Message
```http
POST /chat/conversations/{id}/messages
Authorization: Bearer <token>

{
  "text": "Thanks for reaching out!"
}

Response 201:
{
  "id": 102,
  "conversation_id": 1,
  "sender_user_id": 124,
  "sender_name": "Sarah Johnson",
  "sender_role": "candidate",
  "text": "Thanks for reaching out!",
  "is_read": false,
  "read_at": null,
  "status": "sent",
  "created_at": "2026-03-09T15:45:00Z"
}
```

**Rules:**
- Both parties can send after conversation exists
- Text limited to 4000 characters
- Updates conversation.last_message_at
- Sends notification to recipient

### 5. Mark as Read
```http
POST /chat/conversations/{id}/read
Authorization: Bearer <token>

Response 200:
{
  "marked_read": 2
}
```

**Behavior:**
- Marks all unread messages in conversation as read
- Sets is_read = true and read_at = now()
- Only marks messages sent by the other participant

---

## Frontend Implementation

### Route Structure

**Candidate:**
- `/candidate-dashboard?tab=messages` - Messages tab
- `/candidate-dashboard?tab=messages&c=1` - Specific conversation

**Recruiter:**
- `/recruiter-dashboard?tab=messages` - Messages tab
- `/recruiter-dashboard?tab=messages&c=1` - Specific conversation

### Components

#### 1. MessagesPage
Main container with two-panel layout:
- **Left panel**: Conversation list
- **Right panel**: Active chat thread or empty state

#### 2. ConversationList
- Displays all conversations
- Shows avatar, name, job title, latest message preview
- Unread badge and count
- Online presence indicator
- Handles loading/empty states

#### 3. ChatThread
- Message thread display
- Message composer at bottom
- Thread header with participant info
- Pagination (load more button)

#### 4. Message Bubble
Each message displays:
- **Avatar** (for received messages only)
- **Sender name** (for received messages only)
- **Bubble** with rounded corners and color
- **Metadata** line: timestamp and status

### Message Styling

#### Current User (Right-aligned)
```css
.msg-bubble--mine {
  background: #6366f1;    /* Purple */
  color: #ffffff;
  border-radius: 18px 4px 18px 18px;  /* Tail on top-right */
  align-self: flex-end;
}
```

#### Other User (Left-aligned)
```css
.msg-bubble--theirs {
  background: #ffffff;    /* White */
  color: #111827;
  border-radius: 4px 18px 18px 18px;  /* Tail on top-left */
  align-self: flex-start;
}
```

### Read Receipt Display

**Sent message (own):**
```
10:42 AM · Sent
```

**Read message (own):**
```
10:42 AM · Read
```

**Received message:**
```
10:43 AM
```

### Timestamp Formatting

```typescript
function formatMessageTimestamp(iso: string, status?: string, isMine?: boolean): string {
  const time = formatTime(iso);
  if (isMine && status) {
    const statusLabel = status === 'read' ? 'Read' : 'Sent';
    return `${time} · ${statusLabel}`;
  }
  return time;
}
```

**Examples:**
- `10:42 AM` - Today
- `Yesterday 8:10 PM` - Yesterday
- `Mar 9, 10:42 AM` - Older messages

### State Management

#### Persistence
- Selected conversation stored in URL: `?c={conversationId}`
- Restored on page load/refresh
- Browser back/forward navigation works correctly

#### Polling
- Conversations refreshed every 10 seconds
- Active thread messages refreshed every 10 seconds
- Silent failures (doesn't interrupt user)

#### Message Ownership
```typescript
const isMine = msg.sender_user_id === currentUserId;
```

---

## Deployment Steps

### 1. Run Database Migration

```bash
cd backend2
python migrate_chat_read_receipts.py
```

This adds:
- `message.sender_role` column
- `message.read_at` column
- Backfills existing data

### 2. Restart Backend

```bash
# Development
uvicorn app.main:app --reload --port 8001

# Production (via start.sh or gunicorn)
./start.sh
```

### 3. Clear Frontend Cache (Optional)

```bash
cd frontend2
npm run build
```

### 4. Test Functionality

#### Recruiter Flow:
1. Log in as recruiter
2. Navigate to a matched candidate
3. Click "Message" button
4. Type and send a message
5. Verify message shows "Sent" status

#### Candidate Flow:
1. Log in as candidate
2. Go to Messages tab
3. See notification for new conversation
4. Open conversation
5. Reply to recruiter
6. Verify recruiter's message now shows "Read" status

---

## Troubleshooting

### Messages not appearing

**Issue:** Messages sent but don't appear in thread

**Solution:**
- Check browser console for errors
- Verify API endpoint returns 201 status
- Check polling is active (should refresh every 10s)
- Verify conversation_id in URL matches backend

### Read receipts not updating

**Issue:** Messages stuck on "Sent" status

**Solution:**
- Verify `mark_read` endpoint is called when opening conversation
- Check `read_at` field is set in database
- Ensure polling is active to update status
- Check backend serialization includes `status` field

### Wrong message alignment

**Issue:** Messages appear on wrong side

**Solution:**
- Verify `currentUserId` is set correctly
- Check `msg.sender_user_id` matches expected value
- Ensure AuthContext provides correct `user_id`
- Check localStorage has `user_id` stored

### Cannot create conversation

**Issue:** Recruiter gets 403 when starting chat

**Solution:**
- Verify recruiter has liked/invited candidate
- Check `Swipe` or `Match` record exists
- Ensure `job_posting_id` belongs to recruiter's company
- Check recruiter role in token (should be "recruiter", "hr", or "admin")

### Styling issues

**Issue:** Bubbles look wrong or overlapping

**Solution:**
- Clear browser cache
- Rebuild frontend: `npm run build`
- Check CSS is loaded correctly
- Verify class names match updated code

---

## Performance Considerations

### Pagination
- Default limit: 50 messages per load
- Use `before` cursor for older messages
- Scroll position preserved when loading more

### Polling
- 10-second interval (configurable)
- Silent failures don't interrupt UX
- Only active conversation polled for messages
- All conversations list always refreshed

### Database Indexes
Already optimized with indexes on:
- `message.conversation_id`
- `message.sender_user_id`
- `conversation.company_id`
- `conversation.candidate_id`

---

## Future Enhancements

### Potential Improvements
- [ ] Real-time updates with WebSockets
- [ ] "Delivered" status (requires server-side tracking)
- [ ] Typing indicators
- [ ] Message reactions
- [ ] File attachments
- [ ] Message search
- [ ] Push notifications
- [ ] Desktop notifications
- [ ] Message deletion
- [ ] Edit sent messages

### Scaling Considerations
- Consider Redis for real-time presence
- Add message archiving for old conversations
- Implement read-only mode for archived chats
- Add rate limiting for message sending

---

## Code Files Modified

### Backend
- `backend2/app/models.py` - Added `sender_role` and `read_at` to Message
- `backend2/app/routers/chat.py` - Updated serialization and read logic
- `backend2/migrate_chat_read_receipts.py` - New migration script

### Frontend
- `frontend2/src/pages/MessagesPage.tsx` - Enhanced UI and read receipt display
- `frontend2/src/styles/MessagesPage.css` - Improved bubble styling
- `frontend2/src/api/client.ts` - No changes needed (endpoints already existed)

---

## Support

For issues or questions:
1. Check this documentation
2. Review code comments in modified files
3. Check browser console for frontend errors
4. Check backend logs for API errors
5. Verify database migration completed successfully

---

**Last Updated:** March 9, 2026
**Version:** 2.0.0
**Status:** ✅ Production Ready
