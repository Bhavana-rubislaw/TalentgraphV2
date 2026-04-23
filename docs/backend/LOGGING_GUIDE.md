# TalentGraph V2 - Comprehensive Logging Guide

## Overview
This document explains the comprehensive logging system implemented across the entire TalentGraph V2 application.

## Backend Logging Setup

### Configuration (main.py)
```python
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('talentgraph_v2.log')
    ]
)
```

**Log File Location**: `backend2/talentgraph_v2.log`

### Log Levels Used
- **INFO**: Normal operations (user actions, CRUD operations, successful processes)
- **WARNING**: Invalid attempts (duplicate signups, already applied)
- **ERROR**: Failures (user not found, validation errors)

## Backend Logging Coverage

### Authentication (auth.py)
- `[SIGNUP]` - User registration attempts, success, failures
- `[LOGIN]` - Login attempts, success, failures, inactive account attempts
- `[AUTH]` - Token validation and user info requests

### Candidate Profile (candidates.py)
- `[CANDIDATE PROFILE]` - Profile create/read/update operations
- `[JOB PROFILE]` - Job profile CRUD with skill/location counts
- `[RESUME]` - File uploads, retrievals, deletions
- `[CERTIFICATION]` - Certificate file operations

### Dashboard (dashboard.py)
- `[DASHBOARD]` - All candidate and recruiter dashboard queries
- `[RECOMMENDATIONS]` - Matching algorithm execution
- `[MATCHES]` - Mutual match retrievals

### Applications (applications.py)
- `[APPLICATION]` - Job applications, status updates, withdrawals

### Swipes( swipes.py)
- `[SWIPE]` - Candidate swipe actions (like/pass/ask)
- `[RECRUITER SWIPE]` - Recruiter swipe actions
- `[MATCH]` - Mutual match creation

### Company/Recruiter (company.py, job_postings.py)
- `[COMPANY]` - Company profile operations
- `[JOB POSTING]` - Job creation, updates, deletions

### System (main.py)
- `[STARTUP]` - Application initialization, database setup, router registration
- `[SHUTDOWN]` - Application termdown
- `[HEALTH]` - Health check endpoint access

## Log Format Examples

```
2024-02-10 14:23:45,123 - app.routers.auth - INFO - [SIGNUP] Attempting signup for email: john@example.com, role: candidate
2024-02-10 14:23:45,234 - app.routers.auth - INFO - [SIGNUP] User created successfully - ID: 1, Email: john@example.com, Role: candidate
2024-02-10 14:23:45,345 - app.routers.auth - INFO - [SIGNUP] Token generated for user: john@example.com

2024-02-10 14:25:10,456 - app.routers.candidates - INFO - [JOB PROFILE] Creating profile with 5 skills and 2 locations
2024-02-10 14:25:10,567 - app.routers.candidates - INFO - [JOB PROFILE] Job profile created - ID: 1, Candidate ID: 1

2024-02-10 14:30:22,678 - app.routers.swipes - INFO - [SWIPE] Candidate 1 liked Job Posting 5
2024-02-10 14:30:22,789 - app.routers.swipes - INFO - [MATCH] Mutual match created - Candidate 1 <-> Job Posting 5

2024-02-10 14:35:33,890 - app.routers.applications - INFO - [APPLICATION] Candidate 1 applied to Job 5
2024-02-10 14:35:44,901 - app.routers.applications - INFO - [APPLICATION] Status updated to shortlisted - Application ID: 1
```

## Frontend Logging

### Console Log Categories

#### Navigation & Routing
```typescript
console.log('[NAVIGATION] Navigating to:', path)
console.log('[REDIRECT] Redirecting to:', destination)
```

#### API Calls
```typescript
console.log('[API CALL] Endpoint:', endpoint, 'Method:', method)
console.log('[API  SUCCESS]', endpoint, 'Response:', data)
console.error('[API ERROR]', endpoint, error)
```

#### User Actions
```typescript
console.log('[BUTTON CLICK]', buttonName)
console.log('[FORM SUBMIT]', formName, data)
console.log('[FILE UPLOAD]', fileName, size)
```

#### State Changes
```typescript
console.log('[STATE UPDATE]', stateName, newValue)
console.log('[DATA LOAD]', dataType, count)
```

#### Swipe Actions
```typescript
console.log('[SWIPE ACTION]', action, jobId)  // action: 'like', 'pass', 'ask'
```

## How to Read Logs

### Backend Logs
1. **Terminal/Console**: Real-time logs during development
2. **File**: `backend2/talentgraph_v2.log` - Persistent log file

### Finding Specific Events
```bash
# Search for signup events
grep "\[SIGNUP\]" talentgraph_v2.log

# Search for errors
grep "ERROR" talentgraph_v2.log

# Search for specific user
grep "john@example.com" talentgraph_v2.log

# Search for matches
grep "\[MATCH\]" talentgraph_v2.log
```

### Frontend Logs
1. **Browser DevTools Console**: F12 → Console tab
2. **Filter by pattern**: Use browser console filters
   - `[API`
   - `[NAVIGATION]`
   - `[BUTTON`

## Debugging Workflows

### User Flow Debugging
1. Track user from signup to match:
   ```
   [SIGNUP] → [CANDIDATE PROFILE] → [JOB PROFILE] → [SWIPE] → [MATCH]
   ```

2. Check logs in sequence:
   ```bash
   grep -E "\[SIGNUP\]|\[CANDIDATE PROFILE\]|\[JOB PROFILE\]" talentgraph_v2.log
   ```

### API Debugging
1. Check request in frontend console: `[API CALL]`
2. Check backend processing: Specific router logs
3. Check response: `[API SUCCESS]` or `[API ERROR]`

### Performance Monitoring
- Count operations: `grep -c "\[APPLICATION\]" talentgraph_v2.log`
- Time between events: Compare timestamps
- Identify bottlenecks: Long gaps between related logs

## Log Rotation (Production)

For production, configure log rotation:
```python
from logging.handlers import RotatingFileHandler

handler = RotatingFileHandler(
    'talentgraph_v2.log',
    maxBytes=10485760,  # 10MB
    backupCount=5
)
```

## Privacy & Security

### What's Logged
- User emails (for tracing user actions)
- IDs (user_id, candidate_id, job_id, etc.)
- Actions and timestamps
- Error messages

### What's NOT Logged
- Passwords
- Full personal data (phone numbers, addresses)
- Sensitive documents content
- JWT tokens (only "token generated" message)

## Monitoring Best Practices

1. **Development**: Keep console and file logging enabled
2. **Testing**: Review logs after each test scenario
3. **Production**: 
   - Monitor error logs daily
   - Set up alerts for ERROR level logs
   - Archive logs monthly
4. **Debugging**: Search by email or ID to track user journeys

## Common Log Patterns

### Successful User Journey
```
[SIGNUP] → [LOGIN] → [CANDIDATE PROFILE] → [JOB PROFILE] → [SWIPE] → [MATCH] → [APPLICATION]
```

### Error Pattern
```
[API CALL] → [ERROR] User not found
```

### Match Pattern
```
[SWIPE] Candidate likes Job → [RECRUITER SWIPE] Recruiter likes Candidate → [MATCH] created
```

## Adding New Logs

### Backend
```python
logger.info(f"[CATEGORY] Description - Key: {value}")
logger.warning(f"[CATEGORY] Warning condition")
logger.error(f"[CATEGORY] Error details")
```

### Frontend
```typescript
console.log('[CATEGORY] Description:', data)
console.error('[CATEGORY ERROR]', error)
```

### Categories Convention
- Use UPPERCASE for categories: `[SIGNUP]`, `[API CALL]`
- Be specific: `[JOB PROFILE]` not just `[PROFILE]`
- Include context: IDs, counts, status

## Troubleshooting Guide

| Issue | Log Pattern to Check |
|-------|---------------------|
| User can't login | `[LOGIN]` + email |
| Profile not saving | `[CANDIDATE PROFILE]` |
| No recommendations | `[DASHBOARD]` + `[RECOMMENDATIONS]` |
| Match not created | `[SWIPE]` + `[MATCH]` |
| Application failed | `[APPLICATION]` + ERROR |
| File upload issue | `[RESUME]` or `[CERTIFICATION]` |

## Log Analysis Commands

```bash
# Count users per day
grep "\[SIGNUP\]" talentgraph_v2.log | cut -d' ' -f1 | uniq -c

# List all errors today
grep "$(date +%Y-%m-%d)" talentgraph_v2.log | grep ERROR

# Track specific candidate
grep "Candidate ID: 123" talentgraph_v2.log

# See all matches created
grep "\[MATCH\] Mutual match created" talentgraph_v2.log

# API call frequency
grep "\[API CALL\]" talentgraph_v2.log | wc -l
```

