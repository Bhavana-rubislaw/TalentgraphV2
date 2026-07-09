# Resume Parsing Feature - Test Suite

Complete test suite for the resume parsing feature covering backend service, API endpoints, and frontend/UI integration.

---

## 📁 Test Files

### Backend Tests
- **`test_resume_parsing.py`** - Comprehensive backend test suite
  - Unit tests for ResumeParser service
  - API endpoint integration tests
  - End-to-end workflow tests

### Documentation
- **`RESUME_PARSING_TESTING_GUIDE.md`** - Manual testing guide for frontend/UI
  - Step-by-step test procedures
  - Visual regression tests
  - Browser compatibility tests
  - Security and performance tests

### Test Runners
- **`run_resume_parsing_tests.py`** - Interactive test runner script

---

## 🚀 Quick Start

### Run All Backend Tests
```powershell
cd "C:\Users\BhavanaBayya\Documents\WORK\TalentgraphV2\backend2"
.\venv\Scripts\Activate.ps1
pytest tests/test_resume_parsing.py -v
```

### Run Specific Test Classes
```powershell
# Unit tests only
pytest tests/test_resume_parsing.py::TestResumeParserService -v

# API tests only
pytest tests/test_resume_parsing.py::TestResumeParsingAPI -v

# Integration tests only
pytest tests/test_resume_parsing.py::TestResumeParsingIntegration -v
```

### Run with Coverage Report
```powershell
pytest tests/test_resume_parsing.py --cov=app.services.resume_parser --cov=app.routers.candidates --cov-report=html
```

### Interactive Test Runner
```powershell
python tests/run_resume_parsing_tests.py
```

---

## 📊 Test Coverage

### Backend Tests (test_resume_parsing.py)

#### Test Class: TestResumeParserService
**Purpose:** Unit tests for resume parsing logic

| Test | Description | Priority |
|------|-------------|----------|
| `test_extract_skills_basic` | Verify skill extraction from text | High |
| `test_extract_skills_no_skills` | Handle text with no skills | Medium |
| `test_extract_experience_years_explicit` | Extract explicit years (e.g., "10 years") | High |
| `test_extract_experience_years_date_range` | Calculate years from dates | High |
| `test_extract_seniority_level_senior` | Extract "senior" level | Critical |
| `test_extract_seniority_level_lead` | Extract "lead" for VP/Director | Critical |
| `test_extract_seniority_level_manager` | Extract "manager" for C-level | Critical |
| `test_extract_education_doctorate` | Extract PhD/Doctorate | High |
| `test_extract_education_masters` | Extract Master's degree | High |
| `test_extract_education_bachelors` | Extract Bachelor's degree | High |
| `test_extract_job_titles` | Extract job titles from resume | Medium |
| `test_extract_certifications` | Extract certifications | Medium |
| `test_parse_resume_for_job_preferences_complete` | Full parsing workflow | Critical |

**Total:** 13 unit tests

#### Test Class: TestResumeParsingAPI
**Purpose:** API endpoint integration tests

| Test | Description | Priority |
|------|-------------|----------|
| `test_parse_resume_endpoint_without_auth` | Verify auth required | Critical |
| `test_parse_resume_endpoint_invalid_file_type` | Reject invalid files | High |
| `test_parse_resume_endpoint_file_too_large` | Reject files >10MB | High |
| `test_parse_resume_endpoint_empty_file` | Reject empty files | High |
| `test_parse_resume_endpoint_pdf_success` | Parse PDF successfully | Critical |
| `test_parse_resume_endpoint_txt_success` | Parse TXT successfully | Critical |
| `test_parse_resume_response_structure` | Verify response format | Critical |

**Total:** 7 API tests

#### Test Class: TestResumeParsingIntegration
**Purpose:** End-to-end workflow tests

| Test | Description | Priority |
|------|-------------|----------|
| `test_full_workflow_with_various_resumes` | Test multiple resume formats | Critical |

**Total:** 1 integration test (covers 3 scenarios)

**Overall Total:** 21 automated backend tests

---

### Frontend/UI Tests (Manual - RESUME_PARSING_TESTING_GUIDE.md)

#### Component Tests
- FE-01: Resume upload button visibility
- FE-02: File input validation (3 sub-tests)
- FE-03: Upload progress indication
- FE-04: Field auto-population
- FE-05: Confidence score indication
- FE-06: Manual override capability
- FE-07: Error handling (3 sub-tests)
- FE-08: Multiple resume upload
- FE-09: Form state preservation
- FE-10: Accessibility testing

#### Visual Tests
- UI-01: Upload banner styling
- UI-02: Toast notifications

#### Integration Tests
- E2E-01: End-to-end workflow

#### Other Tests
- PERF-01: Upload speed
- COMPAT-01: Cross-browser testing
- SEC-01: File upload security
- REG-01: Input focus regression

**Total:** 17 manual test cases covering 30+ scenarios

---

## 🎯 Test Execution Strategy

### Phase 1: Unit Tests (Fast)
```powershell
pytest tests/test_resume_parsing.py::TestResumeParserService -v
```
**Duration:** ~2 seconds  
**Run:** Before every commit

### Phase 2: API Tests (Medium)
```powershell
pytest tests/test_resume_parsing.py::TestResumeParsingAPI -v
```
**Duration:** ~10-15 seconds  
**Run:** Before pushing to repo

### Phase 3: Integration Tests (Slow)
```powershell
pytest tests/test_resume_parsing.py::TestResumeParsingIntegration -v
```
**Duration:** ~20-30 seconds  
**Run:** Before merging to main branch

### Phase 4: Manual UI Tests
**Duration:** ~30-45 minutes  
**Run:** Before release, after UI changes

---

## 📋 Prerequisites

### Backend Testing
1. **Python Dependencies:**
   ```powershell
   pip install pytest pytest-cov
   ```

2. **Test Database:**
   - Ensure test database is set up
   - Run migrations if needed

3. **Test User:**
   - User: `sarah.anderson@email.com`
   - Password: `Kutty_1304`

### Frontend Testing
1. **Sample Resume Files:**
   - Create test PDFs with known content
   - Create test DOCX files
   - Create test TXT files

2. **Browsers:**
   - Chrome/Edge (latest)
   - Firefox (latest)
   - Safari (optional)

---

## 🐛 Debugging Failed Tests

### View Detailed Output
```powershell
pytest tests/test_resume_parsing.py -v -s
```

### Run Single Test
```powershell
pytest tests/test_resume_parsing.py::TestResumeParserService::test_extract_skills_basic -v -s
```

### Stop on First Failure
```powershell
pytest tests/test_resume_parsing.py -x
```

### See Print Statements
```powershell
pytest tests/test_resume_parsing.py -v -s --capture=no
```

### Debug with PDB
```powershell
pytest tests/test_resume_parsing.py --pdb
```

---

## 📈 Test Metrics

### Current Status
- **Total Tests:** 21 automated + 17 manual
- **Pass Rate:** TBD (run tests to determine)
- **Code Coverage:** TBD (run with `--cov` flag)
- **Average Duration:** ~30 seconds for all automated tests

### Success Criteria
- ✅ All critical tests pass (100%)
- ✅ All high priority tests pass (≥95%)
- ✅ Code coverage ≥80% for resume_parser.py
- ✅ Code coverage ≥70% for parse endpoint in candidates.py
- ✅ No security vulnerabilities

---

## 🔄 Continuous Integration

### Recommended CI Pipeline
```yaml
# .github/workflows/resume-parsing-tests.yml (example)
name: Resume Parsing Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      - name: Install dependencies
        run: |
          pip install -r backend2/requirements.txt
          pip install pytest pytest-cov
      - name: Run tests
        run: |
          cd backend2
          pytest tests/test_resume_parsing.py -v --cov --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

## 📝 Test Data

### Sample Resume Templates

#### High Confidence Resume (tests/fixtures/senior_engineer_resume.txt)
```
JOHN DOE
Senior Software Engineer

EXPERIENCE: 10+ years
EDUCATION: Master's in Computer Science
SKILLS: Python, React, AWS, Docker, PostgreSQL
```

#### Low Confidence Resume (tests/fixtures/minimal_resume.txt)
```
Name: Jane
Job: Developer
```

#### C-Level Resume (tests/fixtures/cto_resume.txt)
```
ROBERT WILLIAMS
Chief Technology Officer

15 years leading engineering teams
Ph.D. in Computer Science
```

---

## 🔧 Troubleshooting

### Common Issues

#### Issue: "ImportError: No module named pytest"
**Solution:**
```powershell
pip install pytest pytest-cov
```

#### Issue: "401 Unauthorized" in API tests
**Solution:**
- Ensure test user exists in database
- Check credentials in `get_auth_headers()`
- Verify JWT secret key is correct

#### Issue: "FileNotFoundError" for resume files
**Solution:**
- Create test fixtures directory
- Add sample resume files
- Update test paths

#### Issue: Tests timing out
**Solution:**
- Increase pytest timeout: `pytest --timeout=60`
- Check if backend server is running
- Check database connection

---

## 📚 Additional Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing Guide](https://fastapi.tiangolo.com/tutorial/testing/)
- [Test-Driven Development Best Practices](https://testdriven.io/blog/modern-tdd/)

---

## ✅ Test Execution Checklist

Before running tests:
- [ ] Virtual environment activated
- [ ] Backend server running (for integration tests)
- [ ] Database initialized
- [ ] Test user created
- [ ] Dependencies installed (`pytest`, `pytest-cov`)

After running tests:
- [ ] All tests passed
- [ ] Coverage report reviewed
- [ ] Failed tests documented
- [ ] Bugs filed for failures

---

## 📞 Support

For issues or questions about the test suite:
1. Check this README
2. Review test comments in `test_resume_parsing.py`
3. Check `RESUME_PARSING_TESTING_GUIDE.md` for UI tests
4. Create issue in project tracker

---

**Last Updated:** May 12, 2026  
**Maintained By:** Development Team  
**Version:** 1.0.0
