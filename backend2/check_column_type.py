from app.database import engine
from sqlmodel import Session, text

session = Session(engine)

# Check the actual column type
result = session.exec(text("""
    SELECT column_name, data_type, character_maximum_length 
    FROM information_schema.columns 
    WHERE table_name = 'jobposting' AND column_name = 'status'
"""))
print("Column info:")
for row in result:
    print(f"  Column: {row[0]}, Type: {row[1]}, Length: {row[2]}")

# Check raw data
result = session.exec(text("""
    SELECT id, title, company_id, status, is_active 
    FROM jobposting 
    WHERE company_id IN (1, 2, 3)
    LIMIT 5
"""))
print("\nRaw job data:")
for row in result:
    print(f"  ID: {row[0]}, Company: {row[2]}, Status: '{row[3]}', Type: {type(row[3])}")

session.close()
