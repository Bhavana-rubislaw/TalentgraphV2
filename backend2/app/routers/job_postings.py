"""
Job Posting routes
Recruiter/Admin job creation and management with skills support
"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from typing import List
from datetime import datetime
from app.database import get_session
from app.models import JobPosting, JobPostingSkill, Company, User, JobPostingStatus, Application, Candidate
from app.schemas import (
    JobPostingRead, JobPostingCreate, JobPostingSkillCreate, JobPostingSkillRead,
    JobPostingStatusUpdateRequest, JobPostingStatusUpdateResponse
)
from app.security import (
    get_current_user,
    require_company_role,
    get_user_company_id,
    verify_company_owns_job
)
from app.routers.notifications import push_notification

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
        query = select(JobPosting).where(
            JobPosting.status.in_([JobPostingStatus.ACTIVE, JobPostingStatus.REPOSTED])
        )
    
    if active_only and company:
        query = query.where(
            JobPosting.status.in_([JobPostingStatus.ACTIVE, JobPostingStatus.REPOSTED])
        )
    
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
    """
    Delete/archive a job posting (Recruiter only)
    
    Implements soft-delete by freezing the job posting.
    Historical applications and candidate relationships are preserved.
    """
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
    
    # Soft delete - freeze the job to preserve historical data
    job_posting.status = JobPostingStatus.FROZEN
    job_posting.frozen_at = datetime.utcnow()
    job_posting.is_active = False  # Legacy field sync
    session.add(job_posting)
    session.commit()
    
    return {"message": "Job posting archived", "status": "frozen"}


@router.post("/{job_id}/toggle-active", response_model=dict)
def toggle_job_posting_active(
    job_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Toggle job posting active status (Legacy endpoint - mapped to lifecycle system)
    
    Legacy compatibility:
    - If currently active/reposted -> freeze
    - If currently frozen -> repost
    """
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
    
    # Map old boolean toggle to new lifecycle system
    if job_posting.status in [JobPostingStatus.ACTIVE, JobPostingStatus.REPOSTED]:
        # Currently active -> freeze
        job_posting.status = JobPostingStatus.FROZEN
        job_posting.frozen_at = datetime.utcnow()
        job_posting.is_active = False
        new_active = False
    else:
        # Currently frozen -> repost
        job_posting.status = JobPostingStatus.REPOSTED
        job_posting.reposted_at = datetime.utcnow()
        job_posting.last_reactivated_at = datetime.utcnow()
        job_posting.is_active = True
        new_active = True
    
    session.add(job_posting)
    session.commit()
    
    return {
        "message": f"Job posting is now {'active' if new_active else 'inactive'}",
        "is_active": new_active,
        "status": job_posting.status
    }


# ============ SKILL MANAGEMENT ON EXISTING POSTINGS ============

@router.post("/{job_id}/skills", response_model=dict)
def add_skill_to_posting(
    job_id: int,
    skill_data: JobPostingSkillCreate,
    current_user: dict = Depends(require_company_role),
    session: Session = Depends(get_session)
):
    """Add a single skill to an existing job posting (company role with ownership required)"""
    # Verify ownership
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company_id = get_user_company_id(session, user.id)
    verify_company_owns_job(session, company_id, job_id)
    
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
    current_user: dict = Depends(require_company_role),
    session: Session = Depends(get_session)
):
    """Update a skill rating on a job posting (company role with ownership required)"""
    # Verify ownership
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company_id = get_user_company_id(session, user.id)
    verify_company_owns_job(session, company_id, job_id)
    
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
    current_user: dict = Depends(require_company_role),
    session: Session = Depends(get_session)
):
    """Remove a skill from a job posting (company role with ownership required)"""
    # Verify ownership
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company_id = get_user_company_id(session, user.id)
    verify_company_owns_job(session, company_id, job_id)
    
    skill = session.get(JobPostingSkill, skill_id)
    if not skill or skill.job_posting_id != job_id:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    session.delete(skill)
    session.commit()
    
    return {"message": "Skill removed"}


# ============ JOB POSTING LIFECYCLE MANAGEMENT ============

@router.post("/{job_id}/status", response_model=JobPostingStatusUpdateResponse)
def update_job_posting_status(
    job_id: int,
    request: JobPostingStatusUpdateRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Update job posting lifecycle status (freeze, reactivate, repost)
    
    Actions:
    - freeze: Temporarily close job, stop accepting applications, preserve historical data
    - reactivate: Reopen frozen job and notify previous applicants
    - repost: Explicitly refresh/relist job for sourcing visibility
    """
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="Unauthorized - Company profile required")
    
    job_posting = session.get(JobPosting, job_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Verify company ownership
    posting_company = session.get(Company, job_posting.company_id)
    if posting_company.company_name != company.company_name:
        raise HTTPException(status_code=403, detail="Unauthorized - Different company")
    
    action = request.action.lower()
    current_status = job_posting.status
    now = datetime.utcnow()
    
    # Validate and execute state transition
    if action == "freeze":
        # Prevent actions on cancelled jobs
        if current_status == JobPostingStatus.CANCELLED:
            raise HTTPException(
                status_code=400,
                detail="Cannot freeze a cancelled job. Cancelled jobs are permanently closed."
            )
        
        if current_status not in [JobPostingStatus.ACTIVE, JobPostingStatus.REPOSTED]:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot freeze job from '{current_status}' status. Only active or reposted jobs can be frozen."
            )
        
        job_posting.status = JobPostingStatus.FROZEN
        job_posting.frozen_at = now
        job_posting.is_active = False  # Legacy field sync
        message = "Job posting frozen successfully"
        
        # Notify recruiter about freeze
        push_notification(
            session,
            user.id,
            title="Job Posting Frozen",
            message=f"'{job_posting.job_title}' has been frozen and is no longer accepting applications.",
            event_type="job_posting_frozen",
            route=f"/recruiter/job-postings",
            route_context={"job_id": job_id, "job_title": job_posting.job_title}
        )
    
    elif action == "reactivate":
        # Prevent actions on cancelled jobs
        if current_status == JobPostingStatus.CANCELLED:
            raise HTTPException(
                status_code=400,
                detail="Cannot reactivate a cancelled job. Cancelled jobs are permanently closed."
            )
        
        if current_status != JobPostingStatus.FROZEN:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reactivate job from '{current_status}' status. Only frozen jobs can be reactivated."
            )
        
        job_posting.status = JobPostingStatus.REPOSTED
        job_posting.last_reactivated_at = now
        job_posting.reposted_at = now
        job_posting.is_active = True  # Legacy field sync
        message = "Job posting reactivated successfully"
        
        # Count previous applicants for context
        previous_applicants = session.exec(
            select(Application).where(Application.job_posting_id == job_id)
        ).all()
        
        # Notify recruiter about reactivation
        applicant_msg = f" with {len(previous_applicants)} prior applicant(s)" if previous_applicants else ""
        push_notification(
            session,
            user.id,
            title="Job Posting Reactivated",
            message=f"'{job_posting.job_title}' has been reactivated and is now accepting applications{applicant_msg}.",
            event_type="job_posting_reactivated",
            route=f"/recruiter/job-postings",
            route_context={"job_id": job_id, "job_title": job_posting.job_title, "applicant_count": len(previous_applicants)}
        )
    
    elif action == "repost":
        # Prevent actions on cancelled jobs
        if current_status == JobPostingStatus.CANCELLED:
            raise HTTPException(
                status_code=400,
                detail="Cannot repost a cancelled job. Cancelled jobs are permanently closed."
            )
        
        if current_status not in [JobPostingStatus.FROZEN, JobPostingStatus.ACTIVE]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot repost job from '{current_status}' status."
            )
        
        job_posting.status = JobPostingStatus.REPOSTED
        job_posting.reposted_at = now
        job_posting.is_active = True  # Legacy field sync
        message = "Job posting reposted successfully"
        
        # Notify recruiter about repost
        push_notification(
            session,
            user.id,
            title="Job Posting Reposted",
            message=f"'{job_posting.job_title}' has been reposted and refreshed for increased visibility.",
            event_type="job_posting_reposted",
            route=f"/recruiter/job-postings",
            route_context={"job_id": job_id, "job_title": job_posting.job_title}
        )
    
    elif action == "cancel":
        # Validate cancellation reason is provided
        if not request.cancellation_reason or not request.cancellation_reason.strip():
            raise HTTPException(
                status_code=400,
                detail="Cancellation reason is required. Please provide a reason for cancelling this job posting."
            )
        
        # Can cancel from any state except already cancelled
        if current_status == JobPostingStatus.CANCELLED:
            raise HTTPException(
                status_code=400,
                detail="Job posting is already cancelled."
            )
        
        job_posting.status = JobPostingStatus.CANCELLED
        job_posting.cancelled_at = now
        job_posting.cancellation_reason = request.cancellation_reason.strip()
        job_posting.is_active = False  # Legacy field sync
        message = "Job posting cancelled successfully"
        
        # Notify recruiter about cancellation
        reason_preview = request.cancellation_reason[:50] + "..." if len(request.cancellation_reason) > 50 else request.cancellation_reason
        push_notification(
            session,
            user.id,
            title="Job Posting Cancelled",
            message=f"'{job_posting.job_title}' has been permanently cancelled. Reason: {reason_preview}",
            event_type="job_posting_cancelled",
            route=f"/recruiter/job-postings",
            route_context={"job_id": job_id, "job_title": job_posting.job_title, "reason": request.cancellation_reason}
        )
    
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action '{action}'. Must be one of: freeze, reactivate, repost, cancel"
        )
    
    job_posting.updated_at = now
    session.add(job_posting)
    session.commit()
    session.refresh(job_posting)
    
    return JobPostingStatusUpdateResponse(
        message=message,
        job_id=job_posting.id,
        status=job_posting.status,
        frozen_at=job_posting.frozen_at,
        reposted_at=job_posting.reposted_at,
        last_reactivated_at=job_posting.last_reactivated_at,
        cancelled_at=job_posting.cancelled_at,
        cancellation_reason=job_posting.cancellation_reason
    )
