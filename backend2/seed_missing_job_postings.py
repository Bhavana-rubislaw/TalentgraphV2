"""
Add 4 job postings to every company record that currently has 0 postings.
Follows the same Oracle-themed pattern as existing seed data.
"""
from datetime import date, timedelta
from sqlmodel import Session, select
from app.database import engine
from app.models import Company, JobPosting, JobPostingStatus, WorkType, EmploymentType, CurrencyType

# base date offsets (days from today)
TODAY = date.today()

def d(offset: int) -> str:
    return (TODAY + timedelta(days=offset)).isoformat()


# ─────────────────────────────────────────────────────────────────────────────
# Template postings per company NAME (each company_id that is under this name
# will get a unique slice of 4 postings from this pool).
# ─────────────────────────────────────────────────────────────────────────────

COMPANY_POSTINGS = {
    "TechCorp Solutions": {
        "location": "San Francisco, CA",
        "postings": [
            # — block A (for company_id 2 / hr.jane) —
            {
                "job_title": "Oracle CX Sales Cloud Consultant",
                "product_vendor": "Oracle",
                "product_type": "CX Cloud",
                "job_role": "Oracle CX Sales Consultant",
                "seniority_level": "3-5 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 120.0, "salary_max": 155.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement and configure Oracle CX Sales Cloud solutions for enterprise clients. Experience with CPQ, Sales Force Automation, and Opportunity Management required.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle CPQ Cloud Developer",
                "product_vendor": "Oracle",
                "product_type": "CX Cloud",
                "job_role": "Oracle CPQ Developer",
                "seniority_level": "4-6 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 130.0, "salary_max": 165.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Develop and customize Oracle CPQ Cloud solutions. BML/BML scripting, product configurator rules, and commerce process experience required.",
                "start_date": d(28),
            },
            {
                "job_title": "Oracle Retail Cloud Implementation Lead",
                "product_vendor": "Oracle",
                "product_type": "Retail Cloud",
                "job_role": "Oracle Retail Consultant",
                "seniority_level": "5-8 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 140.0, "salary_max": 175.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Lead Oracle Retail Merchandising System (RMS) and Oracle Retail Management (ORM) implementations. Full project lifecycle experience required.",
                "start_date": d(35),
            },
            {
                "job_title": "Oracle Fusion Supply Chain Manager",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Supply Chain Consultant",
                "seniority_level": "6-9 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 135000.0, "salary_max": 175000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Manage end-to-end Oracle Fusion Supply Chain implementations including Procurement, Inventory, Order Management and Manufacturing modules.",
                "start_date": d(45),
            },
            # — block B (for company_id 3 / recruiter.robert) —
            {
                "job_title": "Oracle OAC (Analytics Cloud) Developer",
                "product_vendor": "Oracle",
                "product_type": "Cloud Infrastructure",
                "job_role": "Oracle Analytics Developer",
                "seniority_level": "3-6 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 115.0, "salary_max": 150.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Build dashboards, data flows, and machine-learning models in Oracle Analytics Cloud. Strong data visualization and DV Desktop experience preferred.",
                "start_date": d(14),
            },
            {
                "job_title": "Oracle BI Publisher Specialist",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle BI Developer",
                "seniority_level": "4-7 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 125.0, "salary_max": 160.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Design and develop Oracle BI Publisher reports, data templates, and layouts for Fusion Cloud applications. RTF template development experience required.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle HCM Recruiting Cloud Lead",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "seniority_level": "5-8 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 130.0, "salary_max": 168.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement Oracle HCM Recruiting (IRC) module. Configure requisitions, candidate lifecycle, and integration with LinkedIn and HRMS systems.",
                "start_date": d(30),
            },
            {
                "job_title": "Oracle E-Commerce B2B Architect",
                "product_vendor": "Oracle",
                "product_type": "CX Cloud",
                "job_role": "Oracle Commerce Cloud Architect",
                "seniority_level": "7-10 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 150000.0, "salary_max": 195000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Architect Oracle Commerce Cloud B2B solutions for enterprise clients. API-led integration, headless commerce, and personalization engine experience required.",
                "start_date": d(60),
            },
        ],
    },

    "Global Systems Inc": {
        "location": "New York, NY",
        "postings": [
            # — block A (hr.mark) —
            {
                "job_title": "Oracle Fusion Accounts Payable Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "3-5 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 115.0, "salary_max": 148.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement Oracle Fusion Accounts Payable module, including supplier management, invoice processing, and payment runs. Implementation methodology experience required.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle HCM Benefits Cloud Specialist",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "seniority_level": "4-6 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 120.0, "salary_max": 158.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Configure Oracle HCM Benefits module: benefit plans, eligibility rules, life events, and open enrollment. ACA reporting knowledge preferred.",
                "start_date": d(28),
            },
            {
                "job_title": "Oracle EBS Inventory Consultant",
                "product_vendor": "Oracle",
                "product_type": "E-Business Suite",
                "job_role": "Oracle EBS Functional Consultant",
                "seniority_level": "5-8 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 130.0, "salary_max": 165.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Support and enhance Oracle EBS Inventory (INV), WMS, and Cost Management modules. R12 implementation and support experience required.",
                "start_date": d(35),
            },
            {
                "job_title": "Oracle Cloud Senior Technical Architect",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Technical Consultant",
                "seniority_level": "8-12 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 155000.0, "salary_max": 195000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Lead technical design for Oracle Cloud integrations and extensions: FBDI, REST APIs, SOAP, BIP reports, and VBCS. Solution architecture experience mandatory.",
                "start_date": d(50),
            },
            # — block B (recruiter.anna) —
            {
                "job_title": "Oracle Fusion General Ledger Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "4-7 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 125.0, "salary_max": 162.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement Oracle Fusion General Ledger: COA design, period close, subledger accounting, intercompany, and financial reporting with OTBI and Smart View.",
                "start_date": d(14),
            },
            {
                "job_title": "Oracle Fusion Fixed Assets Specialist",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "3-5 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 110.0, "salary_max": 145.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Configure Oracle Fusion Fixed Assets module: asset books, depreciation methods, mass additions, and reconciliation reports.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle SOA Integration Developer",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Technical Consultant",
                "seniority_level": "5-8 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 135.0, "salary_max": 170.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Design and build Oracle SOA/OIC integrations. Experience with BPEL, Mediator, Business Rules, and Oracle Integration Cloud (OIC) required.",
                "start_date": d(28),
            },
            {
                "job_title": "Oracle HCM Workforce Management Lead",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "seniority_level": "6-9 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 140000.0, "salary_max": 180000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Lead Oracle Workforce Management implementations including Time & Labor, Absence Management, and workforce scheduling for large enterprise clients.",
                "start_date": d(55),
            },
        ],
    },

    "Enterprise Solutions LLC": {
        "location": "Chicago, IL",
        "postings": [
            # — block A (hr.tom) —
            {
                "job_title": "Oracle Fusion Project Portfolio Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion PPM Consultant",
                "seniority_level": "4-7 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 125.0, "salary_max": 160.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement Oracle Fusion PPM: Project Costing, Project Billing, Project Contracts, and Resource Management modules. PMP certification preferred.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle Procurement Cloud Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Supply Chain Consultant",
                "seniority_level": "3-6 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 115.0, "salary_max": 150.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Configure Oracle Procurement Cloud: Purchasing, Self-Service Procurement, Sourcing, Supplier Portal, and Supplier Qualification Management.",
                "start_date": d(28),
            },
            {
                "job_title": "Oracle EBS HRMS Consultant",
                "product_vendor": "Oracle",
                "product_type": "E-Business Suite",
                "job_role": "Oracle EBS Functional Consultant",
                "seniority_level": "5-8 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 128.0, "salary_max": 165.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Support Oracle EBS HRMS modules: Core HR, Payroll, Self-Service HR, Learning Management, and iRecruitment. R12.2.x experience required.",
                "start_date": d(35),
            },
            {
                "job_title": "Oracle Cloud Principal Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Cloud Migration Specialist",
                "seniority_level": "10-15 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 160000.0, "salary_max": 200000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Lead Oracle Cloud transformation programs for Fortune 500 clients. Full suite ERP experience (Financials, SCM, HCM, PPM) and pre-sales capabilities required.",
                "start_date": d(60),
            },
            # — block B (recruiter.diana) —
            {
                "job_title": "Oracle Fusion Receivables Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "3-5 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 112.0, "salary_max": 148.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Configure Oracle Fusion Receivables: customer invoicing, receipts, collections, credit management, and revenue recognition under ASC 606.",
                "start_date": d(14),
            },
            {
                "job_title": "Oracle Identity Governance Specialist",
                "product_vendor": "Oracle",
                "product_type": "Cloud Infrastructure",
                "job_role": "Oracle Cloud Infrastructure Architect",
                "seniority_level": "5-8 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 135.0, "salary_max": 175.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement Oracle Identity Governance (OIG) and Oracle Access Manager (OAM). LDAP, RBAC, SSO, and MFA configuration experience required.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle Fusion Manufacturing Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Supply Chain Consultant",
                "seniority_level": "4-7 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 128.0, "salary_max": 165.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Configure Oracle Fusion Manufacturing and Production Scheduling modules. Discrete and process manufacturing experience, plus ASCP familiarity preferred.",
                "start_date": d(30),
            },
            {
                "job_title": "Oracle Data Warehouse Architect",
                "product_vendor": "Oracle",
                "product_type": "Database",
                "job_role": "Oracle Database Administrator",
                "seniority_level": "8-12 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 148000.0, "salary_max": 188000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Design Oracle Exadata and Autonomous Data Warehouse architectures. ETL pipelines, partitioning strategies, and Oracle GoldenGate replication experience required.",
                "start_date": d(50),
            },
        ],
    },

    "Oracle Consulting Partners": {
        "location": "Austin, TX",
        "postings": [
            # — block A (hr.james) —
            {
                "job_title": "Oracle Fusion Expense Management Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "3-5 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 115.0, "salary_max": 148.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Configure Oracle Fusion Expenses: expense policies, approval workflows, corporate card integration, and reimbursement processing.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle HCM Compensation Cloud Specialist",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "seniority_level": "4-7 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 125.0, "salary_max": 162.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement Oracle HCM Compensation module: salary plans, merit matrices, bonus plans, stock options, and total compensation statements.",
                "start_date": d(28),
            },
            {
                "job_title": "Oracle EBS Order Management Consultant",
                "product_vendor": "Oracle",
                "product_type": "E-Business Suite",
                "job_role": "Oracle EBS Functional Consultant",
                "seniority_level": "5-8 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 132.0, "salary_max": 168.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Support Oracle EBS Order Management (OM) and Shipping modules. Pricing, availability check, ATP logic, and OM Workflow configuration experience required.",
                "start_date": d(35),
            },
            {
                "job_title": "Oracle Cloud ERP Program Manager",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Cloud Migration Specialist",
                "seniority_level": "10-14 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 165000.0, "salary_max": 205000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Program manage large-scale Oracle Cloud ERP transformation initiatives. Stakeholder management, risk mitigation, and Oracle AIM/OUM methodology experience required.",
                "start_date": d(60),
            },
            # — block B (recruiter.linda) —
            {
                "job_title": "Oracle Fusion Cash Management Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "3-6 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 118.0, "salary_max": 152.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Configure Oracle Fusion Cash Management: bank statements, bank reconciliation, position and forecast reports, and lockbox processing.",
                "start_date": d(14),
            },
            {
                "job_title": "Oracle APEX Developer",
                "product_vendor": "Oracle",
                "product_type": "Database",
                "job_role": "Oracle EBS Technical Consultant",
                "seniority_level": "4-7 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 122.0, "salary_max": 158.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Build enterprise applications using Oracle APEX. PL/SQL, JavaScript, REST APIs, and Oracle APEX 22+ features development experience required.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle HCM Learning Cloud Consultant",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "seniority_level": "3-5 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 115.0, "salary_max": 148.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement Oracle HCM Learning module: learning catalog, learning journeys, certifications, compliance training, and integration with external LMS.",
                "start_date": d(28),
            },
            {
                "job_title": "Oracle GoldenGate Replication Architect",
                "product_vendor": "Oracle",
                "product_type": "Database",
                "job_role": "Oracle Database Administrator",
                "seniority_level": "7-10 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 145000.0, "salary_max": 185000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Architect and implement Oracle GoldenGate for real-time data replication and CDC. Heterogeneous replication and zero-downtime migration experience required.",
                "start_date": d(50),
            },
        ],
    },

    "CloudTech Innovations": {
        "location": "Seattle, WA",
        "postings": [
            # — block A (hr.chris) —
            {
                "job_title": "Oracle Cloud AR Revenue Recognition Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "4-7 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 128.0, "salary_max": 165.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement Oracle Revenue Management Cloud (RMCS) for ASC 606 and IFRS 15 compliance. POB analysis, SSP determination, and allocation rule experience required.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle PaaS Extension Developer",
                "product_vendor": "Oracle",
                "product_type": "Cloud Infrastructure",
                "job_role": "Oracle Fusion Technical Consultant",
                "seniority_level": "4-6 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 130.0, "salary_max": 168.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Build Oracle Cloud extensions using VBCS, Oracle JET, and Application Composer. REST API integrations and Oracle SaaS extension frameworks required.",
                "start_date": d(28),
            },
            {
                "job_title": "Oracle Fusion Budgeting & Planning Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "5-8 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 135.0, "salary_max": 172.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Configure Oracle Fusion Budgetary Control and Hyperion Planning integration. Encumbrance accounting, budget transfer, and EPBCS experience preferred.",
                "start_date": d(35),
            },
            {
                "job_title": "Oracle Cloud DevOps Engineer",
                "product_vendor": "Oracle",
                "product_type": "Cloud Infrastructure",
                "job_role": "Oracle Cloud Infrastructure Architect",
                "seniority_level": "5-8 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 135000.0, "salary_max": 175000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Manage Oracle Cloud Infrastructure (OCI) deployments using Terraform, Ansible, and OCI DevOps pipelines. Container Registry, OKE, and Functions experience preferred.",
                "start_date": d(50),
            },
            # — block B (recruiter.brian) —
            {
                "job_title": "Oracle Fusion Tax Cloud Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "3-6 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 118.0, "salary_max": 152.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Configure Oracle Tax Cloud (Vertex/Avalara integration) within Oracle Fusion Financials. Multi-jurisdiction tax rules and withholding tax setup experience required.",
                "start_date": d(14),
            },
            {
                "job_title": "Oracle EBS Purchasing Consultant",
                "product_vendor": "Oracle",
                "product_type": "E-Business Suite",
                "job_role": "Oracle EBS Functional Consultant",
                "seniority_level": "4-7 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 122.0, "salary_max": 158.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Configure Oracle EBS Purchasing (PO), iProcurement, and Sourcing modules. Approval hierarchies, blanket agreements, and catalog management experience required.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle Field Service Cloud Consultant",
                "product_vendor": "Oracle",
                "product_type": "CX Cloud",
                "job_role": "Oracle CX Sales Consultant",
                "seniority_level": "3-5 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 115.0, "salary_max": 148.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement Oracle Field Service (TOA) for work order management, scheduling optimization, and mobile field technician workflows.",
                "start_date": d(28),
            },
            {
                "job_title": "Oracle Autonomous Database Administrator",
                "product_vendor": "Oracle",
                "product_type": "Cloud Infrastructure",
                "job_role": "Oracle Cloud DBA",
                "seniority_level": "6-10 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 140000.0, "salary_max": 180000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Administer Oracle Autonomous Transaction Processing (ATP) and Autonomous Data Warehouse (ADW). Performance tuning, security configuration, and disaster recovery planning required.",
                "start_date": d(55),
            },
        ],
    },

    "Digital Transform Group": {
        "location": "Boston, MA",
        "postings": [
            # — block A (hr.amanda) —
            {
                "job_title": "Oracle Fusion Intercompany Accounting Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "4-7 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 128.0, "salary_max": 165.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Configure Oracle Fusion Intercompany Accounting: intercompany transactions, netting, reconciliation, and multi-ledger consolidation reporting.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle HCM Talent Management Consultant",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle HCM Cloud Consultant",
                "seniority_level": "3-6 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 118.0, "salary_max": 155.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Implement Oracle HCM Talent Management: performance goals, performance documents, talent review, succession planning, and career development.",
                "start_date": d(28),
            },
            {
                "job_title": "Oracle ERP Cloud Security Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Technical Consultant",
                "seniority_level": "5-8 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 138.0, "salary_max": 175.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Design Oracle Cloud ERP security: role-based access control, data security policies, segregation of duties (SoD), and audit trail configuration.",
                "start_date": d(35),
            },
            {
                "job_title": "Oracle Digital Transformation Director",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Cloud Migration Specialist",
                "seniority_level": "12-18 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 175000.0, "salary_max": 220000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Lead Oracle digital transformation engagements for public sector and financial services clients. Practice building, team management, and executive-level client engagement skills required.",
                "start_date": d(75),
            },
            # — block B (recruiter.mike) —
            {
                "job_title": "Oracle Fusion Lease Accounting Consultant",
                "product_vendor": "Oracle",
                "product_type": "Fusion Cloud",
                "job_role": "Oracle Fusion Functional Consultant",
                "seniority_level": "3-5 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 120.0, "salary_max": 155.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Configure Oracle Lease Accounting Cloud for ASC 842 / IFRS 16 compliance. Lease classification, amortization schedules, and disclosure reporting experience required.",
                "start_date": d(14),
            },
            {
                "job_title": "Oracle EBS Technical PL/SQL Developer",
                "product_vendor": "Oracle",
                "product_type": "E-Business Suite",
                "job_role": "Oracle EBS Technical Consultant",
                "seniority_level": "4-7 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 122.0, "salary_max": 158.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Develop Oracle EBS customizations using PL/SQL, Forms, Reports, BI Publisher, and Oracle Workflow. RICEW deliverables and MD70/MD120 documentation experience required.",
                "start_date": d(21),
            },
            {
                "job_title": "Oracle OCI Network Engineer",
                "product_vendor": "Oracle",
                "product_type": "Cloud Infrastructure",
                "job_role": "Oracle Cloud Infrastructure Architect",
                "seniority_level": "5-8 years",
                "worktype": WorkType.REMOTE,
                "employment_type": EmploymentType.CONTRACT,
                "salary_min": 132.0, "salary_max": 170.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Design and manage Oracle Cloud Infrastructure networking: VCN, subnets, security lists, FastConnect, VPN, load balancers, and DNS. OCI Network Professional certification preferred.",
                "start_date": d(28),
            },
            {
                "job_title": "Oracle Fusion HCM Global Payroll Lead",
                "product_vendor": "Oracle",
                "product_type": "HCM Cloud",
                "job_role": "Oracle Payroll Cloud Consultant",
                "seniority_level": "7-11 years",
                "worktype": WorkType.HYBRID,
                "employment_type": EmploymentType.FT,
                "salary_min": 148000.0, "salary_max": 188000.0,
                "salary_currency": CurrencyType.USD,
                "job_description": "Lead Oracle Global Payroll implementations across multiple countries. Fast Formula, Payroll Costing, retro pay, and year-end processing in multiple jurisdictions required.",
                "start_date": d(60),
            },
        ],
    },
}


def get_postings_for_company_record(company_name: str, block_index: int) -> list:
    """Return 4 postings from the correct block for this company record."""
    pool = COMPANY_POSTINGS.get(company_name, {}).get("postings", [])
    start = block_index * 4
    return pool[start:start + 4]


def main():
    with Session(engine) as session:
        companies = session.exec(select(Company)).all()
        print(f"Total company records: {len(companies)}")

        # Group by company_name and track which ones have 0 postings
        from collections import defaultdict
        name_groups: dict[str, list] = defaultdict(list)
        for co in companies:
            name_groups[co.company_name].append(co)

        added_total = 0

        for company_name, co_list in name_groups.items():
            print(f"\n── {company_name} ({len(co_list)} records) ──")
            block_idx = 0  # block 0 = first set of 4, block 1 = second set of 4, etc.

            for co in co_list:
                existing = session.exec(
                    select(JobPosting).where(JobPosting.company_id == co.id)
                ).all()

                if len(existing) >= 4:
                    print(f"  [SKIP] company_id={co.id} already has {len(existing)} posting(s)")
                    # Advance block index so next empty record gets different postings
                    block_idx += 1
                    continue

                postings_to_add = get_postings_for_company_record(company_name, block_idx)
                if not postings_to_add:
                    print(f"  [WARN] No postings template for block {block_idx} of '{company_name}'")
                    block_idx += 1
                    continue

                location = COMPANY_POSTINGS.get(company_name, {}).get("location", "Remote")

                for pd in postings_to_add:
                    posting = JobPosting(
                        company_id=co.id,
                        job_title=pd["job_title"],
                        product_vendor=pd["product_vendor"],
                        product_type=pd["product_type"],
                        job_role=pd["job_role"],
                        seniority_level=pd["seniority_level"],
                        worktype=pd["worktype"],
                        location=pd.get("location_override", location),
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

                session.commit()
                print(f"  [+] company_id={co.id} — added {len(postings_to_add)} posting(s):")
                for pd in postings_to_add:
                    print(f"       • {pd['job_title']}")

                block_idx += 1

        print(f"\n{'='*60}")
        print(f"Total new postings added: {added_total}")

        # Final verification
        print("\nFinal count per company record:")
        for co in session.exec(select(Company)).all():
            count = len(session.exec(select(JobPosting).where(JobPosting.company_id == co.id)).all())
            status = "OK" if count >= 4 else f"NEEDS {4 - count} MORE"
            print(f"  company_id={co.id} ({co.company_name}): {count} posting(s) [{status}]")


if __name__ == "__main__":
    main()
