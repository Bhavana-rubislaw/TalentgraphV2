"""Add Bhavana Bayya as a new candidate"""
from app.database import engine
from app.models import User, Candidate, JobProfile
from sqlmodel import Session, select
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

with Session(engine) as session:
    # Check if user already exists
    existing = session.exec(select(User).where(User.email == 'bhavanabayya13@gmail.com')).first()
    
    if existing:
        print('✅ User already exists with this email')
        print(f'   User ID: {existing.id}, Name: {existing.full_name}')
        
        # Check if Candidate record exists
        candidate = session.exec(select(Candidate).where(Candidate.user_id == existing.id)).first()
        if not candidate:
            print('⚠️  Candidate record missing - creating now...')
            candidate = Candidate(
                user_id=existing.id,
                name='Bhavana Bayya',
                email='bhavanabayya13@gmail.com',
                phone='+91-1234567890',
                residential_address='Hyderabad, Telangana',
                location_state='Telangana',
                location_county='Hyderabad',
                location_zipcode='500001',
                profile_summary='Passionate software engineer with experience in full-stack development'
            )
            session.add(candidate)
            session.commit()
            session.refresh(candidate)
            print(f'✅ Created Candidate record (ID: {candidate.id})')
        else:
            print(f'✅ Candidate record exists (ID: {candidate.id})')
        
        # Check if JobProfile exists
        job_profile = session.exec(select(JobProfile).where(JobProfile.candidate_id == candidate.id)).first()
        if not job_profile:
            print('⚠️  JobProfile missing - creating now...')
            job_profile = JobProfile(
                candidate_id=candidate.id,
                profile_name='Primary Profile',
                product_vendor='General',
                product_type='Software',
                job_role='Software Engineer',
                years_of_experience=3,
                worktype='hybrid',
                employment_type='ft',
                salary_min=80000,
                salary_max=120000,
                salary_currency='usd',
                visa_status='work_visa',
                profile_summary='Passionate software engineer with experience in full-stack development'
            )
            session.add(job_profile)
            session.commit()
            print(f'✅ Created JobProfile (ID: {job_profile.id})')
        else:
            print(f'✅ JobProfile exists (ID: {job_profile.id})')
            
    else:
        # Create new candidate user
        new_user = User(
            email='bhavanabayya13@gmail.com',
            password_hash=pwd_context.hash('Kutty_1304'),
            full_name='Bhavana Bayya',
            role='candidate',
            is_active=True
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        
        # Create Candidate record
        candidate = Candidate(
            user_id=new_user.id,
            name='Bhavana Bayya',
            email='bhavanabayya13@gmail.com',
            phone='+91-1234567890',
            residential_address='Hyderabad, Telangana',
            location_state='Telangana',
            location_county='Hyderabad',
            location_zipcode='500001',
            profile_summary='Passionate software engineer with experience in full-stack development'
        )
        session.add(candidate)
        session.commit()
        session.refresh(candidate)
        
        # Create job profile
        job_profile = JobProfile(
            candidate_id=candidate.id,
            profile_name='Primary Profile',
            product_vendor='General',
            product_type='Software',
            job_role='Software Engineer',
            years_of_experience=3,
            worktype='hybrid',
            employment_type='ft',
            salary_min=80000,
            salary_max=120000,
            salary_currency='usd',
            visa_status='work_visa',
            profile_summary='Passionate software engineer with experience in full-stack development'
        )
        session.add(job_profile)
        session.commit()
        
        print(f'✅ Created user: {new_user.full_name} (ID: {new_user.id})')
        print(f'✅ Created candidate record (ID: {candidate.id})')
        print(f'✅ Created job profile (ID: {job_profile.id})')
        print(f'   Email: {new_user.email}')
        print(f'   Password: Kutty_1304')
        print()
        print('You can now login at http://localhost:3003 with:')
        print(f'   Email: bhavanabayya13@gmail.com')
        print(f'   Password: Kutty_1304')
