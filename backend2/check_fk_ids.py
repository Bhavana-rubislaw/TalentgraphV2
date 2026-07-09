"""Check if job profiles have taxonomy FK IDs populated"""
from sqlmodel import Session, select
from app.database import engine
from app.models import JobProfile, ProductVendor, ProductType, ProductRole

with Session(engine) as session:
    # Get first 10 job profiles
    profiles = session.exec(select(JobProfile).limit(10)).all()
    
    print("\n=== JOB PROFILE TAXONOMY STATUS ===\n")
    
    has_fk_count = 0
    missing_fk_count = 0
    
    for profile in profiles:
        print(f"Profile ID {profile.id}: {profile.profile_name}")
        print(f"  vendor_id: {profile.vendor_id}")
        print(f"  product_type_id: {profile.product_type_id}")
        print(f"  role_id: {profile.role_id}")
        
        # Try to resolve the names
        if profile.vendor_id:
            vendor = session.get(ProductVendor, profile.vendor_id)
            print(f"  → Vendor: {vendor.name if vendor else 'NOT FOUND'}")
        if profile.product_type_id:
            ptype = session.get(ProductType, profile.product_type_id)
            print(f"  → Product Type: {ptype.name if ptype else 'NOT FOUND'}")
        if profile.role_id:
            role = session.get(ProductRole, profile.role_id)
            print(f"  → Role: {role.name if role else 'NOT FOUND'}")
        
        if profile.vendor_id and profile.product_type_id and profile.role_id:
            has_fk_count += 1
        else:
            missing_fk_count += 1
            print(f"  ⚠️ Missing FK IDs")
        
        print()
    
    print(f"\n=== SUMMARY ===")
    print(f"Profiles with FK IDs: {has_fk_count}")
    print(f"Profiles missing FK IDs: {missing_fk_count}")
    print(f"Total checked: {len(profiles)}")
