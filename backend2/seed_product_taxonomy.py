"""
Seed Product Taxonomy - Curated Enterprise Vendor/Product/Role System
======================================================================

Populates the product_vendor, product_type, and product_role tables with
a comprehensive curated taxonomy covering major enterprise ecosystems.

This provides standardized dropdowns for both:
- Candidate job preferences
- Recruiter job postings

Run this script:
    cd backend2
    venv\\Scripts\\Activate.ps1
    python seed_product_taxonomy.py
"""

import sys
from pathlib import Path
from sqlmodel import Session, select

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import engine
from app.models import ProductVendor, ProductType, ProductRole


# Comprehensive Enterprise Taxonomy
TAXONOMY = {
    # ============ CRM / SALES / CUSTOMER SUCCESS ============
    "Salesforce": {
        "description": "Leading CRM and customer success platform",
        "product_types": {
            "Sales Cloud": [
                "Salesforce Developer",
                "Salesforce Admin",
                "Salesforce Architect",
                "Salesforce Consultant",
                "Salesforce Business Analyst",
            ],
            "Service Cloud": [
                "Salesforce Developer",
                "Salesforce Admin",
                "Service Cloud Consultant",
                "Customer Service Specialist",
            ],
            "Marketing Cloud": [
                "Salesforce Marketing Cloud Specialist",
                "Marketing Automation Developer",
                "Email Marketing Specialist",
                "Marketing Cloud Consultant",
            ],
            "Commerce Cloud": [
                "Commerce Cloud Developer",
                "E-commerce Specialist",
                "Commerce Cloud Consultant",
            ],
            "Experience Cloud": [
                "Experience Cloud Developer",
                "Community Cloud Consultant",
            ],
            "Data Cloud": [
                "Data Cloud Consultant",
                "CDP Specialist",
                "Data Engineer",
            ],
        }
    },
    
    "HubSpot": {
        "description": "Inbound marketing and sales platform",
        "product_types": {
            "CRM": [
                "HubSpot Administrator",
                "HubSpot Consultant",
                "CRM Specialist",
            ],
            "Marketing Hub": [
                "Marketing Automation Specialist",
                "HubSpot Marketing Consultant",
                "Inbound Marketing Specialist",
            ],
            "Sales Hub": [
                "Sales Operations Specialist",
                "HubSpot Sales Consultant",
            ],
            "Service Hub": [
                "Customer Success Manager",
                "Support Operations Specialist",
            ],
            "CMS Hub": [
                "HubSpot Developer",
                "Website Developer",
                "Content Manager",
            ],
        }
    },
    
    "Microsoft Dynamics": {
        "description": "Enterprise CRM and ERP platform",
        "product_types": {
            "Dynamics 365 CRM": [
                "Dynamics Developer",
                "Dynamics Consultant",
                "CRM Analyst",
                "Dynamics Architect",
            ],
            "Customer Service": [
                "Customer Service Consultant",
                "Support Operations Specialist",
            ],
            "Sales": [
                "Sales Operations Consultant",
                "Dynamics Sales Specialist",
            ],
            "Power Platform": [
                "Power Platform Engineer",
                "Power Apps Developer",
                "Power Automate Developer",
                "Power BI Developer",
            ],
        }
    },
    
    # ============ ERP / ENTERPRISE SYSTEMS ============
    "SAP": {
        "description": "Enterprise resource planning and business software",
        "product_types": {
            "SAP S/4HANA": [
                "SAP Consultant",
                "SAP S/4HANA Architect",
                "SAP Migration Specialist",
            ],
            "SAP FICO": [
                "SAP FICO Consultant",
                "SAP Financial Consultant",
                "SAP Functional Consultant",
            ],
            "SAP MM": [
                "SAP MM Consultant",
                "Materials Management Consultant",
            ],
            "SAP SD": [
                "SAP SD Consultant",
                "Sales and Distribution Consultant",
            ],
            "SAP Ariba": [
                "SAP Ariba Consultant",
                "Procurement Specialist",
            ],
            "SAP SuccessFactors": [
                "SuccessFactors Consultant",
                "SAP HCM Consultant",
                "HRIS Specialist",
            ],
            "SAP BW/HANA": [
                "SAP BW Consultant",
                "SAP HANA Developer",
                "SAP BI Developer",
            ],
            "SAP ABAP": [
                "SAP ABAP Developer",
                "SAP Technical Developer",
            ],
            "SAP BASIS": [
                "SAP BASIS Admin",
                "SAP System Administrator",
            ],
        }
    },
    
    "Oracle": {
        "description": "Enterprise software and cloud solutions",
        "product_types": {
            "Oracle ERP": [
                "Oracle ERP Consultant",
                "Oracle Functional Consultant",
                "Oracle Developer",
            ],
            "Oracle Fusion": [
                "Oracle Fusion Consultant",
                "Fusion Cloud Architect",
                "Oracle Fusion Developer",
            ],
            "Oracle Financials": [
                "Oracle Financial Consultant",
                "Oracle Financial Analyst",
            ],
            "Oracle SCM": [
                "Oracle SCM Consultant",
                "Supply Chain Consultant",
            ],
            "Oracle HCM": [
                "Oracle HCM Consultant",
                "HRIS Consultant",
            ],
            "Oracle Database": [
                "Oracle DBA",
                "Database Administrator",
                "Oracle Performance Tuner",
            ],
            "Oracle Cloud": [
                "Oracle Cloud Engineer",
                "Oracle Cloud Architect",
            ],
        }
    },
    
    # ============ CLOUD / DEVOPS ============
    "AWS": {
        "description": "Amazon Web Services cloud platform",
        "product_types": {
            "EC2": [
                "Cloud Engineer",
                "Infrastructure Engineer",
                "AWS Solutions Architect",
            ],
            "Lambda": [
                "Serverless Engineer",
                "Cloud Engineer",
                "Backend Developer",
            ],
            "EKS": [
                "Kubernetes Engineer",
                "DevOps Engineer",
                "Platform Engineer",
            ],
            "S3": [
                "Storage Engineer",
                "Cloud Engineer",
            ],
            "RDS": [
                "Database Engineer",
                "Cloud DBA",
            ],
            "Bedrock": [
                "AI Engineer",
                "ML Engineer",
                "Generative AI Engineer",
            ],
            "SageMaker": [
                "ML Engineer",
                "Data Scientist",
                "AI Engineer",
            ],
            "CloudFormation": [
                "Infrastructure as Code Engineer",
                "DevOps Engineer",
            ],
            "General": [
                "AWS Solutions Architect",
                "Cloud Engineer",
                "DevOps Engineer",
                "Site Reliability Engineer",
                "Platform Engineer",
            ],
        }
    },
    
    "Microsoft Azure": {
        "description": "Microsoft Azure cloud platform",
        "product_types": {
            "Azure DevOps": [
                "DevOps Engineer",
                "Azure DevOps Specialist",
                "CI/CD Engineer",
            ],
            "AKS": [
                "Kubernetes Engineer",
                "Container Orchestration Engineer",
            ],
            "Azure AI": [
                "AI Engineer",
                "Azure AI Specialist",
                "Cognitive Services Engineer",
            ],
            "Azure Functions": [
                "Serverless Engineer",
                "Azure Developer",
            ],
            "Synapse": [
                "Data Engineer",
                "Analytics Engineer",
            ],
            "Azure Data Factory": [
                "Data Engineer",
                "ETL Developer",
            ],
            "General": [
                "Azure Engineer",
                "Azure Architect",
                "Cloud Engineer",
                "Platform Engineer",
            ],
        }
    },
    
    "Google Cloud": {
        "description": "Google Cloud Platform",
        "product_types": {
            "BigQuery": [
                "Data Engineer",
                "Analytics Engineer",
                "Data Analyst",
            ],
            "GKE": [
                "Kubernetes Engineer",
                "DevOps Engineer",
            ],
            "Vertex AI": [
                "ML Engineer",
                "AI Engineer",
                "Data Scientist",
            ],
            "Cloud Run": [
                "Serverless Engineer",
                "Backend Developer",
            ],
            "Pub/Sub": [
                "Streaming Engineer",
                "Data Engineer",
            ],
            "General": [
                "GCP Engineer",
                "Cloud Architect",
                "Platform Engineer",
            ],
        }
    },
    
    # ============ DATA / ANALYTICS ============
    "Snowflake": {
        "description": "Cloud data platform",
        "product_types": {
            "Snowflake Data Cloud": [
                "Data Engineer",
                "Analytics Engineer",
                "Snowflake Architect",
                "BI Developer",
            ],
            "Snowpark": [
                "Data Engineer",
                "Python Developer",
                "ML Engineer",
            ],
            "Cortex AI": [
                "AI Engineer",
                "ML Engineer",
            ],
        }
    },
    
    "Databricks": {
        "description": "Unified data and AI platform",
        "product_types": {
            "Lakehouse": [
                "Data Engineer",
                "Data Architect",
                "Analytics Engineer",
            ],
            "Delta Live Tables": [
                "Data Engineer",
                "ETL Developer",
            ],
            "MLflow": [
                "ML Engineer",
                "MLOps Engineer",
                "Data Scientist",
            ],
            "Apache Spark": [
                "Spark Developer",
                "Data Engineer",
                "Big Data Engineer",
            ],
        }
    },
    
    "Tableau": {
        "description": "Business intelligence and analytics platform",
        "product_types": {
            "Tableau Server": [
                "BI Developer",
                "Tableau Developer",
                "Data Analyst",
                "Tableau Administrator",
            ],
            "Tableau Cloud": [
                "BI Developer",
                "Tableau Developer",
            ],
            "Tableau Prep": [
                "Data Engineer",
                "ETL Developer",
            ],
        }
    },
    
    "Power BI": {
        "description": "Microsoft business analytics platform",
        "product_types": {
            "Power BI Service": [
                "Power BI Developer",
                "BI Analyst",
                "Data Analyst",
            ],
            "Power BI Fabric": [
                "Data Engineer",
                "BI Developer",
            ],
            "Power BI Embedded": [
                "BI Developer",
                "Application Developer",
            ],
        }
    },
    
    # ============ SOFTWARE ENGINEERING / DEV TOOLS ============
    "Atlassian": {
        "description": "Team collaboration and productivity tools",
        "product_types": {
            "Jira": [
                "Jira Administrator",
                "Agile Coach",
                "Project Manager",
                "Scrum Master",
            ],
            "Confluence": [
                "Confluence Administrator",
                "Technical Writer",
                "Knowledge Manager",
            ],
            "Bitbucket": [
                "DevOps Engineer",
                "Source Control Administrator",
            ],
            "Trello": [
                "Project Manager",
                "Product Manager",
            ],
        }
    },
    
    "GitHub": {
        "description": "Development platform and version control",
        "product_types": {
            "GitHub Actions": [
                "DevOps Engineer",
                "CI/CD Engineer",
                "Platform Engineer",
            ],
            "GitHub Enterprise": [
                "Platform Engineer",
                "DevOps Engineer",
                "GitHub Administrator",
            ],
            "Copilot": [
                "Software Engineer",
                "AI-Assisted Developer",
            ],
        }
    },
    
    # ============ HR / RECRUITING ============
    "Workday": {
        "description": "Enterprise cloud applications for HR and finance",
        "product_types": {
            "Workday HCM": [
                "Workday Consultant",
                "HRIS Analyst",
                "Workday Functional Consultant",
            ],
            "Workday Payroll": [
                "Workday Payroll Consultant",
                "Payroll Specialist",
            ],
            "Workday Finance": [
                "Workday Financial Consultant",
                "Finance Systems Analyst",
            ],
            "Workday Integration": [
                "Workday Integration Engineer",
                "Integration Specialist",
            ],
        }
    },
    
    "Greenhouse": {
        "description": "Applicant tracking system",
        "product_types": {
            "ATS": [
                "Recruiting Coordinator",
                "Talent Operations Specialist",
                "HR Recruiter",
                "Talent Acquisition Specialist",
            ],
            "Recruiting CRM": [
                "Talent Sourcer",
                "Recruiting Operations Manager",
            ],
        }
    },
    
    # ============ ITSM / OPERATIONS ============
    "ServiceNow": {
        "description": "IT service management platform",
        "product_types": {
            "ITSM": [
                "ServiceNow Developer",
                "ServiceNow Admin",
                "IT Operations Analyst",
                "ITSM Consultant",
            ],
            "CMDB": [
                "CMDB Analyst",
                "Configuration Manager",
            ],
            "HRSD": [
                "HRSD Consultant",
                "HR Service Delivery Specialist",
            ],
            "SecOps": [
                "Security Operations Engineer",
                "ServiceNow SecOps Developer",
            ],
        }
    },
    
    # ============ AI / LLM / AUTOMATION ============
    "OpenAI": {
        "description": "Artificial intelligence research and deployment",
        "product_types": {
            "GPT API": [
                "AI Engineer",
                "Prompt Engineer",
                "LLM Engineer",
                "AI Product Engineer",
            ],
            "Assistants API": [
                "AI Engineer",
                "Agentic AI Engineer",
            ],
            "Vision API": [
                "Computer Vision Engineer",
                "AI Engineer",
            ],
        }
    },
    
    "Anthropic": {
        "description": "AI safety and research company",
        "product_types": {
            "Claude API": [
                "AI Engineer",
                "AI Research Engineer",
                "Prompt Engineer",
            ],
            "Claude Enterprise": [
                "AI Engineer",
                "Enterprise AI Consultant",
            ],
        }
    },
    
    "LangChain": {
        "description": "Framework for developing LLM applications",
        "product_types": {
            "LangGraph": [
                "AI Engineer",
                "Agentic AI Engineer",
                "LLM Application Developer",
            ],
            "LangSmith": [
                "AI Engineer",
                "LLM Operations Engineer",
            ],
            "Agents": [
                "Agentic AI Engineer",
                "RAG Engineer",
                "AI Engineer",
            ],
        }
    },
    
    # ============ GENERAL SOFTWARE DEVELOPMENT ============
    "General": {
        "description": "General software development (non-vendor specific)",
        "product_types": {
            "Web Development": [
                "Frontend Developer",
                "Backend Developer",
                "Full Stack Developer",
                "Web Developer",
            ],
            "Mobile Development": [
                "iOS Developer",
                "Android Developer",
                "Mobile Developer",
                "React Native Developer",
                "Flutter Developer",
            ],
            "Data Engineering": [
                "Data Engineer",
                "ETL Developer",
                "Data Pipeline Engineer",
            ],
            "Machine Learning": [
                "ML Engineer",
                "Data Scientist",
                "AI Engineer",
            ],
            "DevOps": [
                "DevOps Engineer",
                "Site Reliability Engineer",
                "Platform Engineer",
            ],
            "Quality Assurance": [
                "QA Engineer",
                "Test Automation Engineer",
                "QA Analyst",
            ],
            "Product Management": [
                "Product Manager",
                "Technical Product Manager",
                "Product Owner",
            ],
            "Design": [
                "UX Designer",
                "UI Designer",
                "Product Designer",
                "UX Researcher",
            ],
        }
    },
}


def seed_taxonomy(session: Session):
    """Populate product taxonomy with curated data"""
    
    print("=" * 80)
    print("SEEDING PRODUCT TAXONOMY")
    print("=" * 80)
    
    vendor_count = 0
    product_type_count = 0
    role_count = 0
    
    for vendor_name, vendor_data in TAXONOMY.items():
        # Check if vendor exists
        vendor = session.exec(
            select(ProductVendor).where(ProductVendor.name == vendor_name)
        ).first()
        
        if not vendor:
            vendor = ProductVendor(
                name=vendor_name,
                description=vendor_data.get("description"),
                is_custom=False,
                is_active=True
            )
            session.add(vendor)
            session.commit()
            session.refresh(vendor)
            vendor_count += 1
            print(f"\n✅ Created vendor: {vendor_name}")
        else:
            print(f"\nℹ️  Vendor exists: {vendor_name}")
        
        # Create product types
        for product_type_name, roles in vendor_data["product_types"].items():
            product_type = session.exec(
                select(ProductType).where(
                    ProductType.vendor_id == vendor.id,
                    ProductType.name == product_type_name
                )
            ).first()
            
            if not product_type:
                product_type = ProductType(
                    vendor_id=vendor.id,
                    name=product_type_name,
                    is_custom=False,
                    is_active=True
                )
                session.add(product_type)
                session.commit()
                session.refresh(product_type)
                product_type_count += 1
                print(f"  ✅ Product Type: {product_type_name}")
            else:
                print(f"  ℹ️  Product Type exists: {product_type_name}")
            
            # Create roles
            for role_name in roles:
                role = session.exec(
                    select(ProductRole).where(
                        ProductRole.product_type_id == product_type.id,
                        ProductRole.name == role_name
                    )
                ).first()
                
                if not role:
                    role = ProductRole(
                        product_type_id=product_type.id,
                        name=role_name,
                        is_custom=False,
                        is_active=True
                    )
                    session.add(role)
                    role_count += 1
            
            session.commit()
            print(f"    ✅ Added {len(roles)} roles")
    
    print("\n" + "=" * 80)
    print("✅ TAXONOMY SEED COMPLETE!")
    print("=" * 80)
    print(f"\n📊 Summary:")
    print(f"  • Vendors: {vendor_count} new")
    print(f"  • Product Types: {product_type_count} new")
    print(f"  • Roles: {role_count} new")
    print("\n" + "=" * 80)


def main():
    with Session(engine) as session:
        seed_taxonomy(session)


if __name__ == "__main__":
    main()
