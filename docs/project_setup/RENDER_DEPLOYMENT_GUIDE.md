# 🚀 Deploy TalentGraph V2 to Render - Complete Guide

## 📋 Pre-Deployment Setup

### 1. Create Render Build Script
```bash
# In backend2/ directory
echo "pip install -r requirements.txt && uvicorn app.main:app --host 0.0.0.0 --port \$PORT" > start.sh
```

### 2. Update Frontend for Production
Add to frontend2/package.json scripts:
```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### 3. Environment Variables Setup
Create backend2/.env.example with:
```
DATABASE_URL=postgresql://user:pass@host:port/dbname
JWT_SECRET_KEY=your-secret-key
CORS_ORIGINS=https://your-frontend-url.onrender.com
```

## 🌐 Render Deployment Steps

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub account
3. Connect your TalentgraphV2 repository

### Step 2: Deploy Database (5 minutes)
1. Click "New +" → "PostgreSQL"
2. Name: `talentgraph-db`
3. Database: `talentgraph_v2`  
4. User: `talentgraph_user`
5. Click "Create Database"
6. **Copy the Internal Database URL** (starts with postgresql://)

### Step 3: Deploy Backend API (5 minutes)
1. Click "New +" → "Web Service"
2. Connect repository: `Bhavana-rubislaw/TalentgraphV2`
3. Settings:
   - **Name**: `talentgraph-backend`
   - **Root Directory**: `backend2`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free tier
4. Environment Variables:
   ```
   DATABASE_URL = [paste database URL from step 2]
   JWT_SECRET_KEY = your-super-secret-key-here
   CORS_ORIGINS = https://talentgraph-frontend.onrender.com
   ```
5. Click "Create Web Service"

### Step 4: Deploy Frontend (5 minutes)  
1. Click "New +" → "Static Site"
2. Connect repository: `Bhavana-rubislaw/TalentgraphV2`
3. Settings:
   - **Name**: `talentgraph-frontend`
   - **Root Directory**: `frontend2`  
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Environment Variables:
   ```
   VITE_API_URL = https://talentgraph-backend.onrender.com
   ```
5. Click "Create Static Site"

### Step 5: Update Frontend API URL
In frontend2/src/api/client.ts:
```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://talentgraph-backend.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

## 📱 Mobile Access URLs
- **Frontend**: https://talentgraph-frontend.onrender.com
- **Backend API**: https://talentgraph-backend.onrender.com

## 🔧 Post-Deployment Setup

### Initialize Database
1. Go to backend service logs in Render dashboard
2. Open web service shell
3. Run database migrations:
```bash
python -c "
from app.database import engine
from app.models import SQLModel
SQLModel.metadata.create_all(engine)
"
```

### Seed Initial Data (Optional)
```bash
python simple_seed.py
```

## 📊 Expected Costs
- **Database**: Free (1GB storage, 1 month retention)
- **Backend**: Free (750 hours/month, sleeps after 15min inactivity)  
- **Frontend**: Free (100GB bandwidth/month)
- **Total**: $0/month on free tier

## 📱 Mobile Testing
1. Open https://talentgraph-frontend.onrender.com on iPhone
2. Test responsive layouts
3. Add to Home Screen for app-like experience

## 🚨 Important Notes
- Free services sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- For production use, upgrade to paid plans ($7-25/month)