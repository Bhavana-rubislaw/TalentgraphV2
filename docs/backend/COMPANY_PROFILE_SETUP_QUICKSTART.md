# Company Profile Setup - Quick Start Guide

## New Recruiter/Company Signup Flow

### What Changed?
After recruiter/company signup, users are now redirected to a **Company/Profile Setup** page instead of directly to the Recruiter Dashboard. This ensures all company information is collected upfront for a better experience.

---

## Flow Overview

```
Recruiter Signup → Token Saved → Company Profile Setup → Recruiter Dashboard
```

---

## Required Information

### Personal Details
- ✅ **Full Name** (required)
- ✅ **Company Role** (required): Recruiter, HR, or Admin

### Company Details
- ✅ **Company Name** (required)
- Company Website
- Company Location
- Department/Team

### Contact Information
- Phone Number
- LinkedIn Profile

### Hiring Information
- Hiring Focus (select job categories)
- Company Description

---

## How to Test

### 1. New Recruiter Signup
```
1. Go to http://localhost:5173/signup
2. Click "Company User" or use ?type=company
3. Fill in email, name, password
4. Select company role: Recruiter
5. Click "Sign Up"
6. You'll be redirected to Company Profile Setup
7. Complete the form (name, company name, role required)
8. Click "Complete Setup & Continue"
9. You'll be redirected to Recruiter Dashboard
```

### 2. Existing Recruiter Login
```
1. Go to http://localhost:5173/signin
2. Enter email and password
3. Select "Company User"
4. Click "Sign In"
5. If profile incomplete: Redirected to setup
6. If profile complete: Go directly to dashboard
```

### 3. Update Profile Later
```
1. Log in to Recruiter Dashboard
2. Go to Profile section
3. Use the extended profile update endpoint
```

---

## API Endpoints

### Setup Profile
```
POST /company/setup-profile
Authorization: Bearer <token>

Body:
{
  "full_name": "John Doe",
  "company_name": "Acme Corp",
  "company_role": "recruiter",
  "company_website": "https://acme.com",
  "company_location": "San Francisco, CA",
  "department": "Engineering",
  "phone_number": "+1-555-0123",
  "linkedin_profile": "https://linkedin.com/in/johndoe",
  "hiring_focus": "[\"Software Engineering\", \"Data Science\"]",
  "company_description": "Leading tech company..."
}
```

### Check Profile Status
```
GET /company/profile-status
Authorization: Bearer <token>

Response:
{
  "profile_complete": true,
  "company_exists": true,
  "company_name": "Acme Corp"
}
```

---

## Frontend Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/company-profile-setup` | Recruiters (authenticated) | Company profile setup form |
| `/recruiter-dashboard` | Recruiters (profile complete) | Main dashboard |
| `/recruiter/profile` | Recruiters (profile complete) | Profile management |

---

## Troubleshooting

### Can't access Recruiter Dashboard
**Reason**: Profile setup not complete  
**Solution**: Complete the profile setup form at `/company-profile-setup`

### Form doesn't save
**Reason**: Backend not running or token expired  
**Solution**: Check backend is running on port 8001, sign in again

### Already signed up before this update
**Reason**: Old accounts don't have `profile_complete` flag set  
**Solution**: Either:
1. Complete the profile setup form once
2. Or manually update database: `UPDATE company SET profile_complete = true WHERE user_id = <your_user_id>`

---

## Candidate Flow (Unchanged)

Candidates are **not affected** by this change:
```
Candidate Signup → Token Saved → Candidate Dashboard
```

Candidates continue to use their existing profile setup flow.

---

## Quick Commands

### Start Backend
```powershell
cd backend2
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8001
```

### Start Frontend
```powershell
cd frontend2
npm run dev
```

### Run Migration (if needed)
```powershell
cd backend2
python migrate_company_profile_fields.py
```

---

## Support

For issues or questions:
1. Check backend logs for API errors
2. Check browser console for frontend errors
3. Verify token is saved in localStorage
4. Verify profile_complete status via API

---

**Last Updated**: April 30, 2026  
**Status**: ✅ Ready for Testing
