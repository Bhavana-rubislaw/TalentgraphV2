"""Show detailed job preferences for bhavanabayya13@gmail.com"""
from app.database import engine
from app.models import *
from sqlmodel import Session, select

s = Session(engine)

user = s.exec(select(User).where(User.email == 'bhavanabayya13@gmail.com')).first()
if not user:
    print("User not found")
    s.close()
    exit(1)

candidate = s.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
if not candidate:
    print("Candidate profile not found")
    s.close()
    exit(1)

print(f"{'='*70}")
print(f"JOB PREFERENCES FOR: {candidate.name} ({user.email})")
print(f"{'='*70}\n")

profiles = s.exec(select(JobProfile).where(JobProfile.candidate_id == candidate.id)).all()

for i, profile in enumerate(profiles, 1):
    print(f"📋 PROFILE #{i}: {profile.profile_name}")
    print(f"{'─'*70}")
    print(f"  Role: {profile.job_role}")
    if hasattr(profile, 'job_category') and profile.job_category:
        print(f"  Category: {profile.job_category}")
    if hasattr(profile, 'seniority_level') and profile.seniority_level:
        print(f"  Seniority: {profile.seniority_level}")
    print(f"  Salary: ${profile.salary_min:,} - ${profile.salary_max:,} {profile.salary_currency.upper()}")
    if hasattr(profile, 'worktype_preference') and profile.worktype_preference:
        remote_text = f" ({profile.remote_acceptance})" if hasattr(profile, 'remote_acceptance') and profile.remote_acceptance else ""
        print(f"  Work Type: {profile.worktype_preference}{remote_text}")
    print(f"  Employment: {profile.employment_type}")
    if hasattr(profile, 'relevant_experience') and profile.relevant_experience:
        print(f"  Experience: {profile.relevant_experience} years")
    if hasattr(profile, 'notice_period') and profile.notice_period:
        print(f"  Notice Period: {profile.notice_period}")
    if hasattr(profile, 'start_date_preference') and profile.start_date_preference:
        print(f"  Start Date: {profile.start_date_preference}")
    if hasattr(profile, 'travel_willingness') and profile.travel_willingness:
        print(f"  Travel: {profile.travel_willingness}")
    if hasattr(profile, 'relocation_willingness') and profile.relocation_willingness:
        print(f"  Relocation: {profile.relocation_willingness}")
    if hasattr(profile, 'highest_education') and profile.highest_education:
        print(f"  Education: {profile.highest_education}")
    
    print(f"  Preferred Locations:")
    if hasattr(profile, 'preferred_location1') and profile.preferred_location1:
        print(f"    1. {profile.preferred_location1}")
    if hasattr(profile, 'preferred_location2') and profile.preferred_location2:
        print(f"    2. {profile.preferred_location2}")
    if hasattr(profile, 'preferred_location3') and profile.preferred_location3:
        print(f"    3. {profile.preferred_location3}")
    
    # Get skills
    skills = s.exec(select(Skill).where(Skill.job_profile_id == profile.id)).all()
    if skills:
        print(f"  Skills ({len(skills)}):")
        # Check if skills have is_primary_skill attribute
        has_primary_flag = hasattr(skills[0], 'is_primary_skill') if skills else False
        
        if has_primary_flag:
            primary_skills = [skill for skill in skills if skill.is_primary_skill]
            other_skills = [skill for skill in skills if not skill.is_primary_skill]
            
            if primary_skills:
                print(f"    Primary: {', '.join([f'{skill.skill_name} ({skill.proficiency_level}/5)' for skill in primary_skills])}")
            if other_skills:
                print(f"    Other: {', '.join([f'{skill.skill_name} ({skill.proficiency_level}/5)' for skill in other_skills])}")
        else:
            # No primary flag, just list all skills grouped by proficiency
            for skill in skills:
                category = f"[{skill.skill_category}]" if hasattr(skill, 'skill_category') and skill.skill_category else ""
                proficiency = f"({skill.proficiency_level}/5)" if hasattr(skill, 'proficiency_level') else ""
                print(f"    • {skill.skill_name} {category} {proficiency}")
    
    if hasattr(profile, 'core_strengths') and profile.core_strengths:
        print(f"  Core Strengths: {profile.core_strengths}")
    if hasattr(profile, 'is_active'):
        print(f"  Status: {'✅ Active' if profile.is_active else '❌ Inactive'}")
    print()

print(f"{'='*70}")
print(f"Total job profiles: {len(profiles)}")
print(f"{'='*70}")

s.close()
