"""
Add 4 job postings to the remaining 6 company records that still have 0 postings
(company_ids: 3, 6, 9, 12, 15, 18 — the recruiter.* user records).
"""
from datetime import date, timedelta
from sqlmodel import Session, select
from app.database import engine
from app.models import Company, JobPosting, JobPostingStatus, WorkType, EmploymentType, CurrencyType

TODAY = date.today()
def d(offset: int) -> str:
    return (TODAY + timedelta(days=offset)).isoformat()

# company_id → list of 4 postings
POSTINGS_BY_COMPANY_ID = {
    3: {  # TechCorp Solutions — recruiter.robert
        "location": "San Francisco, CA",
        "postings": [
            {
                "job_title": "Oracle ERP Cloud Test Lead",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Technical Consultant",
                "seniority_level": "4-7 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 122.0, "salary_max": 158.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Lead testing activities for Oracle Cloud ERP implementations. Test strategy, OFT/UAT facilitation, defect management, and HP ALM or JIRA expertise required.",
                "start_date": d(14),
            },
            {
                "job_title": "Oracle Fusion Financials Upgrade Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "5-8 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 132.0, "salary_max": 168.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Lead Oracle Fusion quarterly upgrade assessments and critical patch reviews. Change impact analysis, regression testing, and new feature adoption planning.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle Fusion Data Migration Specialist",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Technical Consultant",
                "seniority_level": "4-7 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 128.0, "salary_max": 165.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Design and execute Oracle Fusion data migration strategies using FBDI, ADFDI, and HDL. Data reconciliation, cutover planning, and mock migration experience required.",
                "start_date": d(28),
            },
            {
                "job_title": "Oracle Fusion Change Management Lead",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Cloud Migration Specialist",
                "seniority_level": "6-9 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 138000.0, "salary_max": 178000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Lead organizational change management for Oracle Cloud ERP go-lives. Training curriculum design, stakeholder engagement, and Prosci ADKAR methodology experience required.",
                "start_date": d(55),
            },
        ],
    },
    6: {  # Global Systems Inc — recruiter.anna
        "location": "New York, NY",
        "postings": [
            {
                "job_title": "Oracle Fusion Budget Controller",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "4-6 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 120.0, "salary_max": 155.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Configure Oracle Fusion Budgetary Control: budget pools, control levels, tolerance rules, and funds checking integration with Procurement and AP.",
                "start_date": d(14),
            },
            {
                "job_title": "Oracle HCM Goal Management Consultant",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "seniority_level": "3-5 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 112.0, "salary_max": 148.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement Oracle HCM Goal Management: goal plans, goal library, alignment hierarchies, and performance document integration with goal-setting workflows.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle Fusion Integration Architect",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Technical Consultant",
                "seniority_level": "6-10 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 145.0, "salary_max": 185.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Architect Oracle Integration Cloud (OIC) solutions connecting Fusion SaaS with on-premise systems and third-party platforms. REST/SOAP, JSON/XML, and ERP adapter expertise required.",
                "start_date": d(28),
            },
            {
                "job_title": "Oracle EBS DBA Senior Engineer",
                "product_vendor": "Oracle",
                "product_type": "E-Business Suite",
                "job_role": "Oracle Database Administrator",
                "seniority_level": "7-10 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 145000.0, "salary_max": 185000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Administer and tune Oracle EBS R12.2 database environments. Patching, cloning, RAC administration, RMAN backup strategies, and EBS application tier management required.",
                "start_date": d(50),
            },
        ],
    },
    9: {  # Enterprise Solutions LLC — recruiter.diana
        "location": "Chicago, IL",
        "postings": [
            {
                "job_title": "Oracle Fusion AP Automation Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "3-6 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 115.0, "salary_max": 150.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement Oracle Fusion AP with invoice imaging and e-invoicing automation. OCR integration, touchless invoice processing, and payment factory setup experience preferred.",
                "start_date": d(14),
            },
            {
                "job_title": "Oracle Cloud FCCS Consultant",
                "product_vendor": "Oracle",
                "product_type": "Cloud Infrastructure",
                "job_role": "Oracle Analytics Developer",
                "seniority_level": "4-7 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 128.0, "salary_max": 165.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement Oracle FCCS (Financial Consolidation and Close Cloud). Legal entity consolidation, intercompany eliminations, currency translations, and XBRL reporting.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle ERP Cloud Cutover Manager",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Cloud Migration Specialist",
                "seniority_level": "7-10 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 145.0, "salary_max": 185.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Lead Oracle ERP Cloud go-live cutover planning and execution. Run book creation, parallel run coordination, war room facilitation, and hyper-care support management.",
                "start_date": d(35),
            },
            {
                "job_title": "Oracle HCM Payroll Tax Specialist",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle Payroll Cloud Consultant",
                "seniority_level": "5-8 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 132000.0, "salary_max": 168000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Manage Oracle HCM Payroll tax configuration: federal/state withholding, garnishments, year-end W-2/W-2C processing, and tax agency filing reconciliation.",
                "start_date": d(55),
            },
        ],
    },
    12: {  # Oracle Consulting Partners — recruiter.linda
        "location": "Austin, TX",
        "postings": [
            {
                "job_title": "Oracle Cloud AIM Methodology Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "5-8 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 132.0, "salary_max": 168.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Lead Oracle implementations using Oracle AIM or OUM methodology. BP-series documents, RD-series designs, and TE-series test scripts authoring experience required.",
                "start_date": d(14),
            },
            {
                "job_title": "Oracle Fusion Benefits Consultant",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "seniority_level": "3-6 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 118.0, "salary_max": 155.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Configure Oracle HCM Benefits Cloud: plan types, option types, eligibility profiles, rates, and US benefits carrier integrations (ANSI 834 format).",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle RAC/Exadata DBA",
                "product_vendor": "Oracle",
                "product_type": "Database",
                "job_role": "Oracle Database Administrator",
                "seniority_level": "6-10 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 140.0, "salary_max": 178.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Manage Oracle RAC and Exadata database systems. Grid infrastructure, ASM, Data Guard, and RMAN backup management. OCP DBA certification preferred.",
                "start_date": d(28),
            },
            {
                "job_title": "Oracle Fusion Payables Manager",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "7-11 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 145000.0, "salary_max": 185000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Manage Oracle Fusion Payables operations including supplier management, invoice processing, payment runs, and month-end close activities for large enterprise environments.",
                "start_date": d(60),
            },
        ],
    },
    15: {  # CloudTech Innovations — recruiter.brian
        "location": "Seattle, WA",
        "postings": [
            {
                "job_title": "Oracle Integration Cloud (OIC) Developer",
                "product_vendor": "Oracle",
                "product_type": "Cloud Infrastructure",
                "job_role": "Oracle Fusion Technical Consultant",
                "seniority_level": "3-6 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 120.0, "salary_max": 155.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Build and maintain Oracle Integration Cloud (OIC) integrations. REST/SOAP adapters, scheduled orchestrations, file-based processing, and OIC monitoring experience required.",
                "start_date": d(14),
            },
            {
                "job_title": "Oracle Fusion OTBI Report Developer",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Analytics Developer",
                "seniority_level": "3-5 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 112.0, "salary_max": 148.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Create Oracle Transactional Business Intelligence (OTBI) and BI Publisher reports for Fusion Finance, HCM, and SCM modules. OBIEE and Smart View proficiency preferred.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle Fusion HCM Core HR Consultant",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "seniority_level": "4-7 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 125.0, "salary_max": 162.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Configure Oracle HCM Core HR: enterprise structures, workforce structures, HR actions/action reasons, HCM Experience Design Studio, and data loader (HDL).",
                "start_date": d(28),
            },
            {
                "job_title": "Oracle Cloud Security Architecture Lead",
                "product_vendor": "Oracle",
                "product_type": "Cloud Infrastructure",
                "job_role": "Oracle Cloud Infrastructure Architect",
                "seniority_level": "8-12 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 152000.0, "salary_max": 192000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Design and govern Oracle Cloud (OCI + SaaS) security architecture: identity domains, IDCS, MFA policies, data classification, and Oracle Cloud Guard monitoring.",
                "start_date": d(60),
            },
        ],
    },
    18: {  # Digital Transform Group — recruiter.mike
        "location": "Boston, MA",
        "postings": [
            {
                "job_title": "Oracle Fusion Workflow Automation Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Technical Consultant",
                "seniority_level": "4-6 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 125.0, "salary_max": 162.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Build Oracle BPM workflow automations for Fusion SaaS approvals. Oracle Human Workflow, AMX, and Approval Management Engine (AME) configuration experience required.",
                "start_date": d(14),
            },
            {
                "job_title": "Oracle EBS Workflow Developer",
                "product_vendor": "Oracle",
                "product_type": "E-Business Suite",
                "job_role": "Oracle EBS Technical Consultant",
                "seniority_level": "4-7 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 118.0, "salary_max": 155.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Design and develop Oracle EBS Workflow customizations. Notification mailer setup, workflow attribute management, and PL/SQL procedure-based workflow event triggers.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle OCI Security Engineer",
                "product_vendor": "Oracle",
                "product_type": "Cloud Infrastructure",
                "job_role": "Oracle Cloud Infrastructure Architect",
                "seniority_level": "5-8 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 135.0, "salary_max": 172.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Harden Oracle Cloud Infrastructure environments: IAM policies, security zones, Cloud Guard, WAF, key management (KMS), and vulnerability scanning.",
                "start_date": d(28),
            },
            {
                "job_title": "Oracle Fusion HCM Absence Management Lead",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "seniority_level": "5-8 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 138000.0, "salary_max": 175000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Lead Oracle Absence Management implementations: absence types, plans, eligibility, accrual formulas, FMLA configuration, and integration with Time & Labor and Payroll.",
                "start_date": d(60),
            },
        ],
    },
}


def main():
    with Session(engine) as session:
        added_total = 0

        for company_id, data in POSTINGS_BY_COMPANY_ID.items():
            co = session.get(Company, company_id)
            if not co:
                print(f"[WARN] Company ID {company_id} not found, skipping.")
                continue

            existing = session.exec(
                select(JobPosting).where(JobPosting.company_id == company_id)
            ).all()

            if len(existing) >= 4:
                print(f"[SKIP] company_id={company_id} ({co.company_name}) already has {len(existing)} postings.")
                continue

            print(f"\n[+] company_id={company_id} ({co.company_name}) — adding {len(data['postings'])} postings:")
            for pd in data["postings"]:
                posting = JobPosting(
                    company_id=company_id,
                    job_title=pd["job_title"],
                    product_vendor=pd["product_vendor"],
                    product_type=pd["product_type"],
                    job_role=pd["job_role"],
                    seniority_level=pd["seniority_level"],
                    worktype=pd["worktype"],
                    location=data["location"],
                    employment_type=pd["employment_type"],
                    start_date=pd["start_date"],
                    salary_min=pd["salary_min"],
                    salary_max=pd["salary_max"],
                    salary_currency=pd["salary_currency"],
                    job_description=pd["job_description"],
                    status=JobPostingStatus.ACTIVE,
                )
                session.add(posting)
                added_total += 1
                print(f"    • {pd['job_title']}")

            session.commit()

        print(f"\n{'='*60}")
        print(f"Total new postings added: {added_total}")

        # Final verification
        print("\nFinal verification — all company records:")
        from collections import defaultdict
        companies = session.exec(select(Company)).all()
        all_ok = True
        for co in companies:
            count = len(session.exec(select(JobPosting).where(JobPosting.company_id == co.id)).all())
            status = "OK" if count >= 4 else f"NEEDS {4 - count} MORE"
            if count < 4:
                all_ok = False
            print(f"  company_id={co.id} ({co.company_name}): {count} posting(s) [{status}]")

        print()
        print("ALL company records have >= 4 postings!" if all_ok else "Some records still need postings.")


if __name__ == "__main__":
    main()
