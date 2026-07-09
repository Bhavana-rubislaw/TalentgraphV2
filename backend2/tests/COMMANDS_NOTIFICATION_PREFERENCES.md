# Notification Preferences Tests - Command Cheat Sheet

## Copy-Paste Commands for Testing Notification Preferences

---

## 🚀 STEP 1: Start Backend (Required)

```powershell
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2"
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

**Wait for**: `Application startup complete`

---

## ✅ STEP 2: Run Tests (Choose One)

### Option A: Quick Validation (30 seconds)
```powershell
# Open NEW terminal
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2\tests"
python quick_validate_notification_preferences.py
```

### Option B: Manual Integration Tests (3 minutes)
```powershell
# Open NEW terminal
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2\tests"
python manual_test_notification_preferences.py
```

### Option C: Automated Pytest (2 minutes)
```powershell
# Open NEW terminal
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2\tests"
pytest test_notification_preferences.py -v
```

---

## 🔧 Troubleshooting Commands

### If test users don't exist:
```powershell
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2"
.\venv\Scripts\Activate.ps1
python seed_data_v2.py
```

### If NotificationPreferences table doesn't exist:
```powershell
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2"
.\venv\Scripts\Activate.ps1
python -c "from app.database import engine; from app.models import *; from sqlmodel import SQLModel; SQLModel.metadata.create_all(engine); print('Tables created')"
```

### If dependencies missing:
```powershell
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2"
.\venv\Scripts\Activate.ps1
pip install pytest requests
```

### Check backend is running:
```powershell
curl.exe -s http://127.0.0.1:8001/health
```
**Expected**: `{"status":"ok"}`

---

## 📊 Specific Test Commands

### Run only candidate tests:
```powershell
pytest test_notification_preferences.py::TestCandidateNotificationPreferences -v
```

### Run only recruiter tests:
```powershell
pytest test_notification_preferences.py::TestRecruiterNotificationPreferences -v
```

### Run only role isolation tests:
```powershell
pytest test_notification_preferences.py::TestRoleIsolation -v
```

### Run with coverage report:
```powershell
pytest test_notification_preferences.py --cov=app.routers.notification_preferences --cov-report=html
```

### Run and stop on first failure:
```powershell
pytest test_notification_preferences.py -x -v
```

---

## 🧪 Manual API Testing Commands

### Test candidate login:
```powershell
$body = '{"email":"sarah.anderson@email.com","password":"Kutty_1304"}'
$res = Invoke-RestMethod -Uri "http://localhost:8001/auth/candidate/login" -Method POST -Body $body -ContentType "application/json"
$token = $res.access_token
Write-Host "Token: $token"
```

### Get candidate preferences:
```powershell
$headers = @{"Authorization" = "Bearer $token"}
$prefs = Invoke-RestMethod -Uri "http://localhost:8001/notification-preferences" -Method GET -Headers $headers
$prefs | ConvertTo-Json
```

### Update candidate preference:
```powershell
$updateData = @{
    event_type = "application_status"
    in_app_enabled = $true
    email_enabled = $false
    in_app_frequency = "daily"
    email_frequency = "daily"
    priority = "normal"
} | ConvertTo-Json

$updated = Invoke-RestMethod -Uri "http://localhost:8001/notification-preferences" -Method POST -Body $updateData -Headers $headers -ContentType "application/json"
$updated | ConvertTo-Json
```

### Test recruiter login:
```powershell
$body = '{"email":"admin.jennifer@techcorp.com","password":"Kutty_1304"}'
$res = Invoke-RestMethod -Uri "http://localhost:8001/auth/company/login" -Method POST -Body $body -ContentType "application/json"
$token = $res.access_token
Write-Host "Token: $token"
```

### Get recruiter preferences:
```powershell
$headers = @{"Authorization" = "Bearer $token"}
$prefs = Invoke-RestMethod -Uri "http://localhost:8001/notification-preferences" -Method GET -Headers $headers
$prefs | ConvertTo-Json
```

---

## 📈 All Tests At Once

```powershell
# Run everything in sequence
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2\tests"

# 1. Quick validation
python quick_validate_notification_preferences.py

# 2. Automated tests
pytest test_notification_preferences.py -v

# 3. Manual integration tests
python manual_test_notification_preferences.py
```

---

## 🎯 One-Liner Complete Test Run

```powershell
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2\tests" ; python quick_validate_notification_preferences.py ; pytest test_notification_preferences.py -v ; python manual_test_notification_preferences.py
```

---

## 📝 Expected Success Output

### Quick Validation:
```
1. Checking backend health... ✓ OK
2. Testing candidate preferences... ✓ OK (8 preferences)
3. Testing recruiter preferences... ✓ OK (6 preferences)
✅ ALL CHECKS PASSED (3/3)
```

### Automated Tests:
```
==================== 25 passed in 2.45s ====================
```

### Manual Integration Tests:
```
Results: 10/10 tests passed
╔════════════════════════════════════════════╗
║  ALL TESTS PASSED ✓                        ║
║  Notification Preferences Working!         ║
╚════════════════════════════════════════════╝
```

---

## 🔍 Verification Commands

### Check how many preferences exist for a user:
```powershell
# Login first (see above), then:
$prefs = Invoke-RestMethod -Uri "http://localhost:8001/notification-preferences" -Method GET -Headers $headers
Write-Host "Total preferences: $($prefs.Count)"
Write-Host "Event types: $($prefs.event_type -join ', ')"
```

### View specific preference:
```powershell
$prefs | Where-Object {$_.event_type -eq "application_status"} | ConvertTo-Json
```

### Count enabled email notifications:
```powershell
($prefs | Where-Object {$_.email_enabled -eq $true}).Count
```

---

**Quick Reference**: Save this file for easy copy-paste access to all test commands!
