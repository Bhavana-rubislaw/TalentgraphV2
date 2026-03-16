"""List all DirectConversations"""
from app.database import engine
from app.models import *
from sqlmodel import Session, select

s = Session(engine)

convs = s.exec(select(DirectConversation)).all()
print(f"Total DirectConversations: {len(convs)}\n")

for conv in convs:
    recruiter_user = s.get(User, conv.recruiter_user_id)
    candidate_user = s.get(User, conv.candidate_user_id)
    
    print(f"DirectConversation ID: {conv.id}")
    print(f"  Recruiter: {recruiter_user.email if recruiter_user else 'N/A'} (User ID: {conv.recruiter_user_id})")
    print(f"  Candidate: {candidate_user.email if candidate_user else 'N/A'} (User ID: {conv.candidate_user_id})")
    print(f"  Created: {conv.created_at}")
    print()

print("="*60)
print("\nTest account user IDs:")
for email in ['bhavanabayya13@gmail.com', 'kuttybayya@gmail.com', 'bayyakutty02@gmail.com', 'bhavana@rubislawinvest.com']:
    u = s.exec(select(User).where(User.email == email)).first()
    if u:
        print(f"  {email}: User ID {u.id}, Role: {u.role.value}")

s.close()
