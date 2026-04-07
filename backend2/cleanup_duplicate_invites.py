"""
Cleanup script to remove duplicate recruiter invites.
Keeps only the oldest invite for each candidate + job_posting combination.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlmodel import Session, select, and_
from app.database import engine
from app.models import Swipe
from collections import defaultdict

def cleanup_duplicate_invites():
    """Remove duplicate recruiter invites, keeping only the oldest one."""
    with Session(engine) as session:
        # Get all ask_to_apply swipes from recruiters
        invites = session.exec(
            select(Swipe)
            .where(Swipe.action == "ask_to_apply")
            .where(Swipe.action_by == "recruiter")
            .order_by(Swipe.created_at)  # Oldest first
        ).all()
        
        print(f"Found {len(invites)} total recruiter invites")
        
        # Group by (candidate_id, job_posting_id)
        invite_groups = defaultdict(list)
        for invite in invites:
            key = (invite.candidate_id, invite.job_posting_id)
            invite_groups[key].append(invite)
        
        duplicate_count = 0
        kept_count = 0
        
        for (candidate_id, job_posting_id), group in invite_groups.items():
            if len(group) > 1:
                # Keep the oldest (first), delete the rest
                oldest = group[0]
                duplicates = group[1:]
                
                print(f"\nCandidate {candidate_id}, Job {job_posting_id}:")
                print(f"  Found {len(group)} invites")
                print(f"  Keeping invite ID {oldest.id} from {oldest.created_at}")
                
                for dup in duplicates:
                    print(f"  Deleting duplicate invite ID {dup.id} from {dup.created_at}")
                    session.delete(dup)
                    duplicate_count += 1
                
                kept_count += 1
            else:
                kept_count += 1
        
        session.commit()
        
        print(f"\n{'='*60}")
        print(f"Cleanup Complete:")
        print(f"  Total unique invites: {kept_count}")
        print(f"  Duplicates removed: {duplicate_count}")
        print(f"{'='*60}")

if __name__ == "__main__":
    print("Starting duplicate invite cleanup...")
    cleanup_duplicate_invites()
    print("Done!")
