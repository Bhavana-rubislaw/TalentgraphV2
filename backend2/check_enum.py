from app.database import engine
from sqlalchemy import text

with engine.begin() as conn:
    result = conn.execute(text("SELECT unnest(enum_range(NULL::notification_frequency_enum))::text")).fetchall()
    print("Database enum values:")
    for r in result:
        print(f"  - {r[0]}")
