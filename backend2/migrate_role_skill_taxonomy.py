"""
Migration: Role-Specific Skill Taxonomy
========================================
Creates the `taxonomy_skill` and `role_skill_link` tables and seeds
initial skill data for common SAP, Oracle, and Salesforce roles.

Run once:
    python migrate_role_skill_taxonomy.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlmodel import SQLModel, Session, select
from app.database import engine
from app.models import TaxonomySkill, RoleSkillLink, ProductRole


# ---------------------------------------------------------------------------
# Seed data: role_name -> [(skill_name, category, is_required)]
# ---------------------------------------------------------------------------
ROLE_SKILL_MAP: dict[str, list[tuple[str, str, bool]]] = {
    # ── Salesforce ──────────────────────────────────────────────────────────
    "Salesforce Developer": [
        ("Apex Programming", "technical", True),
        ("Visualforce", "technical", True),
        ("Lightning Web Components (LWC)", "technical", True),
        ("SOQL / SOSL", "technical", True),
        ("Salesforce REST API", "technical", True),
        ("Salesforce Metadata API", "technical", False),
        ("Salesforce DX (SFDX)", "technical", False),
        ("Git / Version Control", "technical", False),
        ("JavaScript", "technical", False),
        ("Agile / Scrum", "soft", False),
        ("Problem Solving", "soft", False),
    ],
    "Salesforce Administrator": [
        ("Salesforce Configuration", "functional", True),
        ("Salesforce Security Model", "functional", True),
        ("Workflow & Process Builder", "functional", True),
        ("Reports & Dashboards", "functional", True),
        ("Data Management / Import Wizard", "functional", True),
        ("Salesforce Flow", "functional", False),
        ("AppExchange Management", "functional", False),
        ("Change Management", "soft", False),
        ("Stakeholder Communication", "soft", False),
    ],
    "Salesforce Consultant": [
        ("Salesforce Sales Cloud", "functional", True),
        ("Salesforce Service Cloud", "functional", True),
        ("Business Analysis", "functional", True),
        ("Requirements Gathering", "functional", True),
        ("Salesforce Configuration", "functional", True),
        ("Data Migration", "technical", False),
        ("Project Management", "soft", False),
        ("Client Engagement", "soft", False),
        ("Presentation Skills", "soft", False),
    ],
    "Salesforce Architect": [
        ("Salesforce Architecture Patterns", "technical", True),
        ("Integration Architecture", "technical", True),
        ("Apex Programming", "technical", True),
        ("Lightning Web Components (LWC)", "technical", True),
        ("Salesforce Platform Events", "technical", False),
        ("Salesforce Einstein Analytics", "functional", False),
        ("Enterprise Architecture", "functional", True),
        ("Solution Design", "functional", True),
        ("Technical Leadership", "soft", True),
    ],

    # ── SAP ──────────────────────────────────────────────────────────────────
    "SAP Developer": [
        ("ABAP Programming", "technical", True),
        ("SAP S/4HANA", "technical", True),
        ("SAP Fiori / UI5", "technical", True),
        ("SAP HANA Database", "technical", False),
        ("SAP BTP (Business Technology Platform)", "technical", False),
        ("OData Services", "technical", False),
        ("RFC / BAPI", "technical", False),
        ("Debugging & Performance Tuning", "technical", False),
        ("Agile / Scrum", "soft", False),
    ],
    "SAP Consultant": [
        ("SAP S/4HANA", "functional", True),
        ("SAP ECC", "functional", False),
        ("SAP Configuration", "functional", True),
        ("Business Process Analysis", "functional", True),
        ("SAP Finance (FI/CO)", "functional", False),
        ("SAP Supply Chain (MM/SD/PP)", "functional", False),
        ("Gap Analysis", "functional", False),
        ("Requirements Gathering", "functional", True),
        ("Client Communication", "soft", True),
    ],
    "SAP Basis Administrator": [
        ("SAP System Administration", "technical", True),
        ("SAP Transport Management", "technical", True),
        ("SAP Security & Authorization", "technical", True),
        ("SAP HANA Administration", "technical", False),
        ("SAP Kernel Upgrades", "technical", False),
        ("Operating System Administration (Linux/Windows)", "technical", False),
        ("Performance Monitoring", "technical", True),
        ("Troubleshooting", "soft", True),
    ],
    "SAP FICO Consultant": [
        ("SAP Financial Accounting (FI)", "functional", True),
        ("SAP Controlling (CO)", "functional", True),
        ("SAP S/4HANA Finance", "functional", True),
        ("General Ledger Configuration", "functional", True),
        ("Cost Center Accounting", "functional", True),
        ("Asset Accounting", "functional", False),
        ("SAP New GL", "functional", False),
        ("Month-End / Year-End Closing", "functional", True),
        ("Analytical Skills", "soft", False),
    ],

    # ── Oracle ──────────────────────────────────────────────────────────────
    "Oracle Developer": [
        ("PL/SQL", "technical", True),
        ("Oracle Database", "technical", True),
        ("Oracle Forms & Reports", "technical", False),
        ("Oracle APEX", "technical", False),
        ("SQL Tuning & Optimization", "technical", True),
        ("Oracle REST Data Services (ORDS)", "technical", False),
        ("Java / J2EE", "technical", False),
        ("Data Modeling", "technical", False),
        ("Problem Solving", "soft", False),
    ],
    "Oracle DBA": [
        ("Oracle Database Administration", "technical", True),
        ("Oracle RAC", "technical", True),
        ("Oracle Data Guard", "technical", True),
        ("Backup & Recovery (RMAN)", "technical", True),
        ("Performance Tuning", "technical", True),
        ("Oracle Exadata", "technical", False),
        ("Oracle GoldenGate", "technical", False),
        ("Shell Scripting", "technical", False),
        ("Incident Management", "soft", False),
    ],
    "Oracle EBS Consultant": [
        ("Oracle E-Business Suite", "functional", True),
        ("Oracle Financials (AR/AP/GL)", "functional", True),
        ("Oracle Order Management", "functional", False),
        ("Oracle HRMS", "functional", False),
        ("Oracle Workflow", "functional", False),
        ("Business Process Mapping", "functional", True),
        ("Requirements Documentation", "functional", True),
        ("Client Relationship Management", "soft", False),
    ],
    "Oracle Fusion Consultant": [
        ("Oracle Fusion Cloud", "functional", True),
        ("Oracle Fusion Financials", "functional", True),
        ("Oracle Fusion HCM", "functional", False),
        ("Oracle Fusion SCM", "functional", False),
        ("Oracle Integration Cloud (OIC)", "technical", False),
        ("Oracle BI Publisher", "technical", False),
        ("Data Migration (FBDI)", "technical", False),
        ("Functional Configuration", "functional", True),
        ("Workshop Facilitation", "soft", False),
    ],
}

# Skills that are shared across multiple roles (deduplicated by name)
GLOBAL_SOFT_SKILLS = [
    ("Communication", "soft"),
    ("Teamwork", "soft"),
    ("Time Management", "soft"),
    ("Adaptability", "soft"),
    ("Critical Thinking", "soft"),
]


def run_migration():
    print("=== Role-Specific Skill Taxonomy Migration ===\n")

    # 1. Create tables
    SQLModel.metadata.create_all(engine, tables=[
        TaxonomySkill.__table__,
        RoleSkillLink.__table__,
    ])
    print("[OK] Tables created (taxonomy_skill, role_skill_link)")

    with Session(engine) as session:
        # 2. Upsert all unique skills
        all_skills: dict[str, TaxonomySkill] = {}

        # Collect from role map
        skill_defs: list[tuple[str, str]] = []
        for entries in ROLE_SKILL_MAP.values():
            for skill_name, category, _ in entries:
                skill_defs.append((skill_name, category))
        for skill_name, category in GLOBAL_SOFT_SKILLS:
            skill_defs.append((skill_name, category))

        # Deduplicate: skill name is unique across all categories
        seen: set[str] = set()
        unique_skill_defs: list[tuple[str, str]] = []
        for name, cat in skill_defs:
            if name not in seen:
                seen.add(name)
                unique_skill_defs.append((name, cat))

        for skill_name, category in unique_skill_defs:
            existing = session.exec(
                select(TaxonomySkill).where(TaxonomySkill.name == skill_name)
            ).first()
            if existing:
                existing.category = category
                existing.is_active = True
                all_skills[skill_name] = existing
            else:
                skill = TaxonomySkill(name=skill_name, category=category)
                session.add(skill)
                session.flush()
                all_skills[skill_name] = skill

        session.commit()
        print(f"[OK] Upserted {len(all_skills)} taxonomy skills")

        # Refresh all_skills after commit to get IDs
        for name in list(all_skills.keys()):
            session.refresh(all_skills[name])

        # 3. Link skills to roles
        links_created = 0
        links_skipped = 0

        for role_name, entries in ROLE_SKILL_MAP.items():
            # Find the role by name (may match multiple; take all)
            roles = session.exec(
                select(ProductRole).where(
                    ProductRole.name == role_name,
                    ProductRole.is_active == True,
                )
            ).all()

            if not roles:
                print(f"  [SKIP] Role not found in DB: '{role_name}'")
                continue

            for role in roles:
                for skill_name, _category, is_required in entries:
                    if skill_name not in all_skills:
                        continue
                    skill = all_skills[skill_name]

                    existing_link = session.get(RoleSkillLink, (role.id, skill.id))
                    if existing_link:
                        existing_link.is_required = is_required
                        links_skipped += 1
                    else:
                        link = RoleSkillLink(
                            role_id=role.id,
                            skill_id=skill.id,
                            is_required=is_required,
                        )
                        session.add(link)
                        links_created += 1

        session.commit()
        print(f"[OK] Created {links_created} role-skill links, updated {links_skipped} existing")

    print("\n=== Migration complete ===")
    print("Run the backend and verify: GET /product-taxonomy/roles/{role_id}/skills")


if __name__ == "__main__":
    run_migration()
