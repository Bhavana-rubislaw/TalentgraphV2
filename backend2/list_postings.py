from sqlmodel import Session, select
from app.database import engine
from app.models import Company, JobPosting, JobPostingSkill

with Session(engine) as session:
    postings = session.exec(select(JobPosting).order_by(JobPosting.id)).all()
    for p in postings:
        co = session.get(Company, p.company_id)
        skills = session.exec(select(JobPostingSkill).where(JobPostingSkill.job_posting_id == p.id)).all()
        print('[' + str(p.id) + '] ' + str(p.job_title))
        co_name = co.company_name if co else '?'
        print('  company_id=' + str(p.company_id) + ' (' + co_name + ') | vendor=' + str(p.product_vendor) + ' | type=' + str(p.product_type) + ' | role=' + str(p.job_role))
        print('  seniority=' + str(p.seniority_level) + ' | worktype=' + str(p.worktype) + ' | location=' + str(p.location) + ' | employment=' + str(p.employment_type))
        print('  salary=' + str(p.salary_min) + '-' + str(p.salary_max) + ' ' + str(p.salary_currency) + ' | pay_type=' + str(p.pay_type))
        print('  start_date=' + str(p.start_date) + ' | status=' + str(p.status))
        print('  skills=' + str([s.skill_name for s in skills]))
        print()
