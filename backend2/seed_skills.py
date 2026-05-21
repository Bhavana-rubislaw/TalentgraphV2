"""
Add random/relevant skills to:
1. All job profiles (boost to ~10 skills per profile)
2. All 72 job postings (currently have 0 skills)
"""
import random
from sqlmodel import Session, select
from app.database import engine
from app.models import JobProfile, Skill, JobPosting, JobPostingSkill

random.seed(42)  # reproducible

# ─────────────────────────────────────────────────────────────────────────────
# SKILL POOLS — keyed by topic area
# ─────────────────────────────────────────────────────────────────────────────

# ── Job Profile skill pools (proficiency 1-5) ────────────────────────────────

PROFILE_SKILL_POOLS = {
    "oracle_finance": {
        "technical": [
            "Oracle Fusion Financials", "Oracle General Ledger", "Oracle Accounts Payable",
            "Oracle Accounts Receivable", "Oracle Fixed Assets", "Oracle Cash Management",
            "Oracle Tax Cloud", "OTBI Reporting", "SmartView", "BI Publisher",
            "FBDI Data Load", "Financial Close", "Oracle Fusion Intercompany",
            "Oracle Budgetary Control", "Oracle Revenue Management",
        ],
        "functional": [
            "Month-End Close", "Financial Reporting", "Audit Compliance",
            "Chart of Accounts Design", "Journal Entries", "Reconciliation",
            "GAAP/IFRS", "Internal Controls", "SOX Compliance",
        ],
        "soft": [
            "Stakeholder Management", "Communication", "Problem Solving",
            "Attention to Detail", "Analytical Thinking",
        ],
    },
    "oracle_hcm": {
        "technical": [
            "Oracle HCM Cloud", "Oracle Core HR", "Oracle Payroll Cloud",
            "Oracle Benefits Cloud", "Oracle Absence Management", "Oracle Recruiting Cloud",
            "Oracle Talent Management", "Oracle Learning Cloud", "Oracle Compensation",
            "Oracle HCM Data Loader (HDL)", "Oracle Fast Formula",
            "HCM Experience Design Studio", "Oracle Workforce Management",
        ],
        "functional": [
            "HR Policies", "Payroll Processing", "Benefits Administration",
            "Talent Acquisition", "Performance Management", "Succession Planning",
            "Workforce Analytics", "Labour Law Compliance",
        ],
        "soft": [
            "Communication", "Empathy", "Coaching", "Leadership",
            "Cross-functional Collaboration",
        ],
    },
    "oracle_dba": {
        "technical": [
            "Oracle Database 19c", "Oracle RAC", "Oracle Data Guard", "Oracle RMAN",
            "Oracle ASM", "Oracle Exadata", "Oracle GoldenGate", "PL/SQL",
            "SQL Performance Tuning", "Oracle AWR/ASH", "Oracle Enterprise Manager",
            "Oracle Autonomous Database", "Oracle Multitenant (CDB/PDB)",
            "Database Migration", "Backup & Recovery",
        ],
        "functional": [
            "Capacity Planning", "Disaster Recovery Planning", "Change Management",
            "Database Security", "High Availability Architecture",
        ],
        "soft": [
            "Problem Solving", "Attention to Detail", "Documentation",
            "Time Management", "Analytical Thinking",
        ],
    },
    "oracle_ebs": {
        "technical": [
            "Oracle EBS R12", "Oracle Forms", "Oracle Reports", "Oracle Workflow",
            "PL/SQL", "Oracle RICEW", "AME (Approval Management Engine)",
            "Oracle BI Publisher", "Oracle XML Gateway", "Oracle Web ADI",
            "Oracle Concurrent Manager", "Discoverer", "Oracle MOAC",
        ],
        "functional": [
            "EBS Customizations", "System Upgrades", "Patch Management",
            "CRP Testing", "UAT Facilitation", "Data Migration",
        ],
        "soft": [
            "Analytical Thinking", "Documentation", "Teamwork",
            "Client Relationship", "Stakeholder Management",
        ],
    },
    "oracle_scm": {
        "technical": [
            "Oracle Fusion SCM", "Oracle Procurement Cloud", "Oracle Inventory Cloud",
            "Oracle Order Management Cloud", "Oracle Manufacturing Cloud",
            "Oracle Planning Cloud", "Oracle Fusion Logistics",
            "Oracle Warehouse Management", "Oracle EBS Purchasing",
            "Oracle EBS Order Management", "Oracle EBS Inventory",
        ],
        "functional": [
            "Supply Chain Optimization", "Demand Planning", "Vendor Management",
            "Inventory Control", "Logistics Coordination", "Procurement Strategy",
        ],
        "soft": [
            "Negotiation", "Problem Solving", "Cross-functional Collaboration",
            "Attention to Detail", "Analytical Thinking",
        ],
    },
    "oracle_cloud_infra": {
        "technical": [
            "Oracle Cloud Infrastructure (OCI)", "OCI Networking", "OCI Compute",
            "OCI Object Storage", "OCI IAM", "OCI DevOps", "Terraform",
            "Ansible", "Oracle Kubernetes Engine (OKE)", "OCI Functions",
            "Oracle Cloud Guard", "OCI Security Zones", "FastConnect",
        ],
        "functional": [
            "Cloud Architecture", "Security Design", "Cost Optimization",
            "Infrastructure as Code", "Disaster Recovery",
        ],
        "soft": [
            "Problem Solving", "Documentation", "Analytical Thinking",
            "Leadership", "Communication",
        ],
    },
    "oracle_integration": {
        "technical": [
            "Oracle Integration Cloud (OIC)", "Oracle SOA Suite", "Oracle BPEL",
            "Oracle Mediator", "REST APIs", "SOAP Web Services", "JSON/XML",
            "Oracle Fusion FBDI", "Oracle File-Based Data Import",
            "Oracle Web Services Manager (OWSM)", "Oracle Service Bus (OSB)",
            "Oracle API Gateway", "Oracle B2B",
        ],
        "functional": [
            "Integration Architecture", "API Design", "Middleware Strategy",
            "Data Mapping", "Error Handling Design",
        ],
        "soft": [
            "Communication", "Problem Solving", "Analytical Thinking",
            "Attention to Detail", "Documentation",
        ],
    },
    "ml_ai": {
        "technical": [
            "Python", "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy",
            "Hugging Face", "LangChain", "OpenAI API", "MLflow", "Kubernetes",
            "Apache Spark", "SQL", "NoSQL", "Jupyter Notebooks", "CUDA",
        ],
        "functional": [
            "Model Training", "Feature Engineering", "Data Pipeline Design",
            "A/B Testing", "Model Deployment", "MLOps",
        ],
        "soft": [
            "Analytical Thinking", "Critical Thinking", "Communication",
            "Problem Solving", "Creativity",
        ],
    },
    "devops": {
        "technical": [
            "Docker", "Kubernetes", "Terraform", "Ansible", "Jenkins",
            "GitHub Actions", "AWS", "Azure", "GCP", "Prometheus", "Grafana",
            "ELK Stack", "Helm", "ArgoCD", "Linux", "Shell Scripting", "Python",
        ],
        "functional": [
            "CI/CD Pipeline Design", "Site Reliability Engineering", "Incident Management",
            "Capacity Planning", "Infrastructure Automation",
        ],
        "soft": [
            "Problem Solving", "Communication", "Teamwork",
            "Resilience", "Attention to Detail",
        ],
    },
    "frontend": {
        "technical": [
            "React", "TypeScript", "JavaScript", "HTML5", "CSS3", "Tailwind CSS",
            "Next.js", "Vite", "Redux", "GraphQL", "REST APIs",
            "Jest", "Playwright", "Storybook", "Webpack",
        ],
        "functional": [
            "UI/UX Collaboration", "Responsive Design", "Accessibility (WCAG)",
            "Performance Optimization", "Component Architecture",
        ],
        "soft": [
            "Creativity", "Attention to Detail", "Communication",
            "Teamwork", "Problem Solving",
        ],
    },
    "backend": {
        "technical": [
            "Python", "FastAPI", "Django", "Node.js", "Java", "Spring Boot",
            "PostgreSQL", "Redis", "MongoDB", "REST APIs", "GraphQL",
            "Docker", "Kubernetes", "AWS", "Microservices", "Message Queues",
        ],
        "functional": [
            "API Design", "Database Optimization", "System Design",
            "Security Best Practices", "Performance Tuning",
        ],
        "soft": [
            "Problem Solving", "Documentation", "Teamwork",
            "Analytical Thinking", "Accountability",
        ],
    },
    "data_science": {
        "technical": [
            "Python", "R", "SQL", "Tableau", "Power BI", "Pandas",
            "Scikit-learn", "Spark", "Snowflake", "dbt", "Airflow",
            "Databricks", "Excel", "Statistics", "A/B Testing",
        ],
        "functional": [
            "Data Analysis", "Statistical Modeling", "Business Intelligence",
            "Data Visualization", "Stakeholder Reporting",
        ],
        "soft": [
            "Analytical Thinking", "Communication", "Problem Solving",
            "Attention to Detail", "Presentation Skills",
        ],
    },
    "security": {
        "technical": [
            "SIEM", "Penetration Testing", "Vulnerability Assessment",
            "Splunk", "Wireshark", "Nessus", "Burp Suite", "Python",
            "Network Security", "Cloud Security", "Zero Trust Architecture",
            "IAM", "PKI", "SOC Operations",
        ],
        "functional": [
            "Incident Response", "Risk Assessment", "Compliance (SOC2/ISO27001)",
            "Threat Intelligence", "Security Architecture",
        ],
        "soft": [
            "Analytical Thinking", "Attention to Detail", "Problem Solving",
            "Communication", "Integrity",
        ],
    },
    "mobile": {
        "technical": [
            "Swift", "SwiftUI", "Objective-C", "UIKit", "Xcode",
            "React Native", "Flutter", "Dart", "Kotlin", "Android SDK",
            "Core Data", "Firebase", "REST APIs", "XCTest", "App Store Connect",
        ],
        "functional": [
            "Mobile UX Design", "App Performance Optimization", "App Store Deployment",
            "Offline-First Architecture", "Push Notifications",
        ],
        "soft": [
            "Creativity", "Attention to Detail", "Problem Solving",
            "Teamwork", "Communication",
        ],
    },
    "product": {
        "technical": [
            "Jira", "Confluence", "Figma", "SQL", "Amplitude",
            "Mixpanel", "Google Analytics", "Roadmunk", "Miro",
            "A/B Testing Tools", "Excel/Google Sheets",
        ],
        "functional": [
            "Product Roadmapping", "User Story Writing", "Sprint Planning",
            "Stakeholder Alignment", "Market Research", "Competitive Analysis",
            "OKR Setting", "Go-to-Market Strategy",
        ],
        "soft": [
            "Leadership", "Communication", "Strategic Thinking",
            "Problem Solving", "Empathy",
        ],
    },
    "blockchain": {
        "technical": [
            "Solidity", "Ethereum", "Web3.js", "Ethers.js", "Hardhat", "Truffle",
            "IPFS", "Smart Contract Auditing", "DeFi Protocols",
            "Layer 2 Solutions", "Rust", "Anchor Framework", "NFT Standards",
        ],
        "functional": [
            "Tokenomics Design", "Smart Contract Architecture",
            "DeFi Protocol Integration", "On-chain Analytics",
        ],
        "soft": [
            "Problem Solving", "Analytical Thinking", "Innovation",
            "Communication", "Attention to Detail",
        ],
    },
    "qa": {
        "technical": [
            "Selenium", "Cypress", "Playwright", "JUnit", "TestNG",
            "Postman", "JMeter", "LoadRunner", "JIRA", "TestRail",
            "Python", "Java", "BDD/Cucumber", "API Testing", "CI/CD Integration",
        ],
        "functional": [
            "Test Planning", "Test Case Design", "Regression Testing",
            "Performance Testing", "UAT Facilitation", "Defect Management",
        ],
        "soft": [
            "Attention to Detail", "Analytical Thinking", "Communication",
            "Teamwork", "Problem Solving",
        ],
    },
    "java": {
        "technical": [
            "Java 17+", "Spring Boot", "Spring Cloud", "Hibernate", "JPA",
            "Maven", "Gradle", "PostgreSQL", "MySQL", "Redis",
            "Kafka", "RabbitMQ", "Docker", "Kubernetes", "AWS", "Microservices",
        ],
        "functional": [
            "System Design", "API Design", "Performance Optimization",
            "Code Review", "Technical Documentation",
        ],
        "soft": [
            "Problem Solving", "Analytical Thinking", "Teamwork",
            "Attention to Detail", "Accountability",
        ],
    },
    "fullstack": {
        "technical": [
            "React", "TypeScript", "Node.js", "Python", "FastAPI",
            "PostgreSQL", "MongoDB", "Redis", "Docker", "AWS",
            "REST APIs", "GraphQL", "Git", "CI/CD", "Linux",
        ],
        "functional": [
            "System Design", "API Design", "Database Design",
            "Agile/Scrum", "Code Review",
        ],
        "soft": [
            "Problem Solving", "Communication", "Teamwork",
            "Adaptability", "Accountability",
        ],
    },
    "cloud_arch": {
        "technical": [
            "AWS", "Azure", "GCP", "Terraform", "Kubernetes",
            "Docker", "Helm", "Cloud Security", "VPC Design",
            "Serverless Architecture", "Event-Driven Architecture",
            "CDN", "Load Balancing", "Auto Scaling", "SRE Practices",
        ],
        "functional": [
            "Cloud Strategy", "Cost Optimization", "Disaster Recovery",
            "Multi-Cloud Architecture", "Cloud Migration",
        ],
        "soft": [
            "Strategic Thinking", "Communication", "Problem Solving",
            "Leadership", "Documentation",
        ],
    },
    "bi": {
        "technical": [
            "Tableau", "Power BI", "SQL", "Python", "Looker",
            "Snowflake", "dbt", "Azure Synapse", "Databricks",
            "Excel", "Google Data Studio", "ETL Design", "Data Modeling",
        ],
        "functional": [
            "Dashboard Design", "Business Requirements Analysis",
            "KPI Definition", "Data Governance", "Reporting Strategy",
        ],
        "soft": [
            "Analytical Thinking", "Communication", "Presentation Skills",
            "Stakeholder Management", "Attention to Detail",
        ],
    },
}

# Map profile keywords → skill pool key
PROFILE_KEYWORD_MAP = [
    (["Oracle Fusion", "Oracle EBS", "Oracle HCM"], {
        "Oracle Fusion - Senior Finance": "oracle_finance",
        "Oracle EBS - Supply Chain": "oracle_ebs",
        "Oracle HCM": "oracle_hcm",
        "Oracle Fusion - Integration": "oracle_integration",
        "Oracle Fusion - Payroll": "oracle_hcm",
        "Oracle DBA": "oracle_dba",
        "Oracle Cloud DBA": "oracle_dba",
        "Database Performance": "oracle_dba",
    }),
]

def get_profile_pool_key(profile: JobProfile) -> str:
    name = profile.profile_name.lower()
    role = (profile.job_role or "").lower()
    vendor = (profile.product_vendor or "").lower()
    combined = f"{name} {role} {vendor}"
    if "oracle" in combined and any(x in combined for x in ["financ", "gl", "ap", "ar", "account"]):
        return "oracle_finance"
    if "oracle" in combined and any(x in combined for x in ["hcm", "payroll", "hr", "talent", "recruit", "absence", "benefit", "compensation", "learning", "workforce"]):
        return "oracle_hcm"
    if "oracle" in combined and any(x in combined for x in ["dba", "database", "rac", "exadata", "goldengate"]):
        return "oracle_dba"
    if "oracle" in combined and any(x in combined for x in ["ebs", "e-business", "form", "report", "ricew"]):
        return "oracle_ebs"
    if "oracle" in combined and any(x in combined for x in ["scm", "supply chain", "inventory", "procurement", "manufacturing", "order management", "logistics"]):
        return "oracle_scm"
    if "oracle" in combined and any(x in combined for x in ["oci", "cloud infra", "infrastructure", "network", "compute"]):
        return "oracle_cloud_infra"
    if "oracle" in combined and any(x in combined for x in ["integration", "oic", "soa", "bpel", "api", "middleware"]):
        return "oracle_integration"
    if "oracle" in combined:
        return "oracle_finance"  # default oracle
    if any(x in combined for x in ["ml", "machine learning", "nlp", "ai ", "tensorflow", "pytorch"]):
        return "ml_ai"
    if any(x in combined for x in ["devops", "sre", "kubernetes", "docker", "terraform"]):
        return "devops"
    if any(x in combined for x in ["frontend", "react", "ux", "ui ", "design"]):
        return "frontend"
    if any(x in combined for x in ["backend", "api developer", "fastapi", "node"]):
        return "backend"
    if any(x in combined for x in ["data scientist", "data science", "analytics", "analyst"]):
        return "data_science"
    if any(x in combined for x in ["security", "penetration", "cissp", "siem"]):
        return "security"
    if any(x in combined for x in ["ios", "mobile", "swift", "android"]):
        return "mobile"
    if any(x in combined for x in ["product manager", "product management", "pm "]):
        return "product"
    if any(x in combined for x in ["blockchain", "solidity", "defi", "web3"]):
        return "blockchain"
    if any(x in combined for x in ["qa", "quality", "automation engineer", "test"]):
        return "qa"
    if any(x in combined for x in ["java"]):
        return "java"
    if any(x in combined for x in ["full stack", "fullstack"]):
        return "fullstack"
    if any(x in combined for x in ["cloud architect"]):
        return "cloud_arch"
    if any(x in combined for x in ["bi analyst", "business intelligence"]):
        return "bi"
    return "backend"  # fallback


def pick_skills(pool: dict, existing_names: set, count: int) -> list:
    """Pick `count` unique skills not already in existing_names."""
    candidates = []
    for category, skills in pool.items():
        for s in skills:
            if s not in existing_names:
                candidates.append((s, category))
    random.shuffle(candidates)
    return candidates[:count]


# ─────────────────────────────────────────────────────────────────────────────
# JOB POSTING skill pools — keyed by oracle product_type + job_role combos
# ─────────────────────────────────────────────────────────────────────────────

POSTING_SKILL_MAP = {
    # (product_type_keyword, role_keyword) → skills list
    # Each entry: (skill_name, category, rating_min, rating_max)
    "fusion_finance": [
        ("Oracle Fusion Financials", "technical", 8, 10),
        ("Oracle General Ledger", "technical", 7, 10),
        ("Oracle Accounts Payable", "technical", 7, 10),
        ("Oracle Accounts Receivable", "technical", 7, 9),
        ("OTBI Reporting", "technical", 6, 9),
        ("BI Publisher", "technical", 6, 9),
        ("SmartView / EPM", "technical", 6, 8),
        ("FBDI Data Load", "technical", 7, 9),
        ("Financial Close", "technical", 7, 9),
        ("Chart of Accounts Design", "technical", 6, 8),
        ("GAAP / IFRS", "technical", 7, 9),
        ("SOX Compliance", "technical", 6, 8),
        ("Oracle Tax Cloud", "technical", 6, 8),
        ("Oracle Cash Management", "technical", 6, 8),
        ("Stakeholder Management", "soft", 7, 9),
        ("Communication", "soft", 7, 9),
        ("Problem Solving", "soft", 7, 9),
        ("Analytical Thinking", "soft", 7, 9),
        ("Attention to Detail", "soft", 8, 10),
    ],
    "fusion_scm": [
        ("Oracle Fusion SCM", "technical", 8, 10),
        ("Oracle Procurement Cloud", "technical", 7, 10),
        ("Oracle Order Management Cloud", "technical", 7, 10),
        ("Oracle Inventory Cloud", "technical", 7, 9),
        ("Oracle Manufacturing Cloud", "technical", 6, 9),
        ("Oracle Planning Cloud", "technical", 6, 8),
        ("Supply Chain Management", "technical", 7, 9),
        ("FBDI Data Load", "technical", 6, 8),
        ("Oracle Integration Cloud (OIC)", "technical", 6, 8),
        ("Vendor Management", "technical", 6, 8),
        ("Cross-functional Collaboration", "soft", 7, 9),
        ("Problem Solving", "soft", 7, 9),
        ("Negotiation", "soft", 6, 8),
        ("Analytical Thinking", "soft", 7, 9),
    ],
    "hcm": [
        ("Oracle HCM Cloud", "technical", 8, 10),
        ("Oracle Core HR", "technical", 7, 10),
        ("Oracle Payroll Cloud", "technical", 7, 10),
        ("Oracle Benefits Cloud", "technical", 7, 9),
        ("Oracle Talent Management", "technical", 7, 9),
        ("Oracle Recruiting Cloud", "technical", 6, 9),
        ("Oracle HCM Data Loader (HDL)", "technical", 7, 9),
        ("Oracle Fast Formula", "technical", 6, 9),
        ("Oracle Absence Management", "technical", 6, 8),
        ("Oracle Workforce Management", "technical", 6, 8),
        ("HR Compliance", "technical", 6, 8),
        ("Communication", "soft", 7, 9),
        ("Empathy", "soft", 7, 9),
        ("Stakeholder Management", "soft", 7, 9),
        ("Attention to Detail", "soft", 8, 10),
        ("Problem Solving", "soft", 7, 9),
    ],
    "database": [
        ("Oracle Database Administration", "technical", 8, 10),
        ("PL/SQL", "technical", 8, 10),
        ("SQL Performance Tuning", "technical", 8, 10),
        ("Oracle RAC", "technical", 7, 9),
        ("Oracle Data Guard", "technical", 7, 9),
        ("Oracle RMAN", "technical", 7, 9),
        ("Oracle ASM", "technical", 7, 9),
        ("Oracle Exadata", "technical", 6, 9),
        ("Oracle AWR / ASH Analysis", "technical", 7, 9),
        ("Oracle Enterprise Manager (OEM)", "technical", 6, 8),
        ("Database Security", "technical", 7, 9),
        ("Backup & Recovery Planning", "technical", 7, 9),
        ("Analytical Thinking", "soft", 7, 9),
        ("Problem Solving", "soft", 7, 9),
        ("Attention to Detail", "soft", 8, 10),
        ("Documentation", "soft", 6, 8),
    ],
    "ebs": [
        ("Oracle E-Business Suite R12", "technical", 8, 10),
        ("Oracle Forms", "technical", 7, 9),
        ("Oracle Reports", "technical", 7, 9),
        ("PL/SQL", "technical", 8, 10),
        ("Oracle Workflow", "technical", 7, 9),
        ("AME (Approval Management Engine)", "technical", 6, 8),
        ("Oracle RICEW Components", "technical", 7, 9),
        ("Oracle BI Publisher", "technical", 7, 9),
        ("Oracle Concurrent Manager", "technical", 6, 8),
        ("Oracle Web ADI", "technical", 6, 8),
        ("Data Migration", "technical", 7, 9),
        ("UAT Facilitation", "technical", 6, 8),
        ("Analytical Thinking", "soft", 7, 9),
        ("Problem Solving", "soft", 7, 9),
        ("Client Relationship", "soft", 7, 9),
        ("Documentation", "soft", 6, 8),
        ("Stakeholder Management", "soft", 7, 9),
    ],
    "cloud_infra": [
        ("Oracle Cloud Infrastructure (OCI)", "technical", 8, 10),
        ("Terraform", "technical", 7, 9),
        ("OCI Networking (VCN / FastConnect)", "technical", 7, 9),
        ("OCI IAM & Identity Domains", "technical", 7, 9),
        ("OCI DevOps Pipelines", "technical", 6, 9),
        ("Oracle Kubernetes Engine (OKE)", "technical", 6, 9),
        ("OCI Cloud Guard & Security Zones", "technical", 7, 9),
        ("OCI Compute & Storage", "technical", 7, 9),
        ("Ansible", "technical", 6, 8),
        ("Linux Administration", "technical", 7, 9),
        ("Cloud Security Architecture", "technical", 7, 9),
        ("Disaster Recovery Planning", "technical", 6, 8),
        ("Problem Solving", "soft", 7, 9),
        ("Documentation", "soft", 6, 8),
        ("Analytical Thinking", "soft", 7, 9),
    ],
    "cx_cloud": [
        ("Oracle CX Sales Cloud", "technical", 8, 10),
        ("Oracle CPQ Cloud", "technical", 7, 9),
        ("Oracle Field Service (TOA)", "technical", 6, 9),
        ("Oracle Commerce Cloud", "technical", 6, 9),
        ("CRM Configuration", "technical", 7, 9),
        ("Sales Force Automation", "technical", 7, 9),
        ("REST APIs", "technical", 6, 8),
        ("Oracle Integration Cloud (OIC)", "technical", 6, 8),
        ("Customer Journey Mapping", "technical", 6, 8),
        ("Communication", "soft", 7, 9),
        ("Client Relationship", "soft", 7, 9),
        ("Stakeholder Management", "soft", 7, 9),
        ("Problem Solving", "soft", 7, 9),
    ],
    "integration": [
        ("Oracle Integration Cloud (OIC)", "technical", 8, 10),
        ("Oracle SOA Suite", "technical", 7, 9),
        ("Oracle BPEL", "technical", 7, 9),
        ("REST APIs", "technical", 8, 10),
        ("SOAP Web Services", "technical", 7, 9),
        ("JSON / XML Processing", "technical", 7, 9),
        ("Oracle Service Bus (OSB)", "technical", 6, 9),
        ("Oracle API Gateway", "technical", 6, 8),
        ("Oracle Mediator", "technical", 6, 8),
        ("ERP Adapter Configuration", "technical", 7, 9),
        ("Error Handling & Monitoring", "technical", 7, 9),
        ("Analytical Thinking", "soft", 7, 9),
        ("Problem Solving", "soft", 7, 9),
        ("Documentation", "soft", 6, 8),
        ("Attention to Detail", "soft", 7, 9),
    ],
    "analytics": [
        ("Oracle Analytics Cloud (OAC)", "technical", 8, 10),
        ("OTBI Reporting", "technical", 8, 10),
        ("Oracle BI Publisher", "technical", 7, 9),
        ("Data Visualization", "technical", 7, 9),
        ("SQL", "technical", 8, 10),
        ("Oracle Autonomous Data Warehouse", "technical", 6, 9),
        ("OBIEE", "technical", 6, 8),
        ("SmartView / EPM", "technical", 6, 8),
        ("Python", "technical", 6, 8),
        ("Data Modeling", "technical", 7, 9),
        ("KPI Design", "technical", 6, 8),
        ("Analytical Thinking", "soft", 8, 10),
        ("Problem Solving", "soft", 7, 9),
        ("Communication", "soft", 7, 9),
        ("Presentation Skills", "soft", 7, 9),
    ],
    "migration": [
        ("Oracle Cloud Migration", "technical", 8, 10),
        ("Oracle Lift & Shift", "technical", 7, 9),
        ("Oracle Fusion Financials", "technical", 7, 9),
        ("Oracle HCM Cloud", "technical", 7, 9),
        ("Data Migration (FBDI/HCM Loaders)", "technical", 8, 10),
        ("Cutover Planning", "technical", 7, 9),
        ("Oracle OCI", "technical", 6, 8),
        ("Oracle Integration Cloud (OIC)", "technical", 6, 8),
        ("Program Management", "technical", 7, 9),
        ("Risk Management", "technical", 6, 8),
        ("Leadership", "soft", 7, 9),
        ("Stakeholder Management", "soft", 8, 10),
        ("Communication", "soft", 8, 10),
        ("Problem Solving", "soft", 7, 9),
        ("Change Management", "soft", 7, 9),
    ],
    "ppm": [
        ("Oracle Fusion PPM", "technical", 8, 10),
        ("Oracle Project Costing", "technical", 7, 9),
        ("Oracle Project Billing", "technical", 7, 9),
        ("Oracle Project Contracts", "technical", 7, 9),
        ("Oracle Resource Management", "technical", 7, 9),
        ("Project Scheduling", "technical", 6, 8),
        ("Revenue Recognition", "technical", 7, 9),
        ("Oracle Fusion Financials", "technical", 6, 8),
        ("PMP Certification", "technical", 6, 8),
        ("Stakeholder Management", "soft", 7, 9),
        ("Communication", "soft", 7, 9),
        ("Problem Solving", "soft", 7, 9),
        ("Attention to Detail", "soft", 7, 9),
    ],
}


def get_posting_skill_pool(posting: JobPosting) -> list:
    """Choose appropriate skill pool for a job posting."""
    title = posting.job_title.lower()
    ptype = (posting.product_type or "").lower()
    role = (posting.job_role or "").lower()
    combined = f"{title} {ptype} {role}"

    if any(x in combined for x in ["analytics cloud", "otbi", "oac", "bi publisher", "analytics developer", "bi analyst"]):
        return POSTING_SKILL_MAP["analytics"]
    if any(x in combined for x in ["migration", "lift & shift", "cutover", "transformation director", "program manager", "change management"]):
        return POSTING_SKILL_MAP["migration"]
    if any(x in combined for x in ["ppm", "project portfolio", "project costing", "project billing"]):
        return POSTING_SKILL_MAP["ppm"]
    if any(x in combined for x in ["cx", "cpq", "field service", "commerce", "sales cloud"]):
        return POSTING_SKILL_MAP["cx_cloud"]
    if any(x in combined for x in ["integration", "oic", "soa", "bpel", "mediator", "api"]):
        return POSTING_SKILL_MAP["integration"]
    if any(x in combined for x in ["hcm", "hr", "payroll", "benefit", "talent", "recruiting", "absence", "compensation", "workforce management", "learning"]):
        return POSTING_SKILL_MAP["hcm"]
    if any(x in combined for x in ["database", "dba", "rac", "exadata", "goldengate", "apex", "pl/sql", "autonomous database"]):
        return POSTING_SKILL_MAP["database"]
    if any(x in combined for x in ["ebs", "e-business", "ricew", "forms", "report", "pl/sql developer", "workflow developer", "technical developer"]):
        return POSTING_SKILL_MAP["ebs"]
    if any(x in combined for x in ["cloud infrastructure", "oci", "network engineer", "devops", "security engineer", "security architect", "paas"]):
        return POSTING_SKILL_MAP["cloud_infra"]
    if any(x in combined for x in ["scm", "supply chain", "procurement", "inventory", "manufacturing", "order management"]):
        return POSTING_SKILL_MAP["fusion_scm"]
    # Default: Oracle Fusion Financials roles
    return POSTING_SKILL_MAP["fusion_finance"]


def main():
    with Session(engine) as session:
        # ── 1. ADD SKILLS TO JOB PROFILES ─────────────────────────────────────
        print("=" * 60)
        print("STEP 1: Adding extra skills to job profiles")
        print("=" * 60)

        profiles = session.exec(select(JobProfile).order_by(JobProfile.id)).all()
        profile_skills_added = 0
        TARGET_PROFILE_SKILLS = 10

        for profile in profiles:
            existing_skills = session.exec(
                select(Skill).where(Skill.job_profile_id == profile.id)
            ).all()
            existing_names = {s.skill_name for s in existing_skills}

            needed = TARGET_PROFILE_SKILLS - len(existing_skills)
            if needed <= 0:
                continue

            pool_key = get_profile_pool_key(profile)
            pool = PROFILE_SKILL_POOLS.get(pool_key, PROFILE_SKILL_POOLS["backend"])
            new_skills = pick_skills(pool, existing_names, needed)

            cat_map = {
                "technical": "technical",
                "functional": "functional",
                "soft": "soft",
            }
            for skill_name, category in new_skills:
                skill = Skill(
                    job_profile_id=profile.id,
                    skill_name=skill_name,
                    skill_category=category,
                    proficiency_level=random.randint(3, 5),
                )
                session.add(skill)
                profile_skills_added += 1

            session.commit()
            final_count = len(existing_skills) + len(new_skills)
            print(f"  [{profile.id}] {profile.profile_name[:45]:<45} | was {len(existing_skills)}, added {len(new_skills)} → {final_count} skills")

        print(f"\nTotal profile skills added: {profile_skills_added}")

        # ── 2. ADD SKILLS TO JOB POSTINGS ─────────────────────────────────────
        print("\n" + "=" * 60)
        print("STEP 2: Adding skills to job postings")
        print("=" * 60)

        postings = session.exec(select(JobPosting).order_by(JobPosting.id)).all()
        posting_skills_added = 0
        SKILLS_PER_POSTING = 8  # pick 8 relevant skills per posting

        for posting in postings:
            existing = session.exec(
                select(JobPostingSkill).where(JobPostingSkill.job_posting_id == posting.id)
            ).all()
            if existing:
                print(f"  [SKIP] Posting [{posting.id}] already has {len(existing)} skills")
                continue

            pool = get_posting_skill_pool(posting)
            random.shuffle(pool)
            selected = pool[:SKILLS_PER_POSTING]

            for skill_name, category, rating_min, rating_max in selected:
                ps = JobPostingSkill(
                    job_posting_id=posting.id,
                    skill_name=skill_name,
                    skill_category=category,
                    rating=random.randint(rating_min, rating_max),
                )
                session.add(ps)
                posting_skills_added += 1

            session.commit()
            skill_names = [s[0] for s in selected]
            print(f"  [{posting.id}] {posting.job_title[:50]:<50} | added {len(selected)} skills: {skill_names[:4]}...")

        print(f"\nTotal posting skills added: {posting_skills_added}")

        # ── 3. FINAL SUMMARY ──────────────────────────────────────────────────
        print("\n" + "=" * 60)
        print("FINAL SUMMARY")
        print("=" * 60)

        profiles_check = session.exec(select(JobProfile)).all()
        min_p = min(len(session.exec(select(Skill).where(Skill.job_profile_id == p.id)).all()) for p in profiles_check)
        max_p = max(len(session.exec(select(Skill).where(Skill.job_profile_id == p.id)).all()) for p in profiles_check)
        avg_p = sum(len(session.exec(select(Skill).where(Skill.job_profile_id == p.id)).all()) for p in profiles_check) / len(profiles_check)
        print(f"Job Profiles  ({len(profiles_check)} total): skills min={min_p}, max={max_p}, avg={avg_p:.1f}")

        postings_check = session.exec(select(JobPosting)).all()
        min_j = min(len(session.exec(select(JobPostingSkill).where(JobPostingSkill.job_posting_id == p.id)).all()) for p in postings_check)
        max_j = max(len(session.exec(select(JobPostingSkill).where(JobPostingSkill.job_posting_id == p.id)).all()) for p in postings_check)
        avg_j = sum(len(session.exec(select(JobPostingSkill).where(JobPostingSkill.job_posting_id == p.id)).all()) for p in postings_check) / len(postings_check)
        print(f"Job Postings  ({len(postings_check)} total): skills min={min_j}, max={max_j}, avg={avg_j:.1f}")

        postings_no_skills = [p for p in postings_check if len(session.exec(select(JobPostingSkill).where(JobPostingSkill.job_posting_id == p.id)).all()) == 0]
        if postings_no_skills:
            print(f"\nWARNING: {len(postings_no_skills)} postings still have no skills!")
        else:
            print("\nAll postings have skills!")

        profiles_under = [p for p in profiles_check if len(session.exec(select(Skill).where(Skill.job_profile_id == p.id)).all()) < 10]
        if profiles_under:
            print(f"WARNING: {len(profiles_under)} profiles have fewer than 10 skills (pool may be too small).")
        else:
            print("All profiles have >= 10 skills!")


if __name__ == "__main__":
    main()
