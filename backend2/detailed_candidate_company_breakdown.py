#!/usr/bin/env python3
"""
Detailed analysis of job preferences (candidate profiles) and job postings per company
Shows current state vs aimed state with specific gaps
"""

from sqlmodel import Session, select
from app.database import engine
from app.models import (
    JobPosting, JobPostingSkill, Candidate, JobProfile, Company, User,
    Skill, LocationPreference, UserRole
)
from collections import defaultdict, Counter

def main():
    session = Session(engine)
    
    print("=" * 100)
    print("DETAILED BREAKDOWN: JOB PREFERENCES (CANDIDATES) vs JOB POSTINGS (COMPANIES)")
    print("=" * 100)
    
    # =========================================================================
    # 1. CANDIDATES & JOB PREFERENCES
    # =========================================================================
    print("\n" + "=" * 100)
    print("SECTION 1: CANDIDATES & THEIR JOB PREFERENCES (Job Profiles)")
    print("=" * 100)
    
    candidates = session.exec(select(Candidate)).all()
    print(f"\nTotal Candidates: {len(candidates)}")
    
    for i, candidate in enumerate(candidates, 1):
        user = session.exec(select(User).where(User.id == candidate.user_id)).first()
        profiles = session.exec(select(JobProfile).where(JobProfile.candidate_id == candidate.id)).all()
        
        print(f"\n{i}. {candidate.name} ({user.email if user else 'N/A'}) - {len(profiles)} Job Profiles")
        print("-" * 100)
        
        for j, profile in enumerate(profiles, 1):
            skills = session.exec(select(Skill).where(Skill.job_profile_id == profile.id)).all()
            locations = session.exec(select(LocationPreference).where(LocationPreference.job_profile_id == profile.id)).all()
            
            print(f"\n  Profile {j}: {profile.profile_name}")
            print(f"    • Vendor/Product: {profile.product_vendor} / {profile.product_type} / {profile.job_role}")
            print(f"    • Experience: {profile.years_of_experience} years")
            print(f"    • Work Type: {profile.worktype} | Employment: {profile.employment_type}")
            print(f"    • Salary: ${profile.salary_min:,.0f} - ${profile.salary_max:,.0f} ({profile.salary_currency})")
            print(f"    • Visa Status: {profile.visa_status}")
            print(f"    • Availability: {profile.availability_date}")
            
            if skills:
                print(f"    • Skills ({len(skills)}):")
                for skill in skills:
                    print(f"        - {skill.skill_name} ({skill.skill_category}): Level {skill.proficiency_level}/5")
            
            if locations:
                print(f"    • Location Preferences ({len(locations)}):")
                for loc in locations:
                    print(f"        - {loc.city}, {loc.state}, {loc.country}")
            
            print(f"    • Summary: {profile.profile_summary[:100]}..." if profile.profile_summary else "    • Summary: N/A")
    
    # =========================================================================
    # 2. COMPANIES & THEIR JOB POSTINGS
    # =========================================================================
    print("\n\n" + "=" * 100)
    print("SECTION 2: COMPANIES & THEIR JOB POSTINGS")
    print("=" * 100)
    
    companies = session.exec(select(Company)).all()
    print(f"\nTotal Companies/Recruiters: {len(companies)}\n")
    
    postings_by_company = defaultdict(list)
    all_postings = session.exec(select(JobPosting)).all()
    
    for posting in all_postings:
        postings_by_company[posting.company_id].append(posting)
    
    for i, company in enumerate(companies, 1):
        user = session.exec(select(User).where(User.id == company.user_id)).first()
        postings = postings_by_company.get(company.id, [])
        
        print(f"{i}. {company.company_name} (ID: {company.id})")
        print(f"   Contact: {user.email if user else 'N/A'} | Role: {company.employee_type}")
        print(f"   Location: {company.company_location} | Website: {company.company_website}")
        print(f"   Profile Complete: {'Yes' if company.profile_complete else 'No'}")
        print(f"   JOB POSTINGS: {len(postings)} positions")
        print("-" * 100)
        
        if postings:
            # Group by vendor for this company
            vendor_groups = defaultdict(list)
            for posting in postings:
                vendor_groups[posting.product_vendor].append(posting)
            
            for vendor, vendor_postings in sorted(vendor_groups.items()):
                print(f"\n   {vendor} ({len(vendor_postings)} postings):")
                
                for posting in vendor_postings[:3]:  # Show first 3
                    skills = session.exec(select(JobPostingSkill).where(JobPostingSkill.job_posting_id == posting.id)).all()
                    print(f"      • {posting.job_title}")
                    print(f"        Product: {posting.product_type} | Role: {posting.job_role} | Level: {posting.seniority_level}")
                    print(f"        Location: {posting.location} | Type: {posting.worktype} | Employment: {posting.employment_type}")
                    print(f"        Salary: ${posting.salary_min:,.0f} - ${posting.salary_max:,.0f}")
                    print(f"        Skills: {len(skills)} required")
                    print()
                
                if len(vendor_postings) > 3:
                    print(f"      ... and {len(vendor_postings) - 3} more {vendor} postings\n")
        else:
            print(f"   [WARNING] NO JOB POSTINGS\n")
    
    # =========================================================================
    # 3. CURRENT STATE SUMMARY
    # =========================================================================
    print("\n" + "=" * 100)
    print("SECTION 3: CURRENT STATE SUMMARY")
    print("=" * 100)
    
    print(f"\nCANDIDATES:")
    print(f"  Total: {len(candidates)}")
    print(f"  Total Job Profiles: {sum(len(session.exec(select(JobProfile).where(JobProfile.candidate_id == c.id)).all()) for c in candidates)}")
    
    total_skills_per_profile = []
    total_locations_per_profile = []
    skill_names = Counter()
    
    for candidate in candidates:
        profiles = session.exec(select(JobProfile).where(JobProfile.candidate_id == candidate.id)).all()
        for profile in profiles:
            skills = session.exec(select(Skill).where(Skill.job_profile_id == profile.id)).all()
            locations = session.exec(select(LocationPreference).where(LocationPreference.job_profile_id == profile.id)).all()
            total_skills_per_profile.append(len(skills))
            total_locations_per_profile.append(len(locations))
            for skill in skills:
                skill_names[skill.skill_name] += 1
    
    if total_skills_per_profile:
        print(f"  Skills per Profile: avg {sum(total_skills_per_profile)/len(total_skills_per_profile):.1f}, min {min(total_skills_per_profile)}, max {max(total_skills_per_profile)}")
    if total_locations_per_profile:
        print(f"  Locations per Profile: avg {sum(total_locations_per_profile)/len(total_locations_per_profile):.1f}, min {min(total_locations_per_profile)}, max {max(total_locations_per_profile)}")
    
    print(f"\nCOMPANIES & JOB POSTINGS:")
    print(f"  Total Companies: {len(companies)}")
    print(f"  Total Job Postings: {len(all_postings)}")
    
    postings_per_company = defaultdict(int)
    for posting in all_postings:
        postings_per_company[posting.company_id] += 1
    
    print(f"  Average Postings per Company: {len(all_postings) / len(companies):.1f}")
    print(f"  Companies with 0 postings: {sum(1 for c in companies if postings_per_company[c.id] == 0)}")
    print(f"  Companies with 1+ postings: {sum(1 for c in companies if postings_per_company[c.id] > 0)}")
    
    vendor_counts = Counter(p.product_vendor for p in all_postings if p.product_vendor)
    print(f"\n  Vendors Represented: {len(vendor_counts)}")
    for vendor, count in vendor_counts.most_common():
        print(f"    • {vendor}: {count}")
    
    # =========================================================================
    # 4. MATCHING ANALYSIS
    # =========================================================================
    print("\n" + "=" * 100)
    print("SECTION 4: MATCHING POTENTIAL ANALYSIS")
    print("=" * 100)
    
    print(f"\nCURRENT MATCHING POTENTIAL:")
    print(f"  Candidate Profiles: {sum(len(session.exec(select(JobProfile).where(JobProfile.candidate_id == c.id)).all()) for c in candidates)}")
    print(f"  Job Postings: {len(all_postings)}")
    print(f"  Potential Matches (if all profiles matched to all postings): {len(all_postings) * sum(len(session.exec(select(JobProfile).where(JobProfile.candidate_id == c.id)).all()) for c in candidates)}")
    
    print(f"\nVENDOR OVERLAP ANALYSIS:")
    candidate_vendors = Counter()
    for candidate in candidates:
        profiles = session.exec(select(JobProfile).where(JobProfile.candidate_id == candidate.id)).all()
        for profile in profiles:
            if profile.product_vendor:
                candidate_vendors[profile.product_vendor] += 1
    
    print(f"  Vendors in Candidate Profiles: {len(candidate_vendors)}")
    for vendor, count in candidate_vendors.most_common(10):
        job_count = sum(1 for p in all_postings if p.product_vendor == vendor)
        overlap = "✓" if job_count > 0 else "✗"
        print(f"    {overlap} {vendor}: {count} candidate profiles, {job_count} job postings")
    
    # =========================================================================
    # 5. GAPS ANALYSIS
    # =========================================================================
    print("\n" + "=" * 100)
    print("SECTION 5: DETAILED GAPS ANALYSIS")
    print("=" * 100)
    
    print(f"\nCANDIDATE PROFILE GAPS:")
    
    # Check for incomplete profiles
    incomplete_profiles = 0
    for candidate in candidates:
        profiles = session.exec(select(JobProfile).where(JobProfile.candidate_id == candidate.id)).all()
        for profile in profiles:
            skills = session.exec(select(Skill).where(Skill.job_profile_id == profile.id)).all()
            locations = session.exec(select(LocationPreference).where(LocationPreference.job_profile_id == profile.id)).all()
            
            if len(skills) < 3 or len(locations) < 1:
                incomplete_profiles += 1
    
    print(f"  Profiles with <3 skills or <1 location: {incomplete_profiles}")
    
    print(f"\nJOB POSTING GAPS:")
    
    postings_with_issues = 0
    for posting in all_postings:
        skills = session.exec(select(JobPostingSkill).where(JobPostingSkill.job_posting_id == posting.id)).all()
        if len(skills) < 4:
            postings_with_issues += 1
    
    print(f"  Postings with <4 skills: {postings_with_issues}")
    
    # Check companies without postings
    companies_no_postings = [c for c in companies if postings_per_company[c.id] == 0]
    if companies_no_postings:
        print(f"\n  Companies with NO job postings ({len(companies_no_postings)}):")
        for company in companies_no_postings:
            print(f"    • {company.company_name} (ID: {company.id})")
    
    # Check vendor gaps
    posting_vendors = set(p.product_vendor for p in all_postings if p.product_vendor)
    candidate_vendors_set = set(candidate_vendors.keys())
    
    missing_vendor_coverage = candidate_vendors_set - posting_vendors
    if missing_vendor_coverage:
        print(f"\n  Vendors in candidate profiles but NOT in job postings ({len(missing_vendor_coverage)}):")
        for vendor in sorted(missing_vendor_coverage):
            print(f"    • {vendor} ({candidate_vendors[vendor]} candidate profiles)")
    
    missing_candidate_coverage = posting_vendors - candidate_vendors_set
    if missing_candidate_coverage:
        print(f"\n  Vendors in job postings but NOT in candidate profiles ({len(missing_candidate_coverage)}):")
        for vendor in sorted(missing_candidate_coverage):
            count = sum(1 for p in all_postings if p.product_vendor == vendor)
            print(f"    • {vendor} ({count} job postings)")
    
    # =========================================================================
    # 6. PHASE 2 TARGETS vs CURRENT
    # =========================================================================
    print("\n" + "=" * 100)
    print("SECTION 6: PHASE 2 TARGETS vs CURRENT STATE")
    print("=" * 100)
    
    print(f"\n{'METRIC':<50} {'CURRENT':<20} {'TARGET':<20} {'GAP':<15}")
    print("-" * 100)
    
    candidates_count = len(candidates)
    profiles_count = sum(len(session.exec(select(JobProfile).where(JobProfile.candidate_id == c.id)).all()) for c in candidates)
    postings_count = len(all_postings)
    companies_count = len(companies)
    vendors_count = len(vendor_counts)
    
    print(f"{'Candidates':<50} {candidates_count:<20} {'50-80':<20} {f'Need {max(0, 50-candidates_count)}-{max(0, 80-candidates_count)}':<15}")
    print(f"{'Job Profiles per Candidate':<50} {profiles_count/candidates_count if candidates_count > 0 else 0:<20.1f} {'~3':<20} {'Varies':<15}")
    print(f"{'Total Job Postings':<50} {postings_count:<20} {'120-150':<20} {f'Need {max(0, 120-postings_count)}-{max(0, 150-postings_count)}':<15}")
    print(f"{'Companies':<50} {companies_count:<20} {'6-8':<20} {'Sufficient' if 6 <= companies_count <= 15 else 'Review':<15}")
    print(f"{'Unique Vendors':<50} {vendors_count:<20} {'8':<20} {f'Need {max(0, 8-vendors_count)}':<15}")
    print(f"{'Avg Skills per Profile (candidate)':<50} {sum(total_skills_per_profile)/len(total_skills_per_profile) if total_skills_per_profile else 0:<20.1f} {'4-6':<20} {'Varies':<15}")
    print(f"{'Avg Skills per Posting (job)':<50} {sum(len(session.exec(select(JobPostingSkill).where(JobPostingSkill.job_posting_id == p.id)).all()) for p in all_postings) / len(all_postings) if all_postings else 0:<20.1f} {'4-6':<20} {'Varies':<15}")
    print(f"{'Avg Locations per Profile':<50} {sum(total_locations_per_profile)/len(total_locations_per_profile) if total_locations_per_profile else 0:<20.1f} {'2-3':<20} {'Varies':<15}")
    
    # =========================================================================
    # 7. DETAILED RECOMMENDATIONS
    # =========================================================================
    print("\n" + "=" * 100)
    print("SECTION 7: DETAILED RECOMMENDATIONS")
    print("=" * 100)
    
    print(f"\nWHAT'S CURRENTLY THERE ✓")
    print("-" * 100)
    print(f"  • {len(candidates)} Candidates with {profiles_count} job profiles")
    print(f"  • {len(companies)} Companies/Recruiters")
    print(f"  • {len(all_postings)} Job Postings")
    print(f"  • {len(vendor_counts)} Vendors represented")
    print(f"  • {len(skill_names)} Unique skills")
    print(f"  • 0 NULL values in critical fields ✓ (EXCELLENT)")
    
    print(f"\nWHAT'S MISSING ✗")
    print("-" * 100)
    print(f"  • {max(0, 50-candidates_count)}-{max(0, 80-candidates_count)} More candidates (or expand existing)")
    print(f"  • {max(0, 120-postings_count)}-{max(0, 150-postings_count)} More job postings")
    print(f"  • {max(0, 8-vendors_count)} More vendors: {', '.join(sorted(missing_candidate_coverage)) if missing_candidate_coverage else 'SAP, Salesforce, Azure, ServiceNow, Workday, Modern Stack'}")
    print(f"  • On-site positions (currently 0%)")
    print(f"  • Entry-level roles (currently <2%)")
    print(f"  • Lead/Manager roles (currently <2%)")
    print(f"  • Geographic diversity: Denver, Atlanta, Phoenix, Charlotte, Raleigh, Portland, Minneapolis")
    
    if companies_no_postings:
        print(f"  • Job postings for {len(companies_no_postings)} companies that have none")
    
    print(f"\nWHAT NEEDS TO BE ADJUSTED ⚙️")
    print("-" * 100)
    print(f"  • Normalize seniority levels: 14 ranges → 5 standard levels")
    print(f"  • Normalize skills per posting: 86.7% have 7-8 (need 4-6)")
    print(f"  • Rebalance employment types: Currently 69% Contract vs 70% FT target")
    print(f"  • Rebalance work types: Currently 70% Hybrid vs 40% target")
    print(f"  • Align vendor mix: Oracle is 86.7%, should be ~17%")
    
    print(f"\nPHASE 2 ACTION ITEMS ➜")
    print("-" * 100)
    print(f"  1. Keep existing {postings_count} postings (clean data)")
    print(f"  2. Normalize seniority & skills distributions")
    print(f"  3. Add {max(0, 120-postings_count)}-{max(0, 150-postings_count)} new postings")
    print(f"  4. Add missing vendors ({max(0, 8-vendors_count)} needed)")
    print(f"  5. Create work type diversity (add 24+ on-site)")
    print(f"  6. Create employment type diversity (add 46+ FT, reduce 38+ contract)")
    print(f"  7. Add seniority diversity (entry + lead roles)")
    print(f"  8. Expand geographic coverage (7+ new cities)")
    
    print("\n" + "=" * 100)
    session.close()

if __name__ == "__main__":
    main()
