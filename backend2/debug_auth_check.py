"""Debug conversation 2 access in detail"""
from app.database import engine
from app.models import *
from sqlmodel import Session, select

s = Session(engine)

conv = s.get(DirectConversation, 2)
print(f"DirectConversation 2:")
print(f"  recruiter_user_id: {conv.recruiter_user_id}, type: {type(conv.recruiter_user_id)}")
print(f"  candidate_user_id: {conv.candidate_user_id}, type: {type(conv.candidate_user_id)}")

print(f"\nTest user:")
user = s.exec(select(User).where(User.email == 'bhavanabayya13@gmail.com')).first()
print(f"  email: {user.email}")
print(f"  id: {user.id}, type: {type(user.id)}")
print(f"  role: {user.role}")

print(f"\nAuthorization check:")
print(f"  user.id in [conv.recruiter_user_id, conv.candidate_user_id]:")
print(f"  {user.id} in [{conv.recruiter_user_id}, {conv.candidate_user_id}]")
print(f"  Result: {user.id in [conv.recruiter_user_id, conv.candidate_user_id]}")

print(f"\n  user.id == conv.candidate_user_id: {user.id == conv.candidate_user_id}")
print(f"  user.id == conv.recruiter_user_id: {user.id == conv.recruiter_user_id}")

s.close()
