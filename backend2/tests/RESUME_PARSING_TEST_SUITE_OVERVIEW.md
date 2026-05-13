# Resume Parsing Feature - Complete Test Suite Documentation

## 📋 Overview

This document provides a complete overview of all test cases created for the resume parsing feature across backend, frontend, and UI layers.

---

## 📁 Test Files Created

### Backend Tests (Automated - Ready to Run)
1. **`backend2/tests/test_resume_parsing.py`**
   - 21 automated tests covering unit, API, and integration scenarios
   - Uses pytest framework
   - **Status:** ✅ Ready to execute

### Frontend Tests (Template - Future Use)
2. **`frontend2/src/pages/__tests__/JobPreferencesPage.resume.test.tsx`**
   - Example component tests using Vitest + React Testing Library
   - Requires test framework setup
   - **Status:** 📝 Template for future implementation

### Manual Testing Guide
3. **`backend2/tests/RESUME_PARSING_TESTING_GUIDE.md`**
   - Comprehensive manual testing procedures
   - 17 test cases covering 30+ scenarios
   - **Status:** ✅ Ready for manual execution

### Documentation & Runners
4. **`backend2/tests/README_RESUME_PARSING_TESTS.md`**
   - Complete test suite documentation
   - Execution instructions and troubleshooting
   
5. **`backend2/tests/run_resume_parsing_tests.py`**
   - Interactive test runner for backend tests
   - Menu-driven test execution

---

## 🚀 Quick Start Guide

### Run Backend Tests (Automated)

#### Option 1: Run All Tests
```powershell
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2"
.\venv\Scripts\Activate.ps1
pytest tests/test_resume_parsing.py -v
```

#### Option 2: Interactive Menu
```powershell
python tests/run_resume_parsing_tests.py
```

#### Option 3: Specific Test Categories
```powershell
# Unit tests only
pytest tests/test_resume_parsing.py::TestResumeParserService -v

# API tests only  
pytest tests/test_resume_parsing.py::TestResumeParsingAPI -v

# Integration tests
pytest tests/test_resume_parsing.py::TestResumeParsingIntegration -v
```

### Run Manual UI Tests

1. Open `backend2/tests/RESUME_PARSING_TESTING_GUIDE.md`
2. Follow test procedures step-by-step
3. Document results in the provided templates
4. Use browser DevTools to capture errors

---

## 📊 Test Coverage Summary

### Backend Tests (test_resume_parsing.py)

#### ✅ Unit Tests - 13 tests
| Category | Tests | Coverage |
|----------|-------|----------|
| Skill Extraction | 2 | Basic + edge cases |
| Experience Extraction | 2 | Explicit years + date ranges |
| Seniority Detection | 3 | Senior, Lead, Manager levels |
| Education Detection | 3 | Doctorate, Master's, Bachelor's |
| Job Titles | 1 | Title extraction |
| Certifications | 1 | Certification extraction |
| Full Parsing | 1 | Complete workflow |

#### ✅ API Tests - 7 tests
| Category | Tests | Coverage |
|----------|-------|----------|
| Authentication | 1 | Auth required |
| File Validation | 4 | Type, size, empty file checks |
| Parsing Success | 2 | PDF + TXT parsing |
| Response Format | 1 | Structure validation |

#### ✅ Integration Tests - 1 test (3 scenarios)
| Category | Tests | Coverage |
|----------|-------|----------|
| E2E Workflows | 1 | Entry, Mid, Executive resumes |

**Total Backend:** 21 automated tests

---

### Frontend/UI Tests (Manual Guide)

#### ✅ Component Tests - 10 test cases
- FE-01: Upload button visibility
- FE-02: File validation (3 sub-tests)
- FE-03: Upload progress indication
- FE-04: Field auto-population
- FE-05: Confidence indicators
- FE-06: Manual override capability
- FE-07: Error handling (3 sub-tests)
- FE-08: Multiple uploads
- FE-09: Form state preservation
- FE-10: Accessibility

#### ✅ Visual Tests - 2 test cases
- UI-01: Upload banner styling
- UI-02: Toast notifications

#### ✅ Other Tests - 5 test cases
- E2E-01: End-to-end workflow
- PERF-01: Upload speed
- COMPAT-01: Cross-browser
- SEC-01: Security validation
- REG-01: Focus bug regression

**Total Manual:** 17 test cases (30+ scenarios)

---

## 🎯 Test Execution Matrix

### When to Run Which Tests

| Scenario | Tests to Run | Duration |
|----------|--------------|----------|
| **Before Commit** | Backend unit tests | ~2 seconds |
| **Before Push** | Backend unit + API tests | ~10-15 seconds |
| **Before Merge** | All backend tests | ~30 seconds |
| **Before Release** | All backend + Manual UI tests | ~45 minutes |
| **After UI Changes** | Manual UI tests only | ~30 minutes |
| **After Bug Fix** | Specific relevant tests + regression | ~5 minutes |

---

## 📈 Test Quality Metrics

### Coverage Goals
- ✅ Backend Service (`resume_parser.py`): **≥ 80%**
- ✅ API Endpoint (`candidates.py` parse endpoint): **≥ 70%**
- ✅ Critical User Paths: **100%**

### Success Criteria
- ✅ All critical tests pass (100%)
- ✅ High priority tests pass (≥ 95%)
- ✅ No P0/P1 bugs
- ✅ Upload success rate > 98%
- ✅ Average parse time < 5 seconds

---

## 🐛 Common Test Failures & Solutions

### Backend Test Failures

#### "401 Unauthorized"
**Cause:** Test user doesn't exist or wrong credentials  
**Fix:**
```powershell
# Verify test user exists
python -c "from app.database import engine; from sqlmodel import Session, select; from app.models import User; session = Session(engine); user = session.exec(select(User).where(User.email == 'sarah.anderson@email.com')).first(); print('User found:', user.email if user else 'NOT FOUND')"
```

#### "ImportError: No module named PyPDF2"
**Cause:** Missing dependencies  
**Fix:**
```powershell
pip install PyPDF2==3.0.1 python-docx==1.1.0
```

#### Tests Timeout
**Cause:** Backend not running or database issues  
**Fix:**
```powershell
# Check backend is running
curl.exe http://127.0.0.1:8001/health

# Check database connection
python -c "from app.database import engine; engine.connect(); print('DB OK')"
```

---

### Manual Test Failures

#### Resume Upload Shows 0 Fields
**Cause:** Low confidence scores (< 0.3 threshold)  
**Debug:**
1. Check backend logs: `Get-Content backend2\logs\talentgraph_v2.log -Tail 50`
2. Look for: `[RESUME PARSING] All confidence scores:`
3. If all < 0.3, resume format may not be recognized

**Fix Options:**
- Use resume with clearer formatting
- Add more explicit keywords (e.g., "10 years experience")
- Lower threshold temporarily for testing (already done: 0.5 → 0.3)

#### Focus Loss in Input Fields
**Cause:** Component re-rendering issue  
**Status:** ✅ FIXED (Section component moved outside)  
**Verify:**
1. Refresh browser (Ctrl+Shift+R)
2. Type continuously in Profile Name field
3. Should work without focus loss

---

## 📝 Test Documentation Standards

### Backend Test Structure
```python
def test_feature_name_scenario(self):
    """
    Brief description of what this test validates
    """
    # Arrange: Set up test data
    test_data = "..."
    
    # Act: Execute the function
    result = function_to_test(test_data)
    
    # Assert: Verify results
    assert result == expected, "Failure message"
```

### Manual Test Structure
```markdown
**Test ID:** XX-##
**Priority:** Critical/High/Medium/Low
**Objective:** What is being tested

#### Test Steps:
1. Step one
2. Step two
3. Step three

#### Expected Results:
- ✅ Expected outcome 1
- ✅ Expected outcome 2
```

---

## 🔄 Continuous Improvement

### Future Enhancements

#### Short-term (Next Sprint)
- [ ] Set up pytest coverage threshold enforcement
- [ ] Add more edge case tests (special characters, non-English)
- [ ] Create sample resume fixtures
- [ ] Add performance benchmarks

#### Medium-term (Next Quarter)
- [ ] Set up frontend testing framework (Vitest)
- [ ] Convert manual UI tests to automated (Playwright/Cypress)
- [ ] Add visual regression testing (Percy/Chromatic)
- [ ] Integrate with CI/CD pipeline

#### Long-term (Ongoing)
- [ ] Add fuzzing tests for parser robustness
- [ ] Test with real-world resume corpus (1000+ resumes)
- [ ] Machine learning test: confidence score accuracy
- [ ] Internationalization testing (non-English resumes)

---

## 📚 Related Documentation

### Core Files
- **Feature Implementation:** `docs/RESUME_PARSING_FIXES_APPLIED.md`
- **Analysis:** `docs/RESUME_PARSING_ANALYSIS.md`
- **Service Code:** `backend2/app/services/resume_parser.py`
- **API Endpoint:** `backend2/app/routers/candidates.py` (line 532+)
- **Frontend Component:** `frontend2/src/pages/JobPreferencesPage.tsx`

### Testing Resources
- [Pytest Documentation](https://docs.pytest.org/)
- [React Testing Library](https://testing-library.com/react)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)

---

## ✅ Pre-Release Testing Checklist

### Backend ✅
- [ ] All unit tests passing
- [ ] All API tests passing
- [ ] Integration tests passing
- [ ] Coverage > 80% for critical paths
- [ ] No security vulnerabilities
- [ ] Performance tests meet SLA

### Frontend/UI ✅
- [ ] Upload button visibility verified
- [ ] All file types tested (PDF, DOCX, TXT)
- [ ] File validation working
- [ ] Field auto-population verified
- [ ] Error handling graceful
- [ ] Toast notifications display correctly
- [ ] Focus bug regression verified fixed
- [ ] Accessibility tests pass
- [ ] Cross-browser testing complete

### Integration ✅
- [ ] End-to-end workflow tested
- [ ] Data persists correctly
- [ ] No data loss during parsing
- [ ] Manual overrides work
- [ ] Multiple uploads handled
- [ ] Backend logs show correct data

---

## 📞 Support & Questions

### For Test Execution Issues:
1. Check `README_RESUME_PARSING_TESTS.md` troubleshooting section
2. Review test comments in `test_resume_parsing.py`
3. Check backend logs: `backend2/logs/talentgraph_v2.log`

### For Test Failures:
1. Run with verbose output: `pytest -v -s`
2. Check if backend server is running
3. Verify test user credentials
4. Check database connectivity

### For Adding New Tests:
1. Follow existing test patterns
2. Use descriptive test names
3. Include docstrings explaining what's tested
4. Add to appropriate test class
5. Update this documentation

---

## 📊 Test Results Template

```markdown
# Test Execution Report

**Date:** YYYY-MM-DD
**Tested By:** [Name]
**Build/Version:** [Version]

## Backend Tests
- **Total:** 21
- **Passed:** __
- **Failed:** __
- **Skipped:** __
- **Duration:** __ seconds

### Failed Tests:
- [ ] Test name: Reason for failure

## Manual UI Tests  
- **Total Scenarios:** 30+
- **Passed:** __
- **Failed:** __
- **Blocked:** __

### Issues Found:
1. [Issue description]
2. [Issue description]

## Overall Status
[ ] ✅ All tests passed - Ready for release
[ ] ⚠️ Minor issues - Approved with notes
[ ] ❌ Critical issues - Not ready

**Notes:**
_______________________________________
```

---

**Last Updated:** May 12, 2026  
**Version:** 1.0.0  
**Maintained By:** Development Team  
**Next Review:** After any feature changes
