from app.database import engine
from app.models import User, Candidate, JobProfile, Skill
from sqlmodel import Session, select

with Session(engine) as s:
    u = s.exec(select(User).where(User.email == 'kuttybayya@gmail.com')).first()
    if u:
        c = s.exec(select(Candidate).where(Candidate.user_id == u.id)).first()
        if c:
            profiles = s.exec(select(JobProfile).where(JobProfile.candidate_id == c.id)).all()
            for prof in profiles:
                skills = s.exec(select(Skill).where(Skill.job_profile_id == prof.id)).all()
                for skill in skills:
                    s.delete(skill)
            for p in profiles:
                s.delete(p)
            s.delete(c)
        s.delete(u)
        s.commit()
        print('✅ Deleted kuttybayya@gmail.com and related data')
    else:
        print('❌ User not found')
