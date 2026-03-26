from app.database import engine
from sqlalchemy import text

tables_to_check = [
    'message_attachment',
    'email_thread_link', 
    'inbound_email_event',
    'subscription',
    'invoice',
    'payment_event',
    'entitlement',
    'analytics_event',
    'analytics_rollup_daily'
]

with engine.connect() as conn:
    result = conn.execute(text(
        """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema='public' 
        AND table_name = ANY(:tables)
        """
    ), {"tables": tables_to_check})
    
    found_tables = [row[0] for row in result]
    
    print(f"\n{'='*60}")
    print(f"Phase 3 & 4 Migration Verification")
    print(f"{'='*60}\n")
    print(f"Expected tables: {len(tables_to_check)}")
    print(f"Found tables: {len(found_tables)}\n")
    
    if found_tables:
        print("✓ Tables created successfully:")
        for table in sorted(found_tables):
            print(f"  - {table}")
    else:
        print("✗ No Phase 3 & 4 tables found")
    
    if len(found_tables) < len(tables_to_check):
        missing = set(tables_to_check) - set(found_tables)
        print(f"\n✗ Missing tables:")
        for table in sorted(missing):
            print(f"  - {table}")
    else:
        print(f"\n✓ All {len(tables_to_check)} tables present!")
