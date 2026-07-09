"""
Add Product Taxonomy Foreign Keys to JobProfile
================================================

Adds vendor_id, product_type_id, and role_id columns to the job_profile table.

Run this migration:
    cd backend2
    venv\\Scripts\\Activate.ps1
    python migrate_job_profile_taxonomy.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import engine
from sqlalchemy import text


def main():
    print("=" * 80)
    print("MIGRATION: Add Product Taxonomy to JobProfile")
    print("=" * 80)
    
    with engine.connect() as conn:
        print("\n[Step 1] Adding vendor_id column...")
        try:
            conn.execute(text("""
                ALTER TABLE job_profile 
                ADD COLUMN vendor_id INTEGER REFERENCES product_vendor(id)
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_job_profile_vendor_id ON job_profile(vendor_id)
            """))
            conn.commit()
            print("✅ vendor_id column added")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                print("ℹ️  vendor_id column already exists")
            else:
                print(f"❌ Error: {e}")
                return
        
        print("\n[Step 2] Adding product_type_id column...")
        try:
            conn.execute(text("""
                ALTER TABLE job_profile 
                ADD COLUMN product_type_id INTEGER REFERENCES product_type(id)
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_job_profile_product_type_id ON job_profile(product_type_id)
            """))
            conn.commit()
            print("✅ product_type_id column added")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                print("ℹ️  product_type_id column already exists")
            else:
                print(f"❌ Error: {e}")
                return
        
        print("\n[Step 3] Adding role_id column...")
        try:
            conn.execute(text("""
                ALTER TABLE job_profile 
                ADD COLUMN role_id INTEGER REFERENCES product_role(id)
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_job_profile_role_id ON job_profile(role_id)
            """))
            conn.commit()
            print("✅ role_id column added")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                print("ℹ️  role_id column already exists")
            else:
                print(f"❌ Error: {e}")
                return
        
        print("\n[Step 4] Making legacy text fields nullable...")
        try:
            # PostgreSQL syntax to make columns nullable
            conn.execute(text("ALTER TABLE job_profile ALTER COLUMN product_vendor DROP NOT NULL"))
            conn.execute(text("ALTER TABLE job_profile ALTER COLUMN product_type DROP NOT NULL"))
            conn.execute(text("ALTER TABLE job_profile ALTER COLUMN job_role DROP NOT NULL"))
            conn.commit()
            print("✅ Legacy text fields now nullable")
        except Exception as e:
            if "does not exist" in str(e).lower():
                print("ℹ️  Columns already nullable")
            else:
                print(f"⚠️  Warning (non-critical): {e}")
    
    print("\n" + "=" * 80)
    print("✅ MIGRATION COMPLETE!")
    print("=" * 80)
    print("\nJobProfile table now has:")
    print("  • vendor_id (FK to product_vendor)")
    print("  • product_type_id (FK to product_type)")
    print("  • role_id (FK to product_role)")
    print("  • Legacy text fields (product_vendor, product_type, job_role) - nullable")
    print("=" * 80)


if __name__ == "__main__":
    main()
