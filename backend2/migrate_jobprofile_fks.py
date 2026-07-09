"""
Migrate existing job profile text fields to taxonomy FK IDs
Matches product_vendor, product_type, job_role text to taxonomy IDs
"""

from sqlmodel import Session, select
from app.database import engine
from app.models import JobProfile, ProductVendor, ProductType, ProductRole

def migrate_job_profiles():
    print("=" * 80)
    print("MIGRATING JOB PROFILES TO TAXONOMY REFERENCES")
    print("=" * 80)
    
    with Session(engine) as session:
        # Get all job profiles
        profiles = session.exec(select(JobProfile)).all()
        print(f"\nFound {len(profiles)} job profiles to migrate")
        
        updated_count = 0
        skipped_count = 0
        
        for profile in profiles:
            # Skip if already has FK IDs
            if profile.vendor_id and profile.product_type_id and profile.role_id:
                skipped_count += 1
                continue
            
            vendor_id = None
            product_type_id = None
            role_id = None
            
            # Match vendor
            if profile.product_vendor:
                vendor = session.exec(
                    select(ProductVendor).where(ProductVendor.name.ilike(f"%{profile.product_vendor}%"))
                ).first()
                if vendor:
                    vendor_id = vendor.id
            
            # Match product type
            if profile.product_type and vendor_id:
                product_type = session.exec(
                    select(ProductType).where(
                        ProductType.vendor_id == vendor_id,
                        ProductType.name.ilike(f"%{profile.product_type}%")
                    )
                ).first()
                if product_type:
                    product_type_id = product_type.id
            
            # Match role
            if profile.job_role and product_type_id:
                role = session.exec(
                    select(ProductRole).where(
                        ProductRole.product_type_id == product_type_id,
                        ProductRole.name.ilike(f"%{profile.job_role}%")
                    )
                ).first()
                if role:
                    role_id = role.id
            
            # Update if we found matches
            if vendor_id or product_type_id or role_id:
                profile.vendor_id = vendor_id
                profile.product_type_id = product_type_id
                profile.role_id = role_id
                session.add(profile)
                updated_count += 1
                
                print(f"\n[{updated_count}] {profile.profile_name}")
                print(f"  Text: {profile.product_vendor} -> {profile.product_type} -> {profile.job_role}")
                print(f"  IDs: vendor_id={vendor_id}, type_id={product_type_id}, role_id={role_id}")
        
        session.commit()
        
        print("\n" + "=" * 80)
        print(f"MIGRATION COMPLETE")
        print(f"  Updated: {updated_count} profiles")
        print(f"  Skipped: {skipped_count} profiles (already had IDs)")
        print("=" * 80)

if __name__ == "__main__":
    migrate_job_profiles()
