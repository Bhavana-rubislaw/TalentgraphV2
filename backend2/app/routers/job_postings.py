"""
Job Posting routes
Recruiter/Admin job creation and management with skills support
"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from typing import List
from datetime import datetime
from app.database import get_session
from app.models import JobPosting, JobPostingSkill, Company, User
from app.schemas import JobPostingRead, JobPostingCreate, JobPostingSkillCreate, JobPostingSkillRead
from app.security import get_current_user

router = APIRouter(prefix="/job-postings", tags=["Job Postings"])

# ============ SKILL CATALOGS ============

TECHNICAL_SKILLS_CATALOG = [
    "Java", "Spring Boot", "Python", "Django", "Flask", "FastAPI",
    "JavaScript", "TypeScript", "React", "Angular", "Vue.js", "Node.js",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform",
    "Kafka", "RabbitMQ", "GraphQL", "REST API", "gRPC",
    "Git", "CI/CD", "Jenkins", "GitHub Actions",
    "Machine Learning", "TensorFlow", "PyTorch", "Data Science",
    "Oracle ERP", "SAP HANA", "SAP ABAP", "Salesforce", "ServiceNow",
    "Oracle Cloud", "Oracle Fusion", "PeopleSoft", "JD Edwards",
    "Power BI", "Tableau", "Looker", "Snowflake", "Databricks",
    "C#", ".NET", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin",
    "React Native", "Flutter", "iOS", "Android",
    "Microservices", "System Design", "DevOps", "SRE",
    "Cybersecurity", "Penetration Testing", "SOC", "SIEM",
    "Agile", "Scrum", "Jira", "Confluence",
    "HTML", "CSS", "SASS", "Tailwind CSS", "Bootstrap",
    "Linux", "Shell Scripting", "Networking", "TCP/IP",
]

SOFT_SKILLS_CATALOG = [
    "Communication", "Leadership", "Problem Solving", "Time Management",
    "Teamwork", "Adaptability", "Critical Thinking", "Creativity",
    "Conflict Resolution", "Emotional Intelligence", "Decision Making",
    "Negotiation", "Presentation Skills", "Mentoring", "Coaching",
    "Strategic Thinking", "Project Management", "Stakeholder Management",
    "Cross-functional Collaboration", "Client Relationship",
    "Attention to Detail", "Analytical Thinking", "Initiative",
    "Work Ethic", "Accountability", "Flexibility",
    "Interpersonal Skills", "Active Listening", "Empathy",
    "Delegation", "Influence", "Resilience",
]

CERTIFICATIONS_CATALOG = [
    "AWS Solutions Architect", "AWS Developer Associate", "AWS DevOps Engineer",
    "Azure Administrator", "Azure Solutions Architect", "Azure DevOps Engineer",
    "GCP Cloud Engineer", "GCP Cloud Architect",
    "Oracle Cloud Infrastructure", "Oracle Database Administrator",
    "SAP Certified Application Associate", "SAP Certified Technology Associate",
    "Salesforce Administrator", "Salesforce Developer",
    "PMP", "PMI-ACP", "PRINCE2", "Scrum Master (CSM)", "SAFe Agilist",
    "CISSP", "CISM", "CompTIA Security+", "CEH",
    "Kubernetes Administrator (CKA)", "Docker Certified Associate",
    "Terraform Associate", "ITIL v4 Foundation",
    "Six Sigma Green Belt", "Six Sigma Black Belt",
    "Google Analytics", "HubSpot Inbound Marketing",
    "Cisco CCNA", "Cisco CCNP",
    "Microsoft 365 Certified", "Power Platform Developer",
]


@router.get("/catalogs", response_model=dict)
def get_skill_catalogs():
    """Get all skill and certification catalogs"""
    return {
        "technical_skills": sorted(TECHNICAL_SKILLS_CATALOG),
        "soft_skills": sorted(SOFT_SKILLS_CATALOG),
        "certifications": sorted(CERTIFICATIONS_CATALOG),
    }


@router.post("", response_model=dict)
def create_job_posting(
    job_data: JobPostingCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Create a new job posting with skills (Recruiter only)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="Company profile not found. Are you a recruiter?")
    
    # Extract skills before creating posting
    skills_data = job_data.skills
    posting_dict = job_data.dict(exclude={"skills"})
    
    job_posting = JobPosting(
        company_id=company.id,
        **posting_dict
    )
    session.add(job_posting)
    session.commit()
    session.refresh(job_posting)
    
    # Add skills
    for skill in skills_data:
        db_skill = JobPostingSkill(
            job_posting_id=job_posting.id,
            skill_name=skill.skill_name,
            skill_category=skill.skill_category,
            rating=skill.rating,
        )
        session.add(db_skill)
    
    if skills_data:
        session.commit()

    # Notify recruiter that a new job posting was created
    from app.notify import create_notification
    session.add(create_notification(
        user_id=user.id,
        notification_type="job_posting_created",
        title="New Job Posting Created",
        message=f"Your job posting '{job_posting.job_title}' has been published successfully.",
        job_posting_id=job_posting.id,
        job_title=job_posting.job_title,
    ))
    session.commit()
    
    return {
        "message": "Job posting created successfully",
        "job_id": job_posting.id,
        "job_title": job_posting.job_title,
        "product_vendor": job_posting.product_vendor
    }


@router.get("", response_model=List[JobPostingRead])
def get_job_postings(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
    active_only: bool = True
):
    """Get all job postings with skills"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    
    if company:
        company_ids = session.exec(
            select(Company.id).where(Company.company_name == company.company_name)
        ).all()
        query = select(JobPosting).where(JobPosting.company_id.in_(company_ids))
    else:
        query = select(JobPosting).where(JobPosting.is_active == True)
    
    if active_only and company:
        query = query.where(JobPosting.is_active == True)
    
    postings = session.exec(query).all()
    
    # Load skills for each posting
    result = []
    for posting in postings:
        skills = session.exec(
            select(JobPostingSkill).where(JobPostingSkill.job_posting_id == posting.id)
        ).all()
        posting_dict = posting.dict()
        posting_dict["posting_skills"] = [
            {"id": s.id, "skill_name": s.skill_name, "skill_category": s.skill_category, "rating": s.rating}
            for s in skills
        ]
        result.append(posting_dict)
    
    return result


@router.get("/{job_id}", response_model=JobPostingRead)
def get_job_posting(
    job_id: int,
    session: Session = Depends(get_session)
):
    """Get a specific job posting with skills"""
    job_posting = session.get(JobPosting, job_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    skills = session.exec(
        select(JobPostingSkill).where(JobPostingSkill.job_posting_id == job_id)
    ).all()
    
    posting_dict = job_posting.dict()
    posting_dict["posting_skills"] = [
        {"id": s.id, "skill_name": s.skill_name, "skill_category": s.skill_category, "rating": s.rating}
        for s in skills
    ]
    
    return posting_dict


@router.put("/{job_id}", response_model=dict)
def update_job_posting(
    job_id: int,
    job_data: JobPostingCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update a job posting with skills (Recruiter only)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    job_posting = session.get(JobPosting, job_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Check company access (same company_name)
    posting_company = session.get(Company, job_posting.company_id)
    if posting_company.company_name != company.company_name:
        raise HTTPException(status_code=403, detail="Unauthorized - different company")
    
    # Update posting fields
    skills_data = job_data.skills
    posting_dict = job_data.dict(exclude={"skills"})
    for key, value in posting_dict.items():
        setattr(job_posting, key, value)
    job_posting.updated_at = datetime.utcnow()
    
    session.add(job_posting)
    session.commit()
    
    # Replace all skills: delete existing, add new
    existing_skills = session.exec(
        select(JobPostingSkill).where(JobPostingSkill.job_posting_id == job_id)
    ).all()
    for skill in existing_skills:
        session.delete(skill)
    session.commit()
    
    for skill in skills_data:
        db_skill = JobPostingSkill(
            job_posting_id=job_id,
            skill_name=skill.skill_name,
            skill_category=skill.skill_category,
            rating=skill.rating,
        )
        session.add(db_skill)
    
    if skills_data:
        session.commit()
    
    return {"message": "Job posting updated", "job_id": job_posting.id}


@router.delete("/{job_id}", response_model=dict)
def delete_job_posting(
    job_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Delete/archive a job posting (Recruiter only)"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    job_posting = session.get(JobPosting, job_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    posting_company = session.get(Company, job_posting.company_id)
    if posting_company.company_name != company.company_name:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Soft delete - just mark as inactive
    job_posting.is_active = False
    session.add(job_posting)
    session.commit()
    
    return {"message": "Job posting archived"}


@router.post("/{job_id}/toggle-active", response_model=dict)
def toggle_job_posting_active(
    job_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Toggle job posting active status"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    job_posting = session.get(JobPosting, job_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    posting_company = session.get(Company, job_posting.company_id)
    if posting_company.company_name != company.company_name:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    job_posting.is_active = not job_posting.is_active
    session.add(job_posting)
    session.commit()
    
    return {
        "message": f"Job posting is now {'active' if job_posting.is_active else 'inactive'}",
        "is_active": job_posting.is_active
    }


# ============ SKILL MANAGEMENT ON EXISTING POSTINGS ============

@router.post("/{job_id}/skills", response_model=dict)
def add_skill_to_posting(
    job_id: int,
    skill_data: JobPostingSkillCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Add a single skill to an existing job posting"""
    job_posting = session.get(JobPosting, job_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Check for duplicate
    existing = session.exec(
        select(JobPostingSkill).where(
            JobPostingSkill.job_posting_id == job_id,
            JobPostingSkill.skill_name == skill_data.skill_name
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Skill '{skill_data.skill_name}' already exists on this posting")
    
    db_skill = JobPostingSkill(
        job_posting_id=job_id,
        skill_name=skill_data.skill_name,
        skill_category=skill_data.skill_category,
        rating=skill_data.rating,
    )
    session.add(db_skill)
    session.commit()
    session.refresh(db_skill)
    
    return {"message": "Skill added", "skill_id": db_skill.id}


@router.put("/{job_id}/skills/{skill_id}", response_model=dict)
def update_skill_rating(
    job_id: int,
    skill_id: int,
    skill_data: JobPostingSkillCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update a skill rating on a job posting"""
    skill = session.get(JobPostingSkill, skill_id)
    if not skill or skill.job_posting_id != job_id:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    skill.rating = skill_data.rating
    skill.skill_name = skill_data.skill_name
    skill.skill_category = skill_data.skill_category
    session.add(skill)
    session.commit()
    
    return {"message": "Skill updated"}


@router.delete("/{job_id}/skills/{skill_id}", response_model=dict)
def delete_skill_from_posting(
    job_id: int,
    skill_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Remove a skill from a job posting"""
    skill = session.get(JobPostingSkill, skill_id)
    if not skill or skill.job_posting_id != job_id:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    session.delete(skill)
    session.commit()
    
    return {"message": "Skill removed"}
