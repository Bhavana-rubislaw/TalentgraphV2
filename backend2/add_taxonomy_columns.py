"""
Add Taxonomy Columns to JobProfile
===================================

Adds vendor_id, product_type_id, and role_id columns to existing jobprofile table.
"""

from sqlalchemy import text
from app.database import engine

def main():
    print("Adding taxonomy columns to jobprofile table...")
    
    with engine.begin() as conn:
        # Add vendor_id column
        conn.execute(text(
            "ALTER TABLE jobprofile ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES product_vendor(id)"
        ))
        
        # Add product_type_id column
        conn.execute(text(
            "ALTER TABLE jobprofile ADD COLUMN IF NOT EXISTS product_type_id INTEGER REFERENCES product_type(id)"
        ))
        
        # Add role_id column
        conn.execute(text(
            "ALTER TABLE jobprofile ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES product_role(id)"
        ))
        
        # Create indexes
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_jobprofile_vendor_id ON jobprofile(vendor_id)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_jobprofile_product_type_id ON jobprofile(product_type_id)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_jobprofile_role_id ON jobprofile(role_id)"
        ))
    
    print("✅ Taxonomy columns added successfully!")

if __name__ == "__main__":
    main()
