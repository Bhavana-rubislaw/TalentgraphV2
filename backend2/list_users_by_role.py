#!/usr/bin/env python3
"""List all users in the database grouped by role."""

from app.database import engine
from sqlalchemy import text

def list_users_by_role():
    with engine.connect() as conn:
        result = conn.execute(text('SELECT email, role, full_name FROM "user" ORDER BY role, email'))
        users_by_role = {}
        
        for row in result:
            email, role, full_name = row
            if role not in users_by_role:
                users_by_role[role] = []
            users_by_role[role].append({'email': email, 'name': full_name or 'N/A'})
        
        print('\n' + '='*80)
        print('DATABASE USERS BY ROLE')
        print('='*80)
        
        for role in sorted(users_by_role.keys()):
            print(f'\n📋 {role.upper()} ({len(users_by_role[role])} users)')
            print('-' * 80)
            for user in users_by_role[role]:
                print(f'   📧 {user["email"]:45} | {user["name"]}')
        
        print('\n' + '='*80)
        total = sum(len(users) for users in users_by_role.values())
        print(f'TOTAL USERS: {total}')
        print('='*80 + '\n')

if __name__ == '__main__':
    list_users_by_role()
