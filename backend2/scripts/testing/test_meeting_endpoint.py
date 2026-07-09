"""Test meeting endpoint to verify participant serialization"""
import requests
import json

# Try different credentials
credentials_to_try = [
    {"email": "bhavana@rubislawinvest.com", "password": "password"},
    {"email": "bhavanabayya13@gmail.com", "password": "password"},
    {"email": "bhavanabayya13@gmail.com", "password": "Password123"}
]

auth_response = None
for creds in credentials_to_try:
    auth_response = requests.post(
        "http://127.0.0.1:8001/auth/login",
        json=creds
    )
    if auth_response.status_code == 200:
        print(f"✓ Logged in as {creds['email']}")
        break
    else:
        print(f"✗ Failed to login as {creds['email']}")

if auth_response.status_code == 200:
    token = auth_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get meeting details
    meeting_response = requests.get(
        "http://127.0.0.1:8001/meetings/2",
        headers=headers
    )
    
    print(f"Status Code: {meeting_response.status_code}")
    print(f"\nResponse JSON:")
    print(json.dumps(meeting_response.json(), indent=2, default=str))
    
    # Check if participant_name and participant_email exist
    if meeting_response.status_code == 200:
        meeting = meeting_response.json()
        print(f"\n=== Participant Details ===")
        for p in meeting.get("participants", []):
            print(f"Participant ID: {p.get('id')}")
            print(f"  user_id: {p.get('user_id')}")
            print(f"  participant_name: {p.get('participant_name')}")
            print(f"  participant_email: {p.get('participant_email')}")
            print()
else:
    print(f"Auth failed: {auth_response.status_code}")
    print(auth_response.text)
