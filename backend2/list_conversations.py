"""List all conversations"""
from app.database import engine
from app.models import *
from sqlmodel import Session, select

s = Session(engine)

convs = s.exec(select(Conversation)).all()
print(f"Total conversations: {len(convs)}\n")

for conv in convs:
    company = s.get(Company, conv.company_id)
    candidate = s.get(Candidate, conv.candidate_id)
    posting = s.get(JobPosting, conv.job_posting_id)
    
    comp_user = s.get(User, company.user_id) if company else None
    cand_user = s.get(User, candidate.user_id) if candidate else None
    
    print(f"Conversation ID: {conv.id}")
    print(f"  Company: {company.company_name if company else 'N/A'} (User: {comp_user.email if comp_user else 'N/A'})")
    print(f"  Candidate: {candidate.name if candidate else 'N/A'} (User: {cand_user.email if cand_user else 'N/A'})")
    print(f"  Job: {posting.job_title if posting else 'N/A'}")
    print()

s.close()
