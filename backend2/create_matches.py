"""Create mutual matches for all companies - at least 1-2 per company"""
from app.database import engine
from sqlmodel import Session, select
from app.models import Match, Swipe, Company, JobPosting, Candidate, JobProfile

with Session(engine) as s:
    # Get all companies grouped by company_name
    all_companies = s.exec(select(Company)).all()
    company_groups = {}
    for c in all_companies:
        if c.company_name not in company_groups:
            company_groups[c.company_name] = []
        company_groups[c.company_name].append(c)

    # Get all candidates with their job profiles
    candidates = s.exec(select(Candidate)).all()
    print(f"Found {len(candidates)} candidates, {len(company_groups)} companies\n")

    created = 0
    for company_name, comps in company_groups.items():
        # Use the first company record (admin's) for creating matches
        comp = comps[0]
        
        # Get job postings for this company group
        comp_ids = [c.id for c in comps]
        job_postings = s.exec(
            select(JobPosting).where(JobPosting.company_id.in_(comp_ids))
        ).all()
        
        if not job_postings:
            print(f"  {company_name}: No job postings, skipping")
            continue

        # Check existing mutual matches for this company
        existing_mutual = s.exec(
            select(Match).where(
                Match.company_id.in_(comp_ids),
                Match.candidate_liked == True,
                Match.company_liked == True
            )
        ).all()
        
        existing_count = len(existing_mutual)
        needed = max(0, 2 - existing_count)
        
        if needed == 0:
            print(f"  {company_name}: Already has {existing_count} mutual matches, skipping")
            continue

        # Pick candidates that don't already have a mutual match with this company
        existing_cand_ids = {m.candidate_id for m in existing_mutual}
        available_cands = [c for c in candidates if c.id not in existing_cand_ids]
        
        matched = 0
        for cand in available_cands[:needed]:
            # Get a job profile for this candidate
            profiles = s.exec(
                select(JobProfile).where(JobProfile.candidate_id == cand.id)
            ).all()
            if not profiles:
                continue
            profile = profiles[0]
            posting = job_postings[matched % len(job_postings)]
            
            # Check if match record already exists
            existing_match = s.exec(
                select(Match).where(
                    Match.candidate_id == cand.id,
                    Match.company_id == comp.id,
                    Match.job_posting_id == posting.id,
                    Match.job_profile_id == profile.id
                )
            ).first()
            
            if existing_match:
                # Update to mutual
                existing_match.candidate_liked = True
                existing_match.company_liked = True
                existing_match.match_percentage = 85.0
                s.add(existing_match)
                print(f"  {company_name}: Updated match for {cand.name} (match_id={existing_match.id})")
            else:
                # Create new mutual match
                match = Match(
                    candidate_id=cand.id,
                    company_id=comp.id,
                    job_posting_id=posting.id,
                    job_profile_id=profile.id,
                    candidate_liked=True,
                    company_liked=True,
                    match_percentage=85.0
                )
                s.add(match)
                print(f"  {company_name}: Created mutual match for {cand.name}")
            
            # Also add swipe records if missing
            existing_cand_swipe = s.exec(
                select(Swipe).where(
                    Swipe.candidate_id == cand.id,
                    Swipe.company_id == comp.id,
                    Swipe.action_by == "candidate",
                    Swipe.action == "like"
                )
            ).first()
            if not existing_cand_swipe:
                s.add(Swipe(
                    candidate_id=cand.id,
                    company_id=comp.id,
                    job_posting_id=posting.id,
                    job_profile_id=profile.id,
                    action="like",
                    action_by="candidate"
                ))

            existing_comp_swipe = s.exec(
                select(Swipe).where(
                    Swipe.candidate_id == cand.id,
                    Swipe.company_id == comp.id,
                    Swipe.action_by == "recruiter",
                    Swipe.action == "like"
                )
            ).first()
            if not existing_comp_swipe:
                s.add(Swipe(
                    candidate_id=cand.id,
                    company_id=comp.id,
                    job_posting_id=posting.id,
                    job_profile_id=profile.id,
                    action="like",
                    action_by="recruiter"
                ))
            
            matched += 1
            created += 1
        
        print(f"  {company_name}: {matched} new mutual matches created")

    s.commit()
    print(f"\n✅ Done! Created/updated {created} mutual matches across all companies.")
