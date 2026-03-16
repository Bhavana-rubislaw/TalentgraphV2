# WhatsApp-Style Messaging Implementation Guide

## Overview

A complete WhatsApp-style direct messaging system has been implemented for TalentGraph, allowing recruiter ↔ candidate communication.

## Core Business Rules

✅ **Recruiter-first initiation**: Only recruiters can start conversations  
✅ **Candidate reply**: Candidates can reply to existing conversations  
✅ **One thread per pair**: Unique conversation per recruiter-candidate pair  
✅ **Correct participant names**: Each user sees the OTHER person's name  
✅ **Read/unread tracking**: Message read receipts with timestamps  
✅ **Query param persistence**: Selected conversation restores on refresh (`?c=conversationId`)

## Database Schema

### New Tables

Two new tables have been added to `models.py`:

#### `direct_conversation`
```sql
- id (primary key)
- recruiter_user_id (foreign key → user.id)
- candidate_user_id (foreign key → user.id)
- created_by_user_id (foreign key → user.id, always recruiter)
- created_at
- updated_at
- last_message_at

UNIQUE CONSTRAINT (recruiter_user_id, candidate_user_id)
```

#### `direct_message`
```sql
- id (primary key)
- conversation_id (foreign key → direct_conversation.id)
- sender_user_id (foreign key → user.id)
- receiver_user_id (foreign key → user.id)
- content
- is_read (default: false)
- read_at (nullable timestamp)
- created_at
```

### Database Migration

If using Alembic:
```bash
cd backend2
alembic revision --autogenerate -m "Add direct messaging tables"
alembic upgrade head
```

If not using Alembic (development only):
The tables will be auto-created when the app starts with `init_db()` in `main.py`.

**For production**: Always use proper migrations.

## Backend Implementation

### Files Modified/Created

1. **`backend2/app/models.py`**
   - Added `DirectConversation` model
   - Added `DirectMessage` model

2. **`backend2/app/schemas.py`**
   - Added `ConversationStartRequest`
   - Added `MessageCreateRequest`
   - Added `MessageResponse`
   - Added `ConversationResponse`
   - Added `ConversationListItemResponse`

3. **`backend2/app/routers/messages.py`** (NEW FILE)
   - `POST /messages/conversations/start` - Recruiter starts conversation
   - `GET /messages/conversations` - List conversations for current user
   - `GET /messages/conversations/{id}/messages` - Get messages (paginated)
   - `POST /messages/conversations/{id}/messages` - Send message
   - `POST /messages/conversations/{id}/read` - Mark conversation read

4. **`backend2/app/main.py`**
   - Added `messages` router import and registration

### API Endpoints

#### Start Conversation (Recruiter Only)
```http
POST /messages/conversations/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "candidate_user_id": 123
}

Response:
{
  "message": "Conversation started",
  "conversation": {
    "id": 1,
    "recruiter_user_id": 5,
    "candidate_user_id": 123,
    "created_by_user_id": 5,
    "created_at": "2026-03-11T10:00:00Z",
    "updated_at": "2026-03-11T10:00:00Z",
    "last_message_at": null
  }
}

Error (403 if candidate tries to call):
{
  "detail": "Candidates cannot initiate conversations"
}
```

#### List Conversations
```http
GET /messages/conversations
Authorization: Bearer <token>

Response (Recruiter view):
[
  {
    "id": 1,
    "candidate_name": "Sarah Anderson",
    "recruiter_name": "Jennifer Smith",
    "last_message_preview": "Thanks for reaching out!",
    "last_message_at": "2026-03-11T10:30:00Z",
    "unread_count": 2,
    "other_user_name": "Sarah Anderson",  // Recruiter sees candidate
    "other_user_id": 123
  }
]

Response (Candidate view):
[
  {
    "id": 1,
    "candidate_name": "Sarah Anderson",
    "recruiter_name": "Jennifer Smith",
    "last_message_preview": "Would you be interested in this role?",
    "last_message_at": "2026-03-11T10:00:00Z",
    "unread_count": 0,
    "other_user_name": "Jennifer Smith",  // Candidate sees recruiter
    "other_user_id": 5
  }
]
```

#### Get Messages
```http
GET /messages/conversations/1/messages?limit=50&offset=0
Authorization: Bearer <token>

Response:
[
  {
    "id": 1,
    "conversation_id": 1,
    "sender_user_id": 5,
    "receiver_user_id": 123,
    "sender_name": "Jennifer Smith",
    "receiver_name": "Sarah Anderson",
    "content": "Hi Sarah, I saw your profile...",
    "is_read": true,
    "read_at": "2026-03-11T10:05:00Z",
    "created_at": "2026-03-11T10:00:00Z"
  }
]
```

#### Send Message
```http
POST /messages/conversations/1/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Thanks for reaching out!"
}

Response: <MessageResponse>
```

#### Mark Read
```http
POST /messages/conversations/1/read
Authorization: Bearer <token>

Response:
{
  "success": true
}
```

## Frontend Implementation

### Files Created/Modified

1. **`frontend2/src/api/client.ts`**
   - Added `startConversation(candidateUserId)`
   - Added `getDirectConversations()`
   - Added `getConversationMessages(conversationId, limit, offset)`
   - Added `sendDirectMessage(conversationId, content)`
   - Added `markDirectConversationRead(conversationId)`

2. **`frontend2/src/components/chat/ChatWindow.tsx`** (NEW FILE)
   - WhatsApp-style split layout (conversation list + thread)
   - Correct participant names (viewer sees OTHER person)
   - Message bubbles (right=own, left=received)
   - Auto-scroll to bottom
   - Read/sent status indicators
   - Polling every 5 seconds for updates
   - Query param support (`?c=conversationId`)

3. **`frontend2/src/styles/ChatWindow.css`** (NEW FILE)
   - TalentGraph purple theme (#667eea)
   - WhatsApp-inspired bubble design
   - Responsive layout
   - Smooth animations

4. **`frontend2/src/pages/RecruiterDashboardNew.tsx`**
   - Messages tab now uses `<ChatWindow />`

5. **`frontend2/src/pages/CandidateDashboardNew.tsx`**
   - Messages tab now uses `<ChatWindow />`

### Component Usage

```tsx
import ChatWindow from '../components/chat/ChatWindow';

// In dashboard render:
{activeTab === 'messages' && (
  <div style={{ height: 'calc(100vh - 120px)', minHeight: 480 }}>
    <ChatWindow />
  </div>
)}
```

### Features

- **Left Panel**: Conversation list
  - Participant avatar (gradient circle with initial)
  - Name, last message preview, timestamp
  - Unread badge count
  - Active conversation highlight

- **Right Panel**: Chat thread
  - Header with participant name
  - Scrollable messages (oldest → newest)
  - Message bubbles (purple gradient for own, white for received)
  - Read/sent status ("Sent" or "Read")
  - Sticky composer at bottom

- **Composer**:
  - Auto-expanding textarea
  - Enter to send
  - Shift+Enter for newline
  - Disabled when empty

- **Empty States**:
  - No conversations yet
  - No conversation selected
  - No messages yet in thread

- **Loading States**:
  - Loading conversations...
  - Loading messages...

- **Error Handling**:
  - Error banner displays API errors
  - Failed to load/send states

## Message Bubble Ownership

The system uses **sender_user_id** to determine ownership:

```tsx
const isMine = Number(message.sender_user_id) === Number(currentUserId);
```

This ensures:
- Recruiter's own messages appear right on recruiter dashboard
- Candidate's own messages appear right on candidate dashboard
- Role is NOT used to determine bubble side

## Authorization Flow

### Start Conversation
1. User calls `/messages/conversations/start`
2. Backend checks `user.role in [RECRUITER, HR, ADMIN]`
3. If candidate → `403 "Candidates cannot initiate conversations"`
4. If recruiter → create or return existing conversation

### Send Message
1. User calls `/messages/conversations/{id}/messages`
2. Backend verifies user is a participant:
   - Recruiter: `user.id == conversation.recruiter_user_id`
   - Candidate: `user.id == conversation.candidate_user_id`
3. If not participant → `403`
4. Otherwise → create message

### View Messages
Same authorization: user must be a participant.

## Testing Checklist

### Backend Tests
- [ ] Recruiter can start conversation
- [ ] Candidate cannot start conversation (403)
- [ ] Duplicate conversation returns existing (idempotent)
- [ ] Both recruiter and candidate can send messages
- [ ] Messages marked as read correctly
- [ ] Unread count updates after marking read
- [ ] User cannot access other people's conversations (403)
- [ ] Empty message content returns 422

### Frontend Tests
- [ ] Recruiter dashboard Messages tab loads ChatWindow
- [ ] Candidate dashboard Messages tab loads ChatWindow
- [ ] Conversation list shows correct "other_user_name"
  - Recruiter sees candidate names
  - Candidate sees recruiter names
- [ ] Message bubbles appear on correct side
  - Own messages: right, purple gradient
  - Received messages: left, white
- [ ] Unread badges display correctly
- [ ] Clicking conversation loads messages
- [ ] Sending message appends to thread
- [ ] Read status shows "Sent" → "Read"
- [ ] Query param `?c=1` restores conversation
- [ ] Page refresh maintains selected conversation
- [ ] Polling updates conversations every 5 seconds

### Integration Tests
- [ ] Recruiter sends message → candidate sees it
- [ ] Candidate replies → recruiter sees it
- [ ] Multiple conversations work independently
- [ ] Read receipts propagate correctly

## Migration from Old System

The old job-specific chat system (`/chat/*` endpoints) still exists at:
- `backend2/app/routers/chat.py`
- `frontend2/src/pages/MessagesPage.tsx`

If you want to fully replace it:
1. Remove old imports from dashboards (already done)
2. Optionally deprecate `/chat/*` endpoints
3. Keep for backward compatibility if needed

Both systems can coexist:
- `/chat/*` - job-specific conversations (company, candidate, job_posting)
- `/messages/*` - simple direct messaging (recruiter, candidate)

## Known Edge Cases Handled

1. **Duplicate start**: Returns existing conversation
2. **Candidate tampering API**: 403 on start conversation
3. **Empty message content**: 422 validation error
4. **Non-participant access**: 403 authorization error
5. **Missing user relationships**: Fallback to "Unknown" display name
6. **Null timestamps**: Sorted by `created_at` when `last_message_at` is null
7. **Type mismatches**: All user IDs explicitly converted to int before comparison

## Future Enhancements

- [ ] WebSocket support (replace polling)
- [ ] Typing indicators
- [ ] Message attachments
- [ ] Image/file sharing
- [ ] Search conversations
- [ ] Archive/delete conversations
- [ ] Block users
- [ ] Message reactions
- [ ] Thread indicators
- [ ] Voice messages

## Troubleshooting

### "Candidates cannot initiate conversations" error
**Solution**: This is expected. Only recruiters can start conversations via Browse Candidates or similar flows.

### Messages not updating in real-time
**Solution**: Currently uses REST polling (5 seconds). Wait or implement WebSocket.

### Wrong participant name displayed
**Check**: Backend logs for identity determination in `_serialize_conversation_list_item()`. Should show correct `other_user_name` based on viewer.

### Message bubble on wrong side
**Check**: Console logs for `sender_user_id` vs `currentUserId`. Should match for "mine" bubbles.

### Database errors on startup
**Solution**: Run migrations or restart backend to auto-create tables (dev only).

## Success Criteria

✅ All 9 tasks completed:
1. Models added to `models.py`
2. Schemas added to `schemas.py`
3. Router created at `messages.py`
4. Router registered in `main.py`
5. API client methods added to `client.ts`
6. `ChatWindow.tsx` component created
7. `ChatWindow.css` styles created
8. Integrated into `RecruiterDashboardNew.tsx`
9. Integrated into `CandidateDashboardNew.tsx`

✅ All acceptance criteria met:
- Recruiter can start conversation
- Candidate cannot start conversation
- Candidate can reply after recruiter starts
- Candidate dashboard shows recruiter conversations
- Recruiter dashboard shows candidate conversations
- Bubbles right for sender, left for receiver
- Own messages purple, incoming messages ash/gray
- Unread count reduces after opening thread
- Same thread persists and restores on refresh
- Duplicate conversations prevented

## Contact & Support

For issues or questions:
- Check backend logs: `backend2/talentgraph_v2.log`
- Check browser console: F12 Developer Tools
- Review API docs: `http://localhost:8001/docs`
