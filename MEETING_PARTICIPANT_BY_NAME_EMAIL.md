# Meeting Participants by Name and Email

## Overview
The meeting system now supports specifying participants by **name and email** instead of just user IDs. This makes it easier to create and manage meetings without needing to look up internal user IDs.

## Features

### 1. Create Meetings with Participant Names and Emails

You can now create meetings using two methods:

#### Method 1: Legacy (Using User IDs)
```json
POST /meetings/create
{
  "title": "Technical Interview",
  "scheduled_start": "2026-04-15T10:00:00Z",
  "scheduled_end": "2026-04-15T11:00:00Z",
  "duration_minutes": 60,
  "participant_user_ids": [123, 456]
}
```

#### Method 2: New (Using Name and Email)
```json
POST /meetings/create
{
  "title": "Technical Interview",
  "scheduled_start": "2026-04-15T10:00:00Z",
  "scheduled_end": "2026-04-15T11:00:00Z",
  "duration_minutes": 60,
  "participants": [
    {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "is_required": true
    },
    {
      "name": "Jane Smith",
      "email": "jane.smith@example.com",
      "is_required": true
    }
  ]
}
```

### 2. Cancel Meetings with Verification

When canceling a meeting, you can optionally provide the canceller's name and email for verification:

```json
POST /meetings/{meeting_id}/cancel
{
  "cancellation_reason": "Candidate withdrew application",
  "canceller_name": "John Doe",
  "canceller_email": "john.doe@example.com"
}
```

The system will verify that the provided name and email match the authenticated user.

### 3. Participant Details in Responses

Meeting responses now include participant names and emails directly:

```json
{
  "id": 1,
  "title": "Technical Interview",
  "participants": [
    {
      "id": 1,
      "user_id": 123,
      "participant_name": "John Doe",
      "participant_email": "john.doe@example.com",
      "has_confirmed": true,
      "is_required": true
    },
    {
      "id": 2,
      "user_id": 456,
      "participant_name": "Jane Smith",
      "participant_email": "jane.smith@example.com",
      "has_confirmed": false,
      "is_required": true
    }
  ]
}
```

## Validation Rules

### Creating Meetings
1. **User Existence**: All participants must exist in the system (validated by email)
2. **Name Matching**: The provided name must match the user's full_name in the database (case-insensitive)
3. **At Least One Method**: Either `participant_user_ids` or `participants` must be provided
4. **Email Uniqueness**: Each participant email must correspond to a unique user

### Canceling Meetings
1. **Email Matching**: If provided, canceller_email must match the authenticated user's email
2. **Name Matching**: If provided, canceller_name must match the authenticated user's full_name
3. **Authorization**: User must be either the organizer or a participant of the meeting

## Error Handling

### User Not Found
```json
HTTP 404
{
  "detail": "User with email 'nonexistent@example.com' not found. Please ensure the user exists in the system."
}
```

### Name Mismatch
```json
HTTP 400
{
  "detail": "Name mismatch for email 'john@example.com': expected 'John Doe' but found 'Jonathan Doe'"
}
```

### Canceller Identity Mismatch
```json
HTTP 403
{
  "detail": "Canceller email 'wrong@example.com' does not match authenticated user 'correct@example.com'"
}
```

## Benefits

1. **Easier Integration**: Frontend/external systems don't need to maintain user ID mappings
2. **Better UX**: More intuitive to specify participants by recognizable information
3. **Validation**: Ensures participant identity is correct before creating meetings
4. **Transparency**: Participant details are immediately visible in responses
5. **Backward Compatible**: Legacy user_id method still works

## Implementation Details

### Schema Changes
- **MeetingParticipantSpec**: New schema for participant specification
- **MeetingCreate**: Updated to support both `participant_user_ids` and `participants`
- **MeetingCancelRequest**: Added optional `canceller_name` and `canceller_email`
- **MeetingParticipantRead**: Added `participant_name` and `participant_email` fields

### Model Changes
- **MeetingParticipant**: Added relationship to User model for easy access to participant details

### Endpoint Changes
- **POST /meetings/create**: Enhanced to resolve participants by email and validate names
- **POST /meetings/{meeting_id}/cancel**: Enhanced to verify canceller identity

## Example Use Cases

### Use Case 1: External System Creating Meeting
An external recruitment system can create meetings without knowing internal user IDs:

```python
import requests

meeting_data = {
    "title": "Phone Screen with Candidate",
    "scheduled_start": "2026-04-20T14:00:00Z",
    "scheduled_end": "2026-04-20T14:30:00Z",
    "duration_minutes": 30,
    "participants": [
        {
            "name": "Sarah Johnson",
            "email": "sarah.j@company.com"
        }
    ]
}

response = requests.post(
    "https://api.talentgraph.com/meetings/create",
    json=meeting_data,
    headers={"Authorization": f"Bearer {token}"}
)
```

### Use Case 2: Candidate Self-Service Cancellation
A candidate can cancel using a link with verification:

```python
cancel_data = {
    "cancellation_reason": "Schedule conflict",
    "canceller_name": "Alice Brown",
    "canceller_email": "alice.brown@candidate.com"
}

response = requests.post(
    f"https://api.talentgraph.com/meetings/{meeting_id}/cancel",
    json=cancel_data,
    headers={"Authorization": f"Bearer {token}"}
)
```

## Migration Guide

For existing integrations using user IDs:
1. **No immediate action required** - the old method still works
2. **Optional migration**: Update to use name/email for better readability
3. **Recommended**: Update meeting display to use the new participant_name and participant_email fields

## Testing

To test the new functionality:

```bash
# Test creating with name/email
curl -X POST http://localhost:8000/meetings/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Meeting",
    "scheduled_start": "2026-04-20T10:00:00Z",
    "scheduled_end": "2026-04-20T11:00:00Z",
    "duration_minutes": 60,
    "participants": [
      {"name": "Test User", "email": "test@example.com"}
    ]
  }'

# Test canceling with verification
curl -X POST http://localhost:8000/meetings/1/cancel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cancellation_reason": "Test cancellation",
    "canceller_name": "Test User",
    "canceller_email": "test@example.com"
  }'
```

## Notes
- Name matching is **case-insensitive** for convenience
- Email matching is **case-insensitive** to handle variations
- The system uses the **full_name** field from the User model
- Participant details are **automatically populated** in all meeting responses
