from sqlmodel import Session, select
from app.database import engine
from app.models import Company, JobPosting, User

with Session(engine) as session:
    companies = session.exec(select(Company)).all()
    print('Total companies: ' + str(len(companies)))
    print()
    for c in companies:
        user = session.exec(select(User).where(User.id == c.user_id)).first()
        postings = session.exec(select(JobPosting).where(JobPosting.company_id == c.id)).all()
        status = 'OK' if len(postings) >= 4 else ('NEEDS ' + str(4 - len(postings)) + ' MORE')
        email = user.email if user else '?'
        print(c.company_name + ' (' + email + ') [ID:' + str(c.id) + ']: ' + str(len(postings)) + ' posting(s) [' + status + ']')
        for p in postings:
            print('    - [' + str(p.id) + '] ' + str(p.job_title))
