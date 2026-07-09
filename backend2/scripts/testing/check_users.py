from app.database import engine
from app.models import User
from sqlmodel import Session, select

emails = [
    'kuttybayya@gmail.com',
    'bhavanabayya13@gmail.com',
    'bayyakutty02@gmail.com',
    'bhavana@rubislawinvest.com'
]

with Session(engine) as s:
    for email in emails:
        u = s.exec(select(User).where(User.email == email)).first()
        status = 'EXISTS' if u else 'MISSING'
        role = f'({u.role})' if u else ''
        print(f'{email:40} {status} {role}')
