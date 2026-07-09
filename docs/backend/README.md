# TalentGraph V2 - Backend (FastAPI)

**Framework:** FastAPI + PostgreSQL + SQLModel ORM  
**Python Version:** 3.10+  
**Status:** Production-ready (Active development)

---

## Quick Start

### 1. Prerequisites
```bash
# Install Python 3.10+
python --version

# Install PostgreSQL
# See POSTGRESQL_SETUP.md for detailed setup
```

### 2. Environment Setup
```bash
# Navigate to backend directory
cd backend2

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\Activate.ps1

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Database Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your PostgreSQL credentials
# DATABASE_URL=postgresql://user:password@localhost:5432/talentgraph_v2
```

### 4. Database Initialization
```bash
# Initialize tables (first time only)
python -c "from app.database import init_db; init_db()"

# Or use the reset script (WARNING: drops all data)
python reset_db.py

# Seed with sample data (optional)
python scripts/test_data/seed_data_v2.py
```

### 5. Run Development Server
```bash
# Standard startup (port 8000)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Alternative port (8001)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### 6. Verify Backend
```bash
# Health check
curl http://localhost:8000/health

# API documentation (Swagger UI)
http://localhost:8000/docs

# Alternative docs (ReDoc)
http://localhost:8000/redoc
```

---

## Project Structure

```
backend2/
├── app/                          # Main application package
│   ├── routers/                  # API endpoints (organized by domain)
│   │   ├── auth.py               # Authentication & registration
│   │   ├── candidates.py         # Candidate profile management
│   │   ├── companies.py          # Company profile management
│   │   ├── jobs.py               # Job posting CRUD
│   │   ├── swipes.py             # Swipe/match logic
│   │   ├── applications.py       # Application tracking
│   │   ├── dashboard.py          # Dashboard & recommendations
│   │   ├── notifications.py      # In-app notifications
│   │   ├── meetings.py           # Interview scheduling
│   │   ├── messages.py           # Chat/messaging
│   │   ├── analytics.py          # Analytics & metrics
│   │   └── logs.py               # System logging (admin)
│   ├── services/                 # Business logic services
│   ├── middleware/               # Request/response middleware
│   ├── models.py                 # SQLModel database schemas
│   ├── database.py               # Database connection & session
│   ├── auth.py                   # JWT authentication utilities
│   └── main.py                   # FastAPI app entry point
│
├── scripts/                      # Utility scripts (organized)
│   ├── migrations/               # Database migrations (13 files)
│   │   ├── migrate_perf_indexes.py        # Day 1 performance indexes
│   │   ├── migrate_system_log.py          # System logging table
│   │   ├── migrate_job_lifecycle.py       # Job status workflow
│   │   └── ...
│   ├── testing/                  # Test & verification scripts (44 files)
│   │   ├── test_*.py             # Feature tests
│   │   ├── check_*.py            # Data integrity checks
│   │   └── verify_*.py           # Post-deployment verification
│   └── test_data/                # Seed & test data scripts (16 files)
│       ├── seed_data_v2.py       # Full sample dataset
│       ├── add_*.py              # Add specific test data
│       └── ...
│
├── logs/                         # Application logs (file-based)
├── tests/                        # Unit/integration tests (pytest)
├── .env                          # Environment variables (not in git)
├── .env.example                  # Environment template
├── requirements.txt              # Python dependencies
├── runtime.txt                   # Python version for deployment
└── reset_db.py                   # Database reset utility (DESTRUCTIVE)
```

---

## Key Configuration Files

### `.env` (Environment Variables)
```bash
# PostgreSQL connection
DATABASE_URL=postgresql://postgres:password@localhost:5432/talentgraph_v2

# JWT authentication
SECRET_KEY=<generate-with-openssl-rand-hex-32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200

# Email (Gmail)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=<app-password-16-chars>
SMTP_PORT=587
SMTP_SERVER=smtp.gmail.com

# Google Meet (optional)
GOOGLE_MEET_CLIENT_ID=<oauth-client-id>
GOOGLE_MEET_CLIENT_SECRET=<oauth-secret>
GOOGLE_MEET_REDIRECT_URI=http://localhost:3000/google-meet-callback
```

See `.env.example` for full template.

---

## API Documentation

### Base URL
- **Development:** `http://localhost:8000/api/v1`
- **Production:** `https://your-domain.com/api/v1`

### Authentication
All protected endpoints require JWT Bearer token:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/candidates/profile
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | User registration |
| POST | `/auth/login` | User login (returns JWT) |
| GET | `/candidates/profile` | Get candidate profile |
| GET | `/jobs/active` | List active jobs |
| POST | `/swipes/` | Record swipe action |
| POST | `/applications/` | Submit job application |
| GET | `/dashboard/candidate/recommendations` | Job recommendations |
| GET | `/notifications/` | User notifications |
| POST | `/meetings/schedule` | Schedule interview |
| GET | `/messages/conversations` | List conversations |
| GET | `/analytics/dashboard` | Analytics dashboard |

**Full API Reference:** http://localhost:8000/docs

---

## Database Management

### Migrations
All migration scripts are in `scripts/migrations/`. Run in order:

```bash
# Performance indexes (Day 1 optimization)
python scripts/migrations/migrate_perf_indexes.py

# System logging
python scripts/migrations/migrate_system_log.py

# Job lifecycle (status workflow)
python scripts/migrations/migrate_job_lifecycle.py

# Meeting management
python scripts/migrations/migrate_meeting_management.py
```

### Testing
```bash
# Run all tests
pytest tests/

# Run specific test file
pytest tests/test_auth.py

# Run with coverage
pytest --cov=app tests/
```

### Data Seeding
```bash
# Full sample dataset (recommended)
python scripts/test_data/seed_data_v2.py

# Quick seed (minimal data)
python scripts/test_data/quick_seed.py

# Custom users only
python scripts/test_data/seed_custom_users.py
```

### Database Reset
```bash
# WARNING: Drops all tables and data
python reset_db.py
```

---

## Performance Optimization

### Day 1 DB Optimization (Applied ✅)
- **4 indexes added:** composite + partial indexes for read-heavy queries
- **N+1 elimination:** Dashboard batch queries (96% fewer queries)
- **Details:** See [DB_OPTIMIZATION_DAY1_COMPLETE.md](DB_OPTIMIZATION_DAY1_COMPLETE.md)

### Connection Pool Settings
Current configuration (in `app/database.py`):
- Pool size: 10
- Max overflow: 20
- Total connections: 30 max

Adjust for production load based on traffic patterns.

---

## Logging System

### File Logging
- **Location:** `logs/talentgraph_v2.log`
- **Rotation:** 50MB per file, 10 backups
- **Format:** JSON structured logs

### Database Logging
- **Table:** `systemlog`
- **Retention:** Configurable (default: 90 days)
- **Admin Dashboard:** `/admin/logs` (requires admin role)

**Full Guide:** [COMPREHENSIVE_LOGGING_GUIDE.md](COMPREHENSIVE_LOGGING_GUIDE.md)

---

## Deployment

### Production Checklist
- [ ] Set strong `SECRET_KEY` in `.env`
- [ ] Update `DATABASE_URL` to production PostgreSQL
- [ ] Configure email credentials (SMTP)
- [ ] Set `DEBUG=False` in production
- [ ] Run all migrations: `scripts/migrations/migrate_*.py`
- [ ] Apply performance indexes: `migrate_perf_indexes.py`
- [ ] Set up HTTPS/SSL certificates
- [ ] Configure CORS origins in `app/main.py`
- [ ] Set up monitoring (logs, metrics)

### Deployment Guides
- **Render:** [RENDER_DEPLOYMENT_GUIDE.md](RENDER_DEPLOYMENT_GUIDE.md)
- **PostgreSQL:** [POSTGRESQL_SETUP.md](POSTGRESQL_SETUP.md)

---

## Troubleshooting

### Common Issues

**Database Connection Error**
```bash
# Check PostgreSQL is running
pg_ctl status

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

**Import Errors**
```bash
# Ensure virtual environment is activated
which python  # Should point to venv/bin/python

# Reinstall dependencies
pip install -r requirements.txt
```

**Port Already in Use**
```bash
# Check what's using port 8000
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # Linux/Mac

# Use alternative port
uvicorn app.main:app --reload --port 8001
```

**Migration Errors**
```bash
# Check migration script logs
python scripts/migrations/migrate_<name>.py

# Verify table exists
psql -d talentgraph_v2 -c "\dt"
```

---

## Development Workflow

### Adding a New Feature
1. **Model:** Update `app/models.py` with new SQLModel classes
2. **Migration:** Create `scripts/migrations/migrate_<feature>.py`
3. **Router:** Add endpoint in `app/routers/<domain>.py`
4. **Service:** Implement business logic in `app/services/<service>.py`
5. **Test:** Add tests in `tests/test_<feature>.py`
6. **Docs:** Update API documentation

### Code Standards
- **Style:** Follow PEP 8 (use `black` formatter)
- **Type Hints:** Use type annotations for all functions
- **Docstrings:** Document all public functions/classes
- **Error Handling:** Use FastAPI HTTPException for API errors
- **Logging:** Use structured logging for debugging

---

## Monitoring & Observability

### Health Check
```bash
curl http://localhost:8000/health
# Returns: {"status": "healthy", "timestamp": "..."}
```

### Database Metrics
```bash
# Check table sizes
python scripts/testing/check_phase3_4_tables.py

# Verify analytics data
python scripts/testing/verify_analytics_fix.py
```

### Performance Audit
```bash
# Run Day 1 performance audit (reusable)
python db_perf_day1.py
```

---

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Framework** | FastAPI | 0.104+ |
| **Database** | PostgreSQL | 14+ |
| **ORM** | SQLModel | 0.0.14+ |
| **Authentication** | JWT (python-jose) | - |
| **CORS** | fastapi.middleware.cors | - |
| **Email** | SMTP (Gmail) | - |
| **Logging** | Python logging + DB | - |

---

## Resources

### Documentation
- [START_HERE.md](../START_HERE.md) - Project overview
- [QUICK_START.md](../QUICK_START.md) - Full setup guide
- [COMPREHENSIVE_LOGGING_GUIDE.md](COMPREHENSIVE_LOGGING_GUIDE.md) - Logging system
- [DB_OPTIMIZATION_DAY1_COMPLETE.md](DB_OPTIMIZATION_DAY1_COMPLETE.md) - Performance optimization

### Guides
- [POSTGRESQL_SETUP.md](POSTGRESQL_SETUP.md) - Database setup
- [GMAIL_APP_PASSWORD_GUIDE.md](GMAIL_APP_PASSWORD_GUIDE.md) - Email configuration
- [EMAIL_SETUP.md](EMAIL_SETUP.md) - Email integration
- [RENDER_DEPLOYMENT_GUIDE.md](RENDER_DEPLOYMENT_GUIDE.md) - Cloud deployment

### Feature Summaries
- [JOB_LIFECYCLE_SUMMARY.md](../JOB_LIFECYCLE_SUMMARY.md) - Job status workflow
- [INTERVIEW_MANAGEMENT_SUMMARY.md](../INTERVIEW_MANAGEMENT_SUMMARY.md) - Interview scheduling
- [MESSAGING_IMPLEMENTATION_GUIDE.md](../MESSAGING_IMPLEMENTATION_GUIDE.md) - Chat system

---

## Support & Contributing

### Getting Help
- Check existing documentation in project root
- Review API docs: http://localhost:8000/docs
- Check logs: `logs/talentgraph_v2.log`

### Reporting Issues
Include:
1. Error message/stack trace
2. Steps to reproduce
3. Environment details (Python version, OS)
4. Relevant log entries

---

## License

Proprietary - TalentGraph V2  
All rights reserved.
