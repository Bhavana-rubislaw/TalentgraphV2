#!/usr/bin/env python3
"""Compare current dataset to Phase 2 targets"""

from sqlmodel import Session, select
from app.database import engine
from app.models import JobPosting, JobPostingSkill, Candidate, JobProfile, Company, Skill, LocationPreference
from collections import Counter

def main():
    session = Session(engine)
    
    # ==============================================
    # BASIC COUNTS
    # ==============================================
    print("=" * 70)
    print("CURRENT DATABASE STATE vs PHASE 2 TARGETS")
    print("=" * 70)
    
    postings = session.exec(select(JobPosting)).all()
    candidates = session.exec(select(Candidate)).all()
    job_profiles = session.exec(select(JobProfile)).all()
    companies = session.exec(select(Company)).all()
    all_skills = session.exec(select(Skill)).all()
    all_locations = session.exec(select(LocationPreference)).all()
    
    jp_count = len(postings)
    cand_count = len(candidates)
    jprof_count = len(job_profiles)
    comp_count = len(companies)
    skill_count = len(all_skills)
    loc_count = len(all_locations)
    
    print("\n1. ENTITY COUNTS")
    print("-" * 70)
    print(f"Job Postings:        {jp_count:3d}  →  Target: 120-150  (Gap: {max(0, 120-jp_count):3d}-{max(0, 150-jp_count):3d})")
    print(f"Candidates:          {cand_count:3d}  →  Target: 50-80   (Using existing: OK)")
    print(f"Job Profiles:        {jprof_count:3d}  →  Target: 50-80   (Should align with candidates)")
    print(f"Companies:           {comp_count:3d}  →  Target: 6-8     (Sufficient)")
    print(f"Total Skills:        {skill_count:3d}  →  Target: 400-900 (4-6 per posting)")
    print(f"Locations Prefs:     {loc_count:3d}  →  Target: 150-240 (2-3 per profile)")
    
    # ==============================================
    # VENDOR DISTRIBUTION
    # ==============================================
    vendors = [p.product_vendor for p in postings if p.product_vendor]
    vendor_counts = Counter(vendors)
    unique_vendors = len(vendor_counts)
    
    print("\n2. VENDOR DISTRIBUTION")
    print("-" * 70)
    print(f"Current Unique Vendors: {unique_vendors}  →  Target: 8")
    print("\nCurrent Breakdown:")
    for vendor, count in sorted(vendor_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {vendor:20s}: {count:3d}")
    
    print("\nTarget Breakdown (Phase 2):")
    target_vendors = {
        "Oracle": "20-25",
        "SAP": "15-20",
        "Salesforce": "15-20",
        "AWS": "15-20",
        "Azure": "10-15",
        "ServiceNow": "10-15",
        "Workday": "10-15",
        "Modern Stack": "10-15"
    }
    for vendor, target_range in target_vendors.items():
        current = vendor_counts.get(vendor, 0)
        status = "✓" if current > 0 else "✗"
        print(f"  {status} {vendor:20s}: {current:3d}  →  {target_range}")
    
    # ==============================================
    # WORK TYPE DISTRIBUTION
    # ==============================================
    work_types = Counter([str(p.worktype) for p in postings if p.worktype])
    
    print("\n3. WORK TYPE DISTRIBUTION")
    print("-" * 70)
    print("Target: Remote 40%, Hybrid 40%, On-site 20%")
    print("\nCurrent:")
    total_postings = len(postings)
    if total_postings > 0:
        for wt in ["WorkType.REMOTE", "WorkType.HYBRID", "WorkType.ONSITE"]:
            count = work_types.get(wt, 0)
            pct = (count / total_postings) * 100
            print(f"  {wt:20s}: {count:3d} ({pct:5.1f}%)")
    
    # ==============================================
    # SENIORITY DISTRIBUTION
    # ==============================================
    seniorities = Counter([p.seniority_level for p in postings if p.seniority_level])
    
    print("\n4. SENIORITY LEVEL DISTRIBUTION")
    print("-" * 70)
    print("Target: Entry 15%, Junior 20%, Mid 30%, Senior 20%, Lead 15%")
    print("\nCurrent:")
    if total_postings > 0:
        for sen in sorted(seniorities.keys()):
            count = seniorities.get(sen, 0)
            pct = (count / total_postings) * 100
            print(f"  {sen:20s}: {count:3d} ({pct:5.1f}%)")
    
    # ==============================================
    # LOCATION DISTRIBUTION
    # ==============================================
    locations = Counter([p.location for p in postings if p.location])
    unique_locations = len(locations)
    
    print("\n5. LOCATION DISTRIBUTION")
    print("-" * 70)
    print(f"Current Unique Locations: {unique_locations}  →  Target: 15+")
    print("\nTop 10 Current Locations:")
    for loc, count in sorted(locations.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {loc:25s}: {count:3d}")
    
    # ==============================================
    # SKILLS COVERAGE
    # ==============================================
    skill_per_posting = []
    for p in postings:
        skills = session.exec(select(JobPostingSkill).where(JobPostingSkill.job_posting_id == p.id)).all()
        skill_per_posting.append(len(skills))
    
    print("\n6. SKILLS PER POSTING")
    print("-" * 70)
    print("Target: 4-6 skills per posting")
    if skill_per_posting:
        avg_skills = sum(skill_per_posting) / len(skill_per_posting)
        print(f"\nCurrent Statistics:")
        print(f"  Min:  {min(skill_per_posting):3d}")
        print(f"  Max:  {max(skill_per_posting):3d}")
        print(f"  Avg:  {avg_skills:5.1f}")
        
        # Distribution
        under_4 = sum(1 for x in skill_per_posting if x < 4)
        perfect = sum(1 for x in skill_per_posting if 4 <= x <= 6)
        over_6 = sum(1 for x in skill_per_posting if x > 6)
        print(f"\n  <4 skills:   {under_4:3d} postings (needs fixing)")
        print(f"  4-6 skills:  {perfect:3d} postings (perfect)")
        print(f"  >6 skills:   {over_6:3d} postings (excess)")
    
    # ==============================================
    # SALARY RANGES
    # ==============================================
    salaries = [(p.salary_min, p.salary_max) for p in postings if p.salary_min and p.salary_max]
    
    print("\n7. SALARY RANGE COVERAGE")
    print("-" * 70)
    print("Target: $50k-$250k+ spectrum with overlaps")
    if salaries:
        min_sal = min([s[0] for s in salaries])
        max_sal = max([s[1] for s in salaries])
        avg_min = sum([s[0] for s in salaries]) / len(salaries)
        avg_max = sum([s[1] for s in salaries]) / len(salaries)
        print(f"\nCurrent Range:")
        print(f"  Minimum floor:  ${min_sal:>10,.0f}")
        print(f"  Maximum ceiling: ${max_sal:>10,.0f}")
        print(f"  Avg min offer:   ${avg_min:>10,.0f}")
        print(f"  Avg max offer:   ${avg_max:>10,.0f}")
    
    # ==============================================
    # SKILLS DIVERSITY
    # ==============================================
    unique_skills = len(set([s.skill_name for s in all_skills]))
    
    print("\n8. SKILLS DIVERSITY")
    print("-" * 70)
    print(f"Current Unique Skills: {unique_skills}  →  Target: 80+")
    
    top_skills = Counter([s.skill_name for s in all_skills])
    print("\nTop 15 Current Skills:")
    for skill, count in top_skills.most_common(15):
        print(f"  {skill:25s}: {count:3d} occurrences")
    
    # ==============================================
    # EMPLOYMENT TYPE DISTRIBUTION
    # ==============================================
    emp_types = Counter([str(p.employment_type) for p in postings if p.employment_type])
    
    print("\n9. EMPLOYMENT TYPE DISTRIBUTION")
    print("-" * 70)
    print("Target: FT 70%, Contract 25%, Temporary 5%")
    print("\nCurrent:")
    if total_postings > 0:
        for et in sorted(emp_types.keys()):
            count = emp_types.get(et, 0)
            pct = (count / total_postings) * 100
            print(f"  {et:20s}: {count:3d} ({pct:5.1f}%)")
    
    # ==============================================
    # DATA QUALITY CHECKS
    # ==============================================
    print("\n10. DATA QUALITY CHECKS")
    print("-" * 70)
    
    # Check for NULLs in critical fields
    null_checks = {
        "job_title": sum(1 for p in postings if not p.job_title),
        "product_vendor": sum(1 for p in postings if not p.product_vendor),
        "product_type": sum(1 for p in postings if not p.product_type),
        "job_role": sum(1 for p in postings if not p.job_role),
        "seniority_level": sum(1 for p in postings if not p.seniority_level),
        "worktype": sum(1 for p in postings if not p.worktype),
        "location": sum(1 for p in postings if not p.location),
        "salary_min": sum(1 for p in postings if p.salary_min is None),
        "salary_max": sum(1 for p in postings if p.salary_max is None),
        "job_description": sum(1 for p in postings if not p.job_description),
    }
    
    print("\nNULL Fields in Job Postings (should be 0):")
    for field, null_count in null_checks.items():
        status = "✓" if null_count == 0 else "✗"
        print(f"  {status} {field:20s}: {null_count:3d} NULL values")
    
    # ==============================================
    # SUMMARY
    # ==============================================
    print("\n" + "=" * 70)
    print("SUMMARY & GAPS")
    print("=" * 70)
    
    gaps = []
    
    if jp_count < 120:
        gaps.append(f"• Job Postings: {120 - jp_count}-{150 - jp_count} missing ({jp_count}/120-150)")
    if unique_vendors < 8:
        gaps.append(f"• Vendors: Only {unique_vendors}/8 represented")
    if sum(null_checks.values()) > 0:
        gaps.append(f"• Data Quality: {sum(null_checks.values())} NULL values found")
    if unique_locations < 15:
        gaps.append(f"• Locations: Only {unique_locations}/15+ cities covered")
    if unique_skills < 80:
        gaps.append(f"• Skill Diversity: Only {unique_skills}/80+ unique skills")
    
    if gaps:
        print("\nCritical Gaps:")
        for gap in gaps:
            print(gap)
    else:
        print("\n✓ All Phase 2 targets met!")
    
    print("\n" + "=" * 70)
    session.close()

if __name__ == "__main__":
    main()
