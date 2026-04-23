# 🚀 TalentGraph V2 - Git Repository Setup Guide

## 📋 Pre-Commit Checklist

### 1. **Clean Up Sensitive Data** ⚠️
Before committing, ensure no sensitive information is exposed:

```bash
# Check for any .env files with real credentials
ls -la backend2/.env*
ls -la frontend2/.env*

# Remove any log files with sensitive data
rm backend2/*.log
rm backend2/talentgraph_v2.log*
```

### 2. **Verify .gitignore Coverage**
✅ Created comprehensive .gitignore covering:
- Python virtual environments (venv/)
- Node.js dependencies (node_modules/)  
- Environment files (.env, .env.local, etc.)
- Build artifacts (dist/, build/)
- Log files (*.log)
- IDE files (.vscode/, .idea/)
- OS files (.DS_Store, Thumbs.db)
- Database files (*.db, *.sqlite)

## 🔧 Repository Setup Steps

### **OPTION A: Initialize New Repository**

```bash
# Navigate to project root
cd C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2

# Initialize git repository
git init

# Add remote origin (replace with your repo URL)
git remote add origin https://github.com/yourusername/talentgraph-v2.git

# Configure user (if not set globally)
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### **OPTION B: Clone Existing Repository**

```bash
# Clone your existing repository
git clone https://github.com/yourusername/existing-repo.git
cd existing-repo

# Copy your TalentGraph V2 files into the cloned directory
# (Preserve the .gitignore we created)
```

## 📦 Commit Process

### 1. **Add Files Selectively**

```bash
# Add the .gitignore first
git add .gitignore

# Add backend files (excluding ignored items)
git add backend2/

# Add frontend files (excluding node_modules)
git add frontend2/

# Add documentation
git add commands.txt
git add README.md  # (if you create one)

# Check what will be committed
git status
```

### 2. **Verify No Sensitive Data**

```bash
# Check staged files for sensitive content
git diff --cached | grep -i "password\|secret\|key\|token"

# If sensitive data found, unstage and fix
git reset HEAD filename
```

### 3. **Create Meaningful Commit**

```bash
# Initial commit with descriptive message
git commit -m "feat: Initial TalentGraph V2 full-stack application

- FastAPI backend with PostgreSQL integration
- React TypeScript frontend with Vite
- JWT authentication system
- Job posting and candidate matching features
- Swipe-based interface for recruitment
- Admin dashboard for team management
- Comprehensive API client with 40+ endpoints
- Error boundaries and proper routing
- Complete styling with modern UI components

Backend Features:
- User authentication (candidate/company)
- Job profile management
- Real-time matching algorithm
- Application tracking system
- Role-based access control

Frontend Features:  
- Responsive dashboard designs
- Interactive swipe cards
- Job preferences configuration
- File upload components
- Protected route system"

# Push to repository
git push -u origin main
# or git push -u origin master (depending on default branch)
```

## 🏗️ Repository Structure After Commit

```
talentgraph-v2/
├── .gitignore                    # Comprehensive ignore rules
├── commands.txt                  # Development command reference
├── README.md                     # Project documentation (recommended)
├── backend2/                     # FastAPI Python backend
│   ├── app/                      # Main application code
│   │   ├── models.py            # Database models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── main.py              # FastAPI app entry
│   │   └── routers/             # API route handlers
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example            # Environment template
│   └── *.py                    # Utility scripts
└── frontend2/                    # React TypeScript frontend
    ├── src/                      # Source code
    │   ├── components/          # Reusable components
    │   ├── pages/              # Route components  
    │   ├── api/                # API client
    │   └── styles/             # CSS files
    ├── package.json            # Node.js dependencies
    ├── vite.config.ts          # Vite configuration
    └── tsconfig.json           # TypeScript config
```

## 🔒 Security Best Practices

### Files That Should NEVER be Committed:
- ❌ `backend2/.env` (real environment variables)
- ❌ `backend2/venv/` (Python virtual environment)
- ❌ `frontend2/node_modules/` (Node.js dependencies)
- ❌ `*.log` (log files with potential sensitive data)
- ❌ Database files with real data
- ❌ SSL certificates or API keys

### Files That SHOULD be Committed:
- ✅ `backend2/.env.example` (environment template)
- ✅ `backend2/requirements.txt` (Python dependencies)
- ✅ `frontend2/package.json` (Node.js dependencies)
- ✅ All source code (`.py`, `.tsx`, `.ts`, `.css`)
- ✅ Configuration files (`tsconfig.json`, `vite.config.ts`)
- ✅ Documentation files (`.md`)

## 🚀 Next Steps After Commit

1. **Create README.md** with setup instructions
2. **Add CI/CD pipeline** (GitHub Actions/GitLab CI)
3. **Set up deployment** configuration
4. **Configure issue templates** and pull request templates
5. **Add license** file if open source
6. **Create development branch** protection rules

## 🆘 Troubleshooting

### Large File Issues:
```bash
# If files too large (>100MB)
git lfs track "*.large_extension"
```

### Accidental Commits:
```bash
# Remove file from last commit
git reset --soft HEAD~1
git reset HEAD filename
git commit -m "Updated commit message"
```

### Clean Working Directory:
```bash
# Remove untracked files and directories
git clean -fd
```