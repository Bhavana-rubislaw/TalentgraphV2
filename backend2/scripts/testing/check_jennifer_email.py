from app.database import engine
from sqlmodel import Session, select, text

with Session(engine) as session:
    result = session.exec(text("""
        SELECT email, full_name, role 
        FROM "user" 
        WHERE email LIKE '%jennifer%' OR full_name LIKE '%Jennifer%'
    """)).all()
    
    print("Jennifer users:")
    for r in result:
        print(f"  Email: {r[0]}")
        print(f"  Name: {r[1]}")
        print(f"  Role: {r[2]}")
        print()
