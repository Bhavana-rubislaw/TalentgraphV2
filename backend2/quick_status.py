"""Quick status check"""
from app.database import engine
from sqlmodel import Session
from app.models import JobProfile, ProductVendor, ProductType, ProductRole

s = Session(engine)

print("=" * 80)
print("DATABASE STATUS CHECK")
print("=" * 80)

# Check job profiles
profiles = s.query(JobProfile).limit(5).all()
print(f"\nJob Profiles: {len(profiles)} found")

for p in profiles:
    print(f"\n[{p.id}] {p.profile_name}")
    print(f"  Legacy fields: vendor='{p.product_vendor}', type='{p.product_type}', role='{p.job_role}'")
    print(f"  FK fields: vendor_id={p.vendor_id}, type_id={p.product_type_id}, role_id={p.role_id}")
    
    if p.vendor_id:
        vendor = s.get(ProductVendor, p.vendor_id)
        print(f"  Resolved vendor: {vendor.name if vendor else 'NOT FOUND'}")

# Check taxonomy tables
vendor_count = s.query(ProductVendor).count()
type_count = s.query(ProductType).count()
role_count = s.query(ProductRole).count()

print(f"\nTaxonomy Tables:")
print(f"  Vendors: {vendor_count}")
print(f"  Product Types: {type_count}")
print(f"  Roles: {role_count}")

s.close()
print("\n" + "=" * 80)
