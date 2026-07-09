"""Quick script to check which jobs are frozen"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.database import engine
from app.models import JobPosting
from sqlmodel import Session, select

with Session(engine) as session:
    jobs = session.exec(select(JobPosting)).all()
    
    print("\n" + "="*80)
    print("JOB STATUS CHECK")
    print("="*80)
    
    frozen = []
    active = []
    other = []
    
    for job in jobs:
        if str(job.status).endswith('FROZEN') or job.status == 'frozen':
            frozen.append((job.id, job.job_title, job.status))
        elif str(job.status).endswith('ACTIVE') or job.status == 'active':
            active.append((job.id, job.job_title))
        else:
            other.append((job.id, job.job_title, job.status))
    
    print(f"\n✅ ACTIVE Jobs: {len(active)}")
    for jid, title in active[:10]:
        print(f"   ID {jid}: {title}")
    
    if frozen:
        print(f"\n⚠️  FROZEN Jobs (Cannot Accept Applications): {len(frozen)}")
        for jid, title, status in frozen:
            print(f"   ID {jid}: {title} (status={status})")
        
        print(f"\n🔧 FIX: To unfreeze these jobs, run:")
        print(f"   UPDATE job_postings SET status = 'active' WHERE status = 'frozen';")
    else:
        print(f"\n✅ No frozen jobs")
    
    if other:
        print(f"\nℹ️  Other Status Jobs: {len(other)}")
        for jid, title, status in other:
            print(f"   ID {jid}: {title} (status={status})")
