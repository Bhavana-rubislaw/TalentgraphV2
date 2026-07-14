"""
Seed and normalize Phase 2 dataset targets.

This script upgrades the existing baseline dataset from:
- 83 job postings
- 53 job preference profiles

To the documented Phase 2 target state:
- 120 total job postings
- 118 total job preference profiles
- 8 vendor types represented in postings
- 15+ posting locations
- 40% remote postings
- 70% full-time postings

Run:
    cd backend2
    python scripts/seed/seed_phase2_dataset.py
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import date, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from sqlmodel import Session, select

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.database import engine

from app.models import (
    Candidate,
    Company,
    CurrencyType,
    EmploymentType,
    JobPosting,
    JobProfile,
    LocationPreference,
    Skill,
    VisaStatus,
    WorkType,
)

TARGET_POSTINGS = 120
TARGET_PROFILES = 118
TARGET_REMOTE = 48  # 40% of 120
TARGET_FT = 84      # 70% of 120

POSTING_VENDORS = [
    "SAP",
    "Salesforce",
    "AWS",
    "Azure",
    "ServiceNow",
    "Workday",
    "Cloud Native",
    "Oracle",
]

POSTING_LIBRARY = {
    "SAP": [
        ("SAP S/4HANA", "SAP FICO Consultant"),
        ("SAP S/4HANA", "SAP MM Consultant"),
        ("SAP SuccessFactors", "SAP HCM Consultant"),
    ],
    "Salesforce": [
        ("Sales Cloud", "Salesforce Administrator"),
        ("Service Cloud", "Salesforce Developer"),
        ("Experience Cloud", "Salesforce Architect"),
    ],
    "AWS": [
        ("AWS Lambda", "Cloud Engineer"),
        ("Amazon EKS", "DevOps Engineer"),
        ("AWS Security Hub", "Security Engineer"),
    ],
    "Azure": [
        ("Azure Kubernetes Service", "Cloud Architect"),
        ("Azure DevOps", "DevOps Engineer"),
        ("Azure SQL", "Database Engineer"),
    ],
    "ServiceNow": [
        ("ITSM", "ServiceNow Administrator"),
        ("SecOps", "ServiceNow Security Engineer"),
        ("HRSD", "ServiceNow Business Analyst"),
    ],
    "Workday": [
        ("HCM", "Workday HCM Consultant"),
        ("Financials", "Workday Finance Consultant"),
        ("Studio", "Workday Integration Developer"),
    ],
    "Cloud Native": [
        ("Kubernetes", "Platform Engineer"),
        ("Docker", "Cloud Infrastructure Engineer"),
        ("Microservices", "Backend Developer"),
    ],
    "Oracle": [
        ("Fusion Cloud", "Oracle Fusion Functional Consultant"),
        ("OCI", "Oracle Cloud Infrastructure Engineer"),
        ("Autonomous Database", "Oracle Cloud DBA"),
    ],
}

PROFILE_VENDOR_MAP = {
    "Oracle": ["SAP", "Salesforce"],
    "AWS": ["Azure", "Cloud Native"],
    "Snowflake": ["AWS", "Azure"],
    "Power BI": ["Salesforce", "ServiceNow"],
    "Apple": ["Salesforce", "Cloud Native"],
    "General": ["Salesforce", "AWS"],
    "default": ["SAP", "Salesforce"],
}

NEW_CITIES = [
    "Denver, CO",
    "Atlanta, GA",
    "Phoenix, AZ",
    "Charlotte, NC",
    "Raleigh, NC",
    "Portland, OR",
    "Minneapolis, MN",
]


def normalize_vendor(vendor: Optional[str]) -> str:
    if not vendor:
        return "General"
    return vendor.strip()


def seniority_from_years(years: int) -> str:
    if years <= 1:
        return "Entry"
    if years <= 3:
        return "Junior"
    if years <= 6:
        return "Mid"
    if years <= 9:
        return "Senior"
    return "Lead"


def clone_skills(session: Session, profile_id: int) -> List[Dict]:
    skills = session.exec(
        select(Skill).where(Skill.job_profile_id == profile_id).order_by(Skill.id)
    ).all()
    return [
        {
            "skill_name": s.skill_name,
            "skill_category": s.skill_category,
            "proficiency_level": s.proficiency_level,
        }
        for s in skills
    ]


def clone_locations(session: Session, profile_id: int) -> List[Dict]:
    locations = session.exec(
        select(LocationPreference)
        .where(LocationPreference.job_profile_id == profile_id)
        .order_by(LocationPreference.id)
    ).all()
    return [
        {
            "city": loc.city,
            "state": loc.state,
            "country": loc.country or "USA",
        }
        for loc in locations
    ]


def posting_counts(session: Session) -> Tuple[int, int, int]:
    postings = session.exec(select(JobPosting)).all()
    remote = sum(1 for p in postings if p.worktype == WorkType.REMOTE)
    ft = sum(1 for p in postings if p.employment_type == EmploymentType.FT)
    return len(postings), remote, ft


def normalize_existing_postings(session: Session) -> Tuple[int, int]:
    postings = session.exec(select(JobPosting).order_by(JobPosting.id)).all()

    general_to_cloud_native = 0
    for posting in postings:
        if normalize_vendor(posting.product_vendor) == "General":
            posting.product_vendor = "Cloud Native"
            if not posting.product_type or posting.product_type == "Web Development":
                posting.product_type = "Cloud Applications"
            general_to_cloud_native += 1

    # Compute required FT conversions after planned inserts.
    current_total, _, current_ft = posting_counts(session)
    inserts_needed = max(0, TARGET_POSTINGS - current_total)
    desired_ft_before_insert = max(0, TARGET_FT - inserts_needed)

    converted_to_ft = 0
    if current_ft < desired_ft_before_insert:
        for posting in postings:
            if current_ft >= desired_ft_before_insert:
                break
            if posting.employment_type == EmploymentType.CONTRACT:
                posting.employment_type = EmploymentType.FT
                current_ft += 1
                converted_to_ft += 1

    session.commit()
    return general_to_cloud_native, converted_to_ft


def add_new_postings(session: Session) -> int:
    companies = session.exec(select(Company).order_by(Company.id)).all()
    if not companies:
        return 0

    postings = session.exec(select(JobPosting).order_by(JobPosting.id)).all()
    existing_signatures = {(p.company_id, p.job_title) for p in postings}
    total_now, remote_now, _ = posting_counts(session)

    needed = max(0, TARGET_POSTINGS - total_now)
    if needed == 0:
        return 0

    remote_to_add = max(0, TARGET_REMOTE - remote_now)

    location_cycle = NEW_CITIES + [
        "Chicago, IL",
        "New York, NY",
        "Austin, TX",
        "Seattle, WA",
        "Boston, MA",
        "San Francisco, CA",
        "Remote, USA",
    ]

    added = 0
    company_idx = 0
    day_offset = 14
    for i in range(needed):
        vendor = POSTING_VENDORS[i % len(POSTING_VENDORS)]
        product_type, job_role = POSTING_LIBRARY[vendor][i % len(POSTING_LIBRARY[vendor])]
        company = companies[company_idx % len(companies)]
        company_idx += 1

        if i < remote_to_add:
            worktype = WorkType.REMOTE
            location = "Remote, USA"
        else:
            worktype = WorkType.HYBRID if i % 2 == 0 else WorkType.ONSITE
            location = location_cycle[i % len(location_cycle)]
            if location == "Remote, USA":
                location = NEW_CITIES[i % len(NEW_CITIES)]

        level = ["Junior", "Mid", "Senior", "Lead"][i % 4]
        if level == "Junior":
            salary_min, salary_max = 85000.0, 115000.0
        elif level == "Mid":
            salary_min, salary_max = 110000.0, 145000.0
        elif level == "Senior":
            salary_min, salary_max = 135000.0, 175000.0
        else:
            salary_min, salary_max = 160000.0, 210000.0

        title = f"Phase 2 {level} {job_role}"
        signature = (company.id, title)
        if signature in existing_signatures:
            title = f"Phase 2 {level} {job_role} #{i + 1}"
            signature = (company.id, title)

        posting = JobPosting(
            company_id=company.id,
            job_title=title,
            product_vendor=vendor,
            product_type=product_type,
            job_role=job_role,
            seniority_level=level,
            worktype=worktype,
            location=location,
            employment_type=EmploymentType.FT,
            start_date=(date.today() + timedelta(days=day_offset)).isoformat(),
            end_date=(date.today() + timedelta(days=day_offset + 60)).isoformat(),
            salary_min=salary_min,
            salary_max=salary_max,
            salary_currency=CurrencyType.USD,
            job_description=(
                f"Phase 2 expansion role for {vendor} delivery. The role focuses on "
                f"{product_type} and {job_role} outcomes."
            ),
            required_skills=json.dumps([
                {"skill": vendor, "category": "technical"},
                {"skill": product_type, "category": "technical"},
                {"skill": job_role.split()[0], "category": "technical"},
                {"skill": "Stakeholder Communication", "category": "soft"},
            ]),
            visa_info="US Citizen, Green Card, H1B",
            travel_requirements="None" if worktype == WorkType.REMOTE else "0-10%",
            pay_type="annually",
        )
        session.add(posting)
        existing_signatures.add(signature)
        added += 1
        day_offset += 1

    session.commit()
    return added


def choose_source_profile(profiles: List[JobProfile]) -> JobProfile:
    return sorted(
        profiles,
        key=lambda p: (
            normalize_vendor(p.product_vendor) == "General",
            -p.years_of_experience,
            p.id,
        ),
    )[0]


def add_profile_if_missing(
    session: Session,
    candidate: Candidate,
    source: JobProfile,
    profile_name: str,
    vendor: str,
    product_type: str,
    job_role: str,
    years: int,
    worktype: WorkType,
    salary_min: float,
    salary_max: float,
    locations: List[Dict],
    seniority: str,
) -> bool:
    exists = session.exec(
        select(JobProfile).where(
            JobProfile.candidate_id == candidate.id,
            JobProfile.profile_name == profile_name,
        )
    ).first()
    if exists:
        return False

    profile = JobProfile(
        candidate_id=candidate.id,
        profile_name=profile_name,
        product_vendor=vendor,
        product_type=product_type,
        job_role=job_role,
        years_of_experience=max(0, years),
        worktype=worktype,
        employment_type=EmploymentType.FT,
        salary_min=max(50000.0, salary_min),
        salary_max=max(70000.0, salary_max),
        salary_currency=source.salary_currency or CurrencyType.USD,
        visa_status=source.visa_status or VisaStatus.WORK_VISA,
        ethnicity=source.ethnicity,
        availability_date=source.availability_date or "2 weeks",
        profile_summary=(
            f"Phase 2 profile for {candidate.name} targeting {vendor} {job_role} opportunities."
        ),
        seniority_level=seniority,
        remote_acceptance="fully_remote" if worktype == WorkType.REMOTE else None,
        relocation_willingness="yes" if worktype == WorkType.ONSITE else "depends",
        pay_type="annually",
        relevant_experience=max(0, years),
    )
    session.add(profile)
    session.commit()
    session.refresh(profile)

    skills = clone_skills(session, source.id)
    if not skills:
        skills = [
            {"skill_name": vendor, "skill_category": "technical", "proficiency_level": 3},
            {"skill_name": job_role.split()[0], "skill_category": "technical", "proficiency_level": 3},
        ]

    # Add vendor skill marker for non-source vendor variants.
    if all(s["skill_name"].lower() != vendor.lower() for s in skills):
        skills.insert(0, {
            "skill_name": vendor,
            "skill_category": "technical",
            "proficiency_level": 3,
        })

    for skill in skills[:8]:
        session.add(Skill(job_profile_id=profile.id, **skill))

    if not locations:
        locations = [{"city": "Remote", "state": "USA", "country": "USA"}]

    for loc in locations[:4]:
        session.add(
            LocationPreference(
                job_profile_id=profile.id,
                city=loc["city"],
                state=loc["state"],
                country=loc.get("country", "USA"),
            )
        )

    session.commit()
    return True


def add_new_profiles(session: Session) -> int:
    candidates = session.exec(select(Candidate).order_by(Candidate.id)).all()
    current_profiles = session.exec(select(JobProfile)).all()
    needed = max(0, TARGET_PROFILES - len(current_profiles))
    if needed == 0:
        return 0

    by_candidate: Dict[int, List[JobProfile]] = {}
    for p in session.exec(select(JobProfile).order_by(JobProfile.candidate_id, JobProfile.id)).all():
        by_candidate.setdefault(p.candidate_id, []).append(p)

    # Planned additions: 34 vendor variants + 10 entry + 18 junior + 3 geo = 65
    added = 0

    # 1) Two vendor variants per candidate (34)
    for candidate in candidates:
        if added >= needed:
            break
        source = choose_source_profile(by_candidate[candidate.id])
        source_vendor = normalize_vendor(source.product_vendor)
        targets = PROFILE_VENDOR_MAP.get(source_vendor, PROFILE_VENDOR_MAP["default"])

        for idx, vendor in enumerate(targets):
            if added >= needed:
                break
            product_type, role = POSTING_LIBRARY[vendor][idx % len(POSTING_LIBRARY[vendor])]
            name = f"Phase 2 {vendor} Variant {role}"
            locations = clone_locations(session, source.id)
            created = add_profile_if_missing(
                session,
                candidate,
                source,
                name,
                vendor,
                product_type,
                role,
                source.years_of_experience,
                source.worktype,
                source.salary_min,
                source.salary_max,
                locations,
                seniority_from_years(source.years_of_experience),
            )
            if created:
                by_candidate[candidate.id].append(
                    session.exec(
                        select(JobProfile).where(
                            JobProfile.candidate_id == candidate.id,
                            JobProfile.profile_name == name,
                        )
                    ).first()
                )
                added += 1

    # 2) Entry profiles for first 10 candidates
    for candidate in candidates[:10]:
        if added >= needed:
            break
        source = choose_source_profile(by_candidate[candidate.id])
        vendor = PROFILE_VENDOR_MAP.get(normalize_vendor(source.product_vendor), PROFILE_VENDOR_MAP["default"])[0]
        product_type, role = POSTING_LIBRARY[vendor][0]
        name = "Phase 2 Entry Track"
        created = add_profile_if_missing(
            session,
            candidate,
            source,
            name,
            vendor,
            product_type,
            role,
            1,
            WorkType.HYBRID,
            50000.0,
            85000.0,
            clone_locations(session, source.id),
            "Entry",
        )
        if created:
            added += 1

    # 3) Junior profiles for first 17 candidates + 1 extra for candidate id 14
    junior_candidates = candidates[:]
    extra_junior_candidate = next((c for c in candidates if c.id == 14), None)

    for candidate in junior_candidates:
        if added >= needed:
            break
        source = choose_source_profile(by_candidate[candidate.id])
        vendor = PROFILE_VENDOR_MAP.get(normalize_vendor(source.product_vendor), PROFILE_VENDOR_MAP["default"])[-1]
        product_type, role = POSTING_LIBRARY[vendor][1]

        junior_index = junior_candidates.index(candidate)
        worktype = WorkType.ONSITE if junior_index < 10 else WorkType.HYBRID
        onsite_city = NEW_CITIES[junior_index % len(NEW_CITIES)]
        loc_parts = onsite_city.split(", ")
        locations = [{"city": loc_parts[0], "state": loc_parts[1], "country": "USA"}]

        name = "Phase 2 Junior Track"
        created = add_profile_if_missing(
            session,
            candidate,
            source,
            name,
            vendor,
            product_type,
            role,
            3,
            worktype,
            85000.0,
            110000.0,
            locations,
            "Junior",
        )
        if created:
            added += 1

    if extra_junior_candidate and added < needed:
        source = choose_source_profile(by_candidate[extra_junior_candidate.id])
        vendor = PROFILE_VENDOR_MAP.get(normalize_vendor(source.product_vendor), PROFILE_VENDOR_MAP["default"])[0]
        product_type, role = POSTING_LIBRARY[vendor][2]
        created = add_profile_if_missing(
            session,
            extra_junior_candidate,
            source,
            "Phase 2 Junior Track Plus",
            vendor,
            product_type,
            role,
            2,
            WorkType.ONSITE,
            85000.0,
            110000.0,
            [{"city": "Denver", "state": "CO", "country": "USA"}],
            "Junior",
        )
        if created:
            added += 1

    # 4) Three geo-flex profiles to hit exact 65 additions.
    for candidate in candidates[:3]:
        if added >= needed:
            break
        source = choose_source_profile(by_candidate[candidate.id])
        vendor = normalize_vendor(source.product_vendor)
        if vendor == "General":
            vendor = "Salesforce"
        product_type, role = POSTING_LIBRARY[vendor][0]
        geo_locations = [
            {"city": "Denver", "state": "CO", "country": "USA"},
            {"city": "Atlanta", "state": "GA", "country": "USA"},
            {"city": "Raleigh", "state": "NC", "country": "USA"},
        ]
        created = add_profile_if_missing(
            session,
            candidate,
            source,
            "Phase 2 Geo Flex",
            vendor,
            product_type,
            role,
            max(2, source.years_of_experience),
            WorkType.HYBRID,
            source.salary_min,
            source.salary_max,
            geo_locations,
            seniority_from_years(source.years_of_experience),
        )
        if created:
            added += 1

    return added


def validate(session: Session) -> Dict:
    postings = session.exec(select(JobPosting)).all()
    profiles = session.exec(select(JobProfile)).all()

    posting_vendors = Counter(normalize_vendor(p.product_vendor) for p in postings)
    profile_vendors = Counter(normalize_vendor(p.product_vendor) for p in profiles)
    remote = sum(1 for p in postings if p.worktype == WorkType.REMOTE)
    ft = sum(1 for p in postings if p.employment_type == EmploymentType.FT)
    locations = {p.location for p in postings if p.location}
    entry = sum(1 for p in profiles if (p.seniority_level or "").lower() == "entry")
    junior = sum(1 for p in profiles if (p.seniority_level or "").lower() == "junior")
    onsite = sum(1 for p in profiles if p.worktype == WorkType.ONSITE)

    return {
        "postings": len(postings),
        "profiles": len(profiles),
        "posting_vendors": dict(posting_vendors),
        "profile_vendors": dict(profile_vendors),
        "remote_pct": round((remote / len(postings)) * 100, 1),
        "ft_pct": round((ft / len(postings)) * 100, 1),
        "locations": len(locations),
        "entry_profiles": entry,
        "junior_profiles": junior,
        "onsite_profiles": onsite,
    }


def main() -> None:
    with Session(engine) as session:
        before = validate(session)
        print("Before:")
        print(before)

        normalized_general, converted_ft = normalize_existing_postings(session)
        new_postings = add_new_postings(session)
        new_profiles = add_new_profiles(session)

        after = validate(session)
        print("\nChanges:")
        print(f"General->Cloud Native posting updates: {normalized_general}")
        print(f"Contract->FT posting conversions: {converted_ft}")
        print(f"New postings added: {new_postings}")
        print(f"New profiles added: {new_profiles}")

        print("\nAfter:")
        print(after)

        if after["postings"] != TARGET_POSTINGS:
            raise SystemExit(f"Expected {TARGET_POSTINGS} postings, found {after['postings']}")
        if after["profiles"] != TARGET_PROFILES:
            raise SystemExit(f"Expected {TARGET_PROFILES} profiles, found {after['profiles']}")
        if after["remote_pct"] < 40.0:
            raise SystemExit(f"Expected remote% >= 40, found {after['remote_pct']}")
        if after["ft_pct"] < 70.0:
            raise SystemExit(f"Expected FT% >= 70, found {after['ft_pct']}")
        if len(after["posting_vendors"]) < 8:
            raise SystemExit(f"Expected at least 8 posting vendors, found {len(after['posting_vendors'])}")
        if after["locations"] < 15:
            raise SystemExit(f"Expected at least 15 posting locations, found {after['locations']}")
        if after["entry_profiles"] < 8:
            raise SystemExit(f"Expected at least 8 entry profiles, found {after['entry_profiles']}")
        if after["junior_profiles"] < 15:
            raise SystemExit(f"Expected at least 15 junior profiles, found {after['junior_profiles']}")
        if after["onsite_profiles"] < 8:
            raise SystemExit(f"Expected at least 8 onsite profiles, found {after['onsite_profiles']}")

        print("\nPhase 2 dataset seed completed successfully.")


if __name__ == "__main__":
    main()
