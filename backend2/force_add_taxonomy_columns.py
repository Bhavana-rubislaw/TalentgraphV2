"""
FORCE add taxonomy columns to jobprofile table using raw SQL
"""

from sqlalchemy import text
from app.database import engine

def main():
    print("=" * 80)
    print("ADDING TAXONOMY COLUMNS TO JOBPROFILE TABLE (FORCED)")
    print("=" * 80)
    
    with engine.begin() as conn:
        # Check if columns exist first
        print("\n[Step 1] Checking existing columns...")
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'jobprofile' AND column_name IN ('vendor_id', 'product_type_id', 'role_id')
        """))
        existing_cols = [row[0] for row in result]
        print(f"  Existing taxonomy columns: {existing_cols if existing_cols else 'NONE'}")
        
        # Add vendor_id if it doesn't exist
        if 'vendor_id' not in existing_cols:
            print("\n[Step 2] Adding vendor_id column...")
            try:
                conn.execute(text("ALTER TABLE jobprofile ADD COLUMN vendor_id INTEGER"))
                conn.execute(text("ALTER TABLE jobprofile ADD CONSTRAINT fk_jobprofile_vendor FOREIGN KEY (vendor_id) REFERENCES product_vendor(id)"))
                conn.execute(text("CREATE INDEX ix_jobprofile_vendor_id ON jobprofile(vendor_id)"))
                print("  ✓ vendor_id added")
            except Exception as e:
                print(f"  ! Error: {e}")
        else:
            print("\n[Step 2] vendor_id already exists, skipping...")
        
        # Add product_type_id if it doesn't exist
        if 'product_type_id' not in existing_cols:
            print("\n[Step 3] Adding product_type_id column...")
            try:
                conn.execute(text("ALTER TABLE jobprofile ADD COLUMN product_type_id INTEGER"))
                conn.execute(text("ALTER TABLE jobprofile ADD CONSTRAINT fk_jobprofile_product_type FOREIGN KEY (product_type_id) REFERENCES product_type(id)"))
                conn.execute(text("CREATE INDEX ix_jobprofile_product_type_id ON jobprofile(product_type_id)"))
                print("  ✓ product_type_id added")
            except Exception as e:
                print(f"  ! Error: {e}")
        else:
            print("\n[Step 3] product_type_id already exists, skipping...")
        
        # Add role_id if it doesn't exist
        if 'role_id' not in existing_cols:
            print("\n[Step 4] Adding role_id column...")
            try:
                conn.execute(text("ALTER TABLE jobprofile ADD COLUMN role_id INTEGER"))
                conn.execute(text("ALTER TABLE jobprofile ADD CONSTRAINT fk_jobprofile_role FOREIGN KEY (role_id) REFERENCES product_role(id)"))
                conn.execute(text("CREATE INDEX ix_jobprofile_role_id ON jobprofile(role_id)"))
                print("  ✓ role_id added")
            except Exception as e:
                print(f"  ! Error: {e}")
        else:
            print("\n[Step 4] role_id already exists, skipping...")
        
        # Verify columns were added
        print("\n[Step 5] Verifying columns...")
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'jobprofile' AND column_name IN ('vendor_id', 'product_type_id', 'role_id')
        """))
        final_cols = [row[0] for row in result]
        print(f"  Final taxonomy columns: {final_cols}")
        
        if len(final_cols) == 3:
            print("\n" + "=" * 80)
            print("✓✓✓ SUCCESS! All 3 taxonomy columns added to jobprofile table")
            print("=" * 80)
        else:
            print("\n" + "=" * 80)
            print(f"✗✗✗ FAILED! Only {len(final_cols)}/3 columns added")
            print("=" * 80)

if __name__ == "__main__":
    main()
