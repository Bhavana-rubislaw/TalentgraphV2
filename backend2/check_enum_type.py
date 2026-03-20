from app.database import engine
from sqlmodel import Session, text

session = Session(engine)

# Check if jobpostingstatus enum type exists
result = session.exec(text("""
    SELECT typname, typtype, enumlabel
    FROM pg_type t
    LEFT JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE typname = 'jobpostingstatus'
    ORDER BY e.enumsortorder
"""))
print("Enum type values:")
for row in result:
    print(f"  - {row}")

session.close()
