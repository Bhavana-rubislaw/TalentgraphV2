# PostgreSQL Setup for TalentGraph V2

## Option 1: Install PostgreSQL Locally (Windows)

### 1. Download PostgreSQL
- Go to https://www.postgresql.org/download/windows/
- Download PostgreSQL 16 installer
- Run the installer and follow the wizard

### 2. During Installation
- Set password for `postgres` user (remember this!)
- Default port: `5432` (keep default)
- Install pgAdmin 4 (GUI tool - recommended)

### 3. Create Database
Open pgAdmin or use psql command line:

```sql
-- Create database
CREATE DATABASE talentgraph_v2;

-- Optional: Create dedicated user
CREATE USER talentgraph WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE talentgraph_v2 TO talentgraph;
```

### 4. Update Environment Variables
Create a `.env` file in backend2/ directory:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/talentgraph_v2
APP_JWT_SECRET=talentgraph-secret-key-v2-2024
```

Or if you created a dedicated user:
```env
DATABASE_URL=postgresql://talentgraph:your_secure_password@localhost:5432/talentgraph_v2
APP_JWT_SECRET=talentgraph-secret-key-v2-2024
```

---

## Option 2: Docker PostgreSQL (Recommended for Development)

### 1. Install Docker Desktop
- Download from https://www.docker.com/products/docker-desktop/
- Install and start Docker Desktop

### 2. Run PostgreSQL Container
```powershell
docker run --name talentgraph-postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=talentgraph_v2 `
  -p 5432:5432 `
  -d postgres:16-alpine
```

### 3. Verify Container is Running
```powershell
docker ps
```

### 4. Create .env File
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/talentgraph_v2
APP_JWT_SECRET=talentgraph-secret-key-v2-2024
```

### Docker Management Commands
```powershell
# Stop container
docker stop talentgraph-postgres

# Start container
docker start talentgraph-postgres

# Remove container (delete data)
docker rm -f talentgraph-postgres

# Connect to PostgreSQL CLI
docker exec -it talentgraph-postgres psql -U postgres -d talentgraph_v2
```

---

## Option 3: Cloud PostgreSQL (Production)

### Popular Providers:
- **Neon** (https://neon.tech) - Free tier, serverless
- **Supabase** (https://supabase.com) - Free tier, includes auth
- **Railway** (https://railway.app) - Simple deployment
- **Heroku Postgres** - Reliable, paid

### Steps:
1. Create account and database on chosen provider
2. Copy connection string (should look like `postgresql://user:pass@host:5432/db`)
3. Update `.env` file with your connection string

---

## Initialize Database

After setting up PostgreSQL, run:

```powershell
cd backend2
.\venv\Scripts\Activate.ps1

# Install new dependency (psycopg2)
pip install -r requirements.txt

# Create tables
python -c "from app.database import init_db; init_db()"

# Start server
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/talentgraph_v2"
$env:APP_JWT_SECRET = "talentgraph-secret-key-v2-2024"
uvicorn app.main:app --reload --port 8001
```

---

## Troubleshooting

### Connection refused
- Check PostgreSQL is running: `docker ps` or Windows Services
- Verify port 5432 is not blocked by firewall

### Authentication failed
- Double-check username/password in DATABASE_URL
- Ensure user has permissions on database

### psycopg2 installation error
- Try: `pip install psycopg2-binary` directly
- On Windows, you may need Visual C++ Build Tools

### Database doesn't exist
```sql
-- Connect to psql and run:
CREATE DATABASE talentgraph_v2;
```

---

## Verify Connection

```python
# Test script
python -c "from app.database import engine; print(engine.url); print('✅ Connected!')"
```
