# Quick Start Guide - Chat System

## 🚀 Getting Started in 3 Steps

### Step 1: Run Database Migration (One-time)

```bash
cd backend2
python migrate_chat_read_receipts.py
```

**Expected output:**
```
✅ Migration completed successfully!
```

---

### Step 2: Start Backend

```bash
cd backend2
uvicorn app.main:app --reload --port 8001
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8001
INFO:     Application startup complete.
```

---

### Step 3: Start Frontend (in new terminal)

```bash
cd frontend2
npm run dev
```

**Expected output:**
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

---

## 🧪 Quick Test

### Test as Recruiter:

1. Open browser: `http://localhost:5173`
2. Log in as recruiter
3. Go to **Matches** or **Recommendations** tab
4. Find a matched candidate
5. Click **"Message"** button
6. Type: "Hello! Interested in discussing this role?"
7. Press Enter
8. ✅ Message appears on right side with purple bubble
9. ✅ Status shows: "10:42 AM · Sent"

### Test as Candidate (in incognito/different browser):

1. Open browser: `http://localhost:5173`
2. Log in as candidate
3. Go to **Messages** tab
4. ✅ See notification for new conversation
5. Click the conversation
6. ✅ Recruiter's message appears on left with white bubble
7. Type: "Thanks for reaching out!"
8. Press Enter
9. ✅ Your message appears on right with purple bubble

### Verify Read Receipt (back in recruiter view):

1. Switch back to recruiter browser
2. Wait 5-10 seconds (polling interval)
3. ✅ Message status changes to: "10:42 AM · Read"

---

## ✅ Success Indicators

You've successfully deployed the chat system if:

1. ✅ Migration runs without errors
2. ✅ Backend starts on port 8001
3. ✅ Frontend starts on port 5173
4. ✅ Recruiter can create conversation
5. ✅ Candidate can reply
6. ✅ Messages show different colors
7. ✅ Read receipts update
8. ✅ Conversations persist after refresh

---

## 🔍 Troubleshooting

### Migration fails with "column already exists"
**Solution:** Migration is idempotent. If columns exist, it's safe to proceed. Just skip the error and restart backend.

### Backend won't start
**Check:**
- Is port 8001 already in use? `netstat -ano | findstr :8001`
- Database connection configured? Check `.env` or environment variables
- Dependencies installed? `pip install -r requirements.txt`

### Frontend won't start
**Check:**
- Is port 5173 already in use?
- Dependencies installed? `npm install`
- Node version 16+? `node --version`

### Messages not appearing
**Check:**
- Backend running? Visit `http://localhost:8001/docs`
- Browser console for errors? Press F12
- Network tab shows 200 responses?
- Token stored? Check localStorage in browser DevTools

---

## 📱 Endpoints to Test

### Health Check
```bash
curl http://localhost:8001/
```

### List Conversations (with auth token)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8001/chat/conversations
```

### API Documentation
Open in browser: `http://localhost:8001/docs`

---

## 🎯 Key URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8001
- **API Docs:** http://localhost:8001/docs
- **Candidate Messages:** http://localhost:5173/candidate-dashboard?tab=messages
- **Recruiter Messages:** http://localhost:5173/recruiter-dashboard?tab=messages

---

## 📝 Environment Variables

Backend expects (in `.env` or environment):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/talentgraph
APP_JWT_SECRET=your-secret-key
APP_JWT_EXP_HOURS=24
APP_ENV=development
```

Frontend expects (in `.env`):

```env
VITE_API_URL=http://localhost:8001
```

---

## ✨ Visual Reference

### Recruiter View:
```
┌─────────────────────────────────────────┐
│ Messages                          🔄    │
├─────────────────────────────────────────┤
│ [Avatar] Sarah Johnson       10:42 AM   │
│          Senior Python Developer        │
│          Thanks for reaching out!   (1) │ ← Unread badge
├─────────────────────────────────────────┤
│                                         │
│ Chat with Sarah Johnson                 │
│ Senior Python Developer  🟢 Active now  │
├─────────────────────────────────────────┤
│                                         │
│  [S] Hello! Interested in...            │ ← White bubble (left)
│      10:41 AM                           │
│                                         │
│              Thanks for reaching out! [▪]│ ← Purple bubble (right)
│              10:42 AM · Read ✓          │
│                                         │
└─────────────────────────────────────────┘
│ Type a message...              [Send]   │
└─────────────────────────────────────────┘
```

### Candidate View:
```
┌─────────────────────────────────────────┐
│ Messages                          🔄    │
├─────────────────────────────────────────┤
│ [Avatar] Jennifer Smith      10:41 AM   │
│          Senior Python Developer        │
│          Hello! Interested in...    (1) │
├─────────────────────────────────────────┤
│                                         │
│ Chat with Jennifer Smith                │
│ Senior Python Developer  🟢 Active now  │
├─────────────────────────────────────────┤
│                                         │
│  [J] Hello! Interested in...            │ ← White bubble (left)
│      10:41 AM                           │
│                                         │
│              Thanks for reaching out! [▪]│ ← Purple bubble (right)
│              10:42 AM · Sent ⟳          │
│                                         │
└─────────────────────────────────────────┘
│ Type a message...              [Send]   │
└─────────────────────────────────────────┘
```

---

## 🎉 You're All Set!

The chat system is now running with:
- ✅ Real-time-like messaging (10s polling)
- ✅ Read receipts with timestamps
- ✅ Professional WhatsApp-style UI
- ✅ Persistent conversation history
- ✅ Mobile-responsive design

---

**Need help?** Check:
- `CHAT_SYSTEM_GUIDE.md` - Detailed implementation
- `CHAT_TESTING_CHECKLIST.md` - Testing procedures
- `CHAT_IMPLEMENTATION_SUMMARY.md` - Overview
