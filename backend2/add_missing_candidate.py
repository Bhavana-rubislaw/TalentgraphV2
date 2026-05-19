"""
Add missing candidate: bayyakutty02@gmail.com
"""
from app.database import engine
from app.models import User, UserRole, Candidate, JobProfile, Skill, LocationPreference, Certification, WorkType, EmploymentType, VisaStatus, CurrencyType
from sqlmodel import Session, select
from app.security import hash_password

def main():
    with Session(engine) as session:
        # Check if user exists
        user = session.exec(select(User).where(User.email == "bayyakutty02@gmail.com")).first()
        
        if user:
            # Update role to candidate if it's not already
            if user.role != UserRole.CANDIDATE:
                user.role = UserRole.CANDIDATE
                session.commit()
                print(f"✅ Updated user role to CANDIDATE: {user.email}")
            else:
                print(f"ℹ️  User already exists as candidate: {user.email}")
        else:
            # Create new user
            user = User(
                email="bayyakutty02@gmail.com",
                password_hash=hash_password("Kutty_1304"),
                full_name="Bayya Kutty",
                role=UserRole.CANDIDATE,
                is_active=True
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            print(f"✅ Created user: Bayya Kutty (bayyakutty02@gmail.com)")
        
        # Check if candidate profile exists
        candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
        
        if not candidate:
            candidate = Candidate(
                user_id=user.id,
                name="Bayya Kutty",
                email="bayyakutty02@gmail.com",
                phone="+1 (555) 311-2001",
                residential_address="890 Developer Street, Houston, TX 77001",
                location_state="Texas",
                location_county="Harris",
                location_zipcode="77001",
                linkedin="https://linkedin.com/in/bayyakutty",
                github="https://github.com/bayyakutty",
                profile_summary="Experienced Software Engineer with 6 years in full-stack development. Strong expertise in Node.js, React, and cloud technologies."
            )
            session.add(candidate)
            session.commit()
            session.refresh(candidate)
            print(f"  ✅ Created candidate profile (ID: {candidate.id})")
            
            # Create job profile
            job_profile = JobProfile(
                candidate_id=candidate.id,
                profile_name="Senior Full Stack Engineer",
                product_vendor="General",
                product_type="Web Development",
                job_role="Full Stack Developer",
                years_of_experience=6,
                worktype=WorkType.REMOTE,
                employment_type=EmploymentType.FT,
                salary_min=120000.0,
                salary_max=160000.0,
                salary_currency=CurrencyType.USD,
                visa_status=VisaStatus.WORK_VISA,
                ethnicity="Asian",
                availability_date="2 weeks",
                profile_summary="Full stack developer with expertise in modern web technologies and cloud platforms."
            )
            session.add(job_profile)
            session.commit()
            session.refresh(job_profile)
            print(f"    ✅ Created job profile: Senior Full Stack Engineer (ID: {job_profile.id})")
            
            # Add skills
            skills = [
                {"skill_name": "Node.js", "skill_category": "technical", "proficiency_level": 5},
                {"skill_name": "React", "skill_category": "technical", "proficiency_level": 5},
                {"skill_name": "JavaScript", "skill_category": "technical", "proficiency_level": 5},
                {"skill_name": "TypeScript", "skill_category": "technical", "proficiency_level": 4},
                {"skill_name": "AWS", "skill_category": "technical", "proficiency_level": 4},
                {"skill_name": "PostgreSQL", "skill_category": "technical", "proficiency_level": 4},
            ]
            
            for skill_data in skills:
                skill = Skill(
                    job_profile_id=job_profile.id,
                    skill_name=skill_data['skill_name'],
                    skill_category=skill_data['skill_category'],
                    proficiency_level=skill_data['proficiency_level']
                )
                session.add(skill)
            session.commit()
            print(f"      ✅ Added {len(skills)} skills")
            
            # Add location preferences
            location = LocationPreference(
                job_profile_id=job_profile.id,
                city="Remote",
                state="Nationwide",
                country="USA"
            )
            session.add(location)
            session.commit()
            print(f"      ✅ Added location preference")
        else:
            print(f"  ℹ️  Candidate profile already exists (ID: {candidate.id})")
        
        print("\n✅ DONE! bayyakutty02@gmail.com is now a candidate with complete profile")

if __name__ == "__main__":
    main()
