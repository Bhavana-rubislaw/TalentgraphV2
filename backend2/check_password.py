from app.database import engine
from sqlmodel import Session, select
from app.models import User

with Session(engine) as db:
    user = db.exec(select(User).where(User.email == 'sarah.anderson@email.com')).first()
    if user:
        print(f"User: {user.email}")
        print(f"Password hash: {user.hashed_password[:50]}...")
        
        # Try to verify with the common password
        from app.security import verify_password
        is_valid = verify_password("password123", user.hashed_password)
        print(f"Password 'password123' valid: {is_valid}")
    else:
        print("User not found")
