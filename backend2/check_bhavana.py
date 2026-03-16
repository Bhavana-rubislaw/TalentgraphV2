from app.database import engine
from sqlmodel import Session, text

with Session(engine) as s:
    r = s.exec(text("SELECT u.id, jp.id FROM \"user\" u LEFT JOIN jobprofile jp ON jp.user_id = u.id WHERE u.email = 'bhavanabayya13@gmail.com'")).first()
    if r:
        print(f"User:{r[0]},Profile:{r[1] if r[1] else 'MISSING'}")
    else:
        print("NOT_FOUND")
