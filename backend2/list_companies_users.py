"""
Script to list all companies and their users in the database
"""

from sqlmodel import Session, select
from app.database import engine
from app.models import Company, User

def list_companies_and_users():
    """Query and display all companies and their users"""
    
    with Session(engine) as session:
        # Query all companies with their associated users
        statement = (
            select(Company, User)
            .join(User, Company.user_id == User.id)
            .order_by(Company.company_name, User.email)
        )
        
        results = session.exec(statement).all()
        
        if not results:
            print("No companies found in the database.")
            return
        
        print("\n" + "="*80)
        print(f"TOTAL COMPANIES FOUND: {len(results)}")
        print("="*80 + "\n")
        
        # Group by company
        current_company = None
        company_count = 0
        
        for company, user in results:
            # Print company header when we encounter a new company
            if current_company != company.company_name:
                if current_company is not None:
                    print("-" * 80 + "\n")
                
                company_count += 1
                current_company = company.company_name
                
                print(f"Company #{company_count}: {company.company_name}")
                print(f"  ID: {company.id}")
                print(f"  Email: {company.company_email}")
                print(f"  Employee Type: {company.employee_type}")
                print(f"  Website: {company.company_website or 'N/A'}")
                print(f"  Location: {company.company_location or 'N/A'}")
                print(f"  Department: {company.department or 'N/A'}")
                print(f"  Profile Complete: {company.profile_complete}")
                print(f"  Created: {company.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"\n  Associated User:")
            
            # Print user details
            print(f"    - User ID: {user.id}")
            print(f"      Email: {user.email}")
            print(f"      Full Name: {user.full_name}")
            print(f"      Role: {user.role.value}")
            print(f"      Active: {user.is_active}")
            print(f"      Created: {user.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
            print()
        
        print("="*80)
        print(f"\nSUMMARY:")
        print(f"  Total Companies: {company_count}")
        print(f"  Total Users: {len(results)}")
        print("="*80 + "\n")


def list_companies_summary():
    """Quick summary of companies"""
    
    with Session(engine) as session:
        # Count total companies
        companies = session.exec(select(Company)).all()
        
        print("\n" + "="*80)
        print("COMPANIES SUMMARY")
        print("="*80 + "\n")
        
        if not companies:
            print("No companies found in the database.")
            return
        
        for idx, company in enumerate(companies, 1):
            print(f"{idx}. {company.company_name}")
            print(f"   - Email: {company.company_email}")
            print(f"   - Type: {company.employee_type}")
            print(f"   - Complete: {'✓' if company.profile_complete else '✗'}")
            print()
        
        print(f"Total: {len(companies)} companies")
        print("="*80 + "\n")


def list_all_users_by_role():
    """List all users grouped by role"""
    
    with Session(engine) as session:
        users = session.exec(select(User).order_by(User.role, User.email)).all()
        
        print("\n" + "="*80)
        print("ALL USERS BY ROLE")
        print("="*80 + "\n")
        
        if not users:
            print("No users found in the database.")
            return
        
        current_role = None
        role_count = {}
        
        for user in users:
            if current_role != user.role:
                current_role = user.role
                print(f"\n{current_role.value.upper()} USERS:")
                print("-" * 40)
                role_count[current_role.value] = 0
            
            role_count[current_role.value] += 1
            print(f"  {role_count[current_role.value]}. {user.full_name}")
            print(f"     Email: {user.email}")
            print(f"     ID: {user.id}")
            print(f"     Active: {'✓' if user.is_active else '✗'}")
            print()
        
        print("="*80)
        print("SUMMARY:")
        for role, count in role_count.items():
            print(f"  {role.capitalize()}: {count}")
        print(f"  Total Users: {sum(role_count.values())}")
        print("="*80 + "\n")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("TALENTGRAPH DATABASE - COMPANIES AND USERS REPORT")
    print("="*80)
    
    # Option 1: Full detailed report
    list_companies_and_users()
    
    # Option 2: Quick summary
    # list_companies_summary()
    
    # Option 3: All users by role
    list_all_users_by_role()
