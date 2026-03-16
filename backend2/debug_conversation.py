"""Debug conversation access issue"""
from app.database import engine
from app.models import *
from sqlmodel import Session, select

s = Session(engine)

# Check conversation 2
conv = s.get(Conversation, 2)
if conv:
    print(f"Conversation 2:")
    print(f"  Company ID: {conv.company_id}")
    print(f"  Candidate ID: {conv.candidate_id}")
    print(f"  Job Posting ID: {conv.job_posting_id}")
    
    # Get company details
    company = s.get(Company, conv.company_id)
    if company:
        comp_user = s.get(User, company.user_id)
        print(f"\n  Company: {company.company_name}")
        print(f"    User ID: {company.user_id}")
        print(f"    User Email: {comp_user.email if comp_user else 'N/A'}")
        print(f"    User Role: {comp_user.role if comp_user else 'N/A'}")
        print(f"    User Role Value: {comp_user.role.value if comp_user else 'N/A'}")
    
    # Get candidate details
    candidate = s.get(Candidate, conv.candidate_id)
    if candidate:
        cand_user = s.get(User, candidate.user_id)
        print(f"\n  Candidate: {candidate.name}")
        print(f"    User ID: {candidate.user_id}")
        print(f"    User Email: {cand_user.email if cand_user else 'N/A'}")
        print(f"    User Role: {cand_user.role if cand_user else 'N/A'}")
        print(f"    User Role Value: {cand_user.role.value if cand_user else 'N/A'}")
else:
    print("Conversation 2 not found")

# Check who's currently logged in (check recent auth logs)
print("\n" + "="*50)
print("Recent candidate users:")
for u in s.exec(select(User).where(User.role == UserRole.CANDIDATE)).all()[:5]:
    cand = s.exec(select(Candidate).where(Candidate.user_id == u.id)).first()
    print(f"  {u.email} (User ID: {u.id}, Candidate ID: {cand.id if cand else 'N/A'})")

s.close()
