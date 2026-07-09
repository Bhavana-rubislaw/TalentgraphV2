"""
Migrate Product Taxonomy Tables
================================

Creates the product_vendor, product_type, and product_role tables
and seeds them with curated enterprise taxonomy data.

Run this script:
    cd backend2
    venv\\Scripts\\Activate.ps1
    python migrate_product_taxonomy.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import engine
from app.models import ProductVendor, ProductType, ProductRole
from sqlmodel import SQLModel
from seed_product_taxonomy import seed_taxonomy
from sqlmodel import Session


def main():
    print("=" * 80)
    print("PRODUCT TAXONOMY MIGRATION")
    print("=" * 80)
    
    print("\n[Step 1] Creating taxonomy tables...")
    try:
        # Create only the taxonomy tables
        SQLModel.metadata.create_all(
            engine, 
            tables=[
                ProductVendor.__table__,
                ProductType.__table__,
                ProductRole.__table__
            ]
        )
        print("✅ Taxonomy tables created successfully")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return
    
    print("\n[Step 2] Seeding taxonomy data...")
    try:
        with Session(engine) as session:
            seed_taxonomy(session)
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        return
    
    print("\n" + "=" * 80)
    print("✅ MIGRATION COMPLETE!")
    print("=" * 80)
    print("\nNext steps:")
    print("  • Test API endpoints: http://localhost:8001/docs")
    print("  • Try GET /product-taxonomy/vendors")
    print("  • Try GET /product-taxonomy/search?q=salesforce")
    print("=" * 80)


if __name__ == "__main__":
    main()
