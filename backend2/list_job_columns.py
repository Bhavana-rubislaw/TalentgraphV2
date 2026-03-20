from app.database import engine
from sqlmodel import Session, text

session = Session(engine)

# Check all columns in jobposting table
result = session.exec(text("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'jobposting'
    ORDER BY ordinal_position
"""))
print("Columns in jobposting table:")
for row in result:
    print(f"  - {row[0]}")

session.close()
