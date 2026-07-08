# Phase 2: Production-Ready Seed Data for Recommendation Engine

## 📋 EXECUTIVE SUMMARY

This document provides the complete blueprint for creating Phase 2 seed data (100-150 job postings) that is production-worthy and ready for comprehensive recommendation engine testing.

**Goals:**
- ✅ NO data gaps or missing required fields
- ✅ Diverse data across all matching factors
- ✅ Production-ready quality
- ✅ Comprehensive testing coverage

---

## 1. CURRENT STATE ANALYSIS

### What We Have
- **Candidates:** 15 with job profiles
- **Companies:** ~6-8 recruiters
- **Job Postings:** 40-50 (insufficient for production testing)
- **Skill Coverage:** Basic (Python, React, AWS, Oracle)
- **Location Coverage:** SF, Austin, NYC (limited)

### What We Need
- **Candidates:** 50-80 diverse profiles (leverage existing 15, add 35-65 more)
- **Companies:** Keep 6-8 (they're sufficient)
- **Job Postings:** 120-150 (3x increase)
- **Skill Coverage:** 80+ unique skill combinations
- **Location Coverage:** 15+ US cities + Remote options
- **Seniority Spread:** Entry/Junior/Mid/Senior/Lead/Manager/Director
- **Work Type Mix:** Remote 40%, Hybrid 40%, Onsite 20%
- **Experience Ranges:** 0-2 yrs, 2-5 yrs, 5-10 yrs, 10+ yrs

---

## 2. MATCHING ALGORITHM REQUIREMENTS MAPPING

### Algorithm Weights & Required Fields

| Algorithm Factor | Weight | JobPosting Fields Required | JobProfile Fields Required | Notes |
|---|---|---|---|---|
| **Skills Matching** | 40% | `posting_skills` (with rating) | `skills` (with proficiency_level) | CRITICAL: Must have 3-5 skills each |
| **Experience** | 20% | `seniority_level` (implicit in range) | `years_of_experience` | Must cover Junior→Senior spectrum |
| **Salary** | 15% | `salary_min`, `salary_max` | `salary_min`, `salary_max` | Must have overlapping ranges |
| **Location** | 10% | `location` (city, state) | `location_preferences` (3 per profile) | Must have city/state/country |
| **Work Type** | 10% | `worktype` (REMOTE/HYBRID/ONSITE) | `worktype` | Must match enum exactly |
| **Bonus Factors** | 5% | `visa_info`, `certifications_required` | `visa_status`, `certification_ids` | Optional but valuable |

---

## 3. DATA QUALITY REQUIREMENTS (NO GAPS)

### Mandatory Fields Per Job Posting
✅ All these MUST be populated (no NULL):
```
- job_title
- product_vendor (Oracle, SAP, Salesforce, AWS, Azure, etc.)
- product_type (specific product within vendor)
- job_role (technical role name)
- seniority_level (Entry/Junior/Mid/Senior/Lead/Manager)
- worktype (REMOTE, HYBRID, or ONSITE)
- location (city, state, country - "Remote, USA" is valid)
- employment_type (FT, CONTRACT, TEMPORARY)
- start_date (ISO date: YYYY-MM-DD)
- salary_min & salary_max (numeric, USD)
- salary_currency (USD, EUR, GBP, INR, etc.)
- job_description (substantive 200+ words)
- company_id (valid FK)
- status (ACTIVE by default)
```

### Mandatory JobPostingSkill Entries
✅ Each posting needs 4-6 skills with ratings:
```
- skill_name (e.g., "Python", "SQL", "Kubernetes")
- skill_category (technical, functional, soft)
- rating (1-10, required proficiency)
```

### Optional But Recommended
- `end_date` (if contract)
- `travel_requirements` (None, 0-10%, 10-25%, 25-50%, 50%+)
- `visa_info` (US Citizen, H1B, etc.)
- `certifications_required` (JSON array like ["AWS Solutions Architect", "Oracle DBA"])
- `pay_type` (hourly or annually)

### Mandatory Fields Per Candidate JobProfile
✅ All these MUST be populated:
```
- profile_name (e.g., "Senior Python Backend Engineer")
- product_vendor (matching posting vendors)
- product_type (matching posting types)
- job_role (technical role)
- years_of_experience (integer)
- worktype (REMOTE, HYBRID, ONSITE)
- employment_type (FT, CONTRACT, etc.)
- salary_min & salary_max (numeric)
- salary_currency (USD, etc.)
- visa_status (US_CITIZEN, GREEN_CARD, H1B, OPT, etc.)
- availability_date (immediate or date string)
```

### Mandatory Skill Entries Per Profile
✅ Each profile needs 5-8 skills:
```
- skill_name
- skill_category
- proficiency_level (1-5 scale for candidates)
```

### Mandatory Location Preferences Per Profile
✅ Each profile needs 2-3 locations:
```
- city
- state
- country (USA)
```

---

## 4. DIVERSITY METRICS FOR PRODUCTION DATA

### A. Product/Vendor Diversity
Create postings across these product ecosystems:

| Vendor | Product Types | Job Roles | Example Postings |
|---|---|---|---|
| **Oracle** | Fusion ERP, HCM, CX Cloud, EPM | Fusion Consultant, DBA, Developer | 20-25 postings |
| **SAP** | S/4HANA, SuccessFactors, Ariba | SAP Consultant, ABAP Developer | 15-20 postings |
| **Salesforce** | Sales Cloud, Service Cloud, CPQ | Administrator, Developer, Architect | 15-20 postings |
| **AWS** | EC2, S3, Lambda, RDS, SageMaker | Solutions Architect, DevOps, ML Engineer | 15-20 postings |
| **Azure** | AKS, Cosmos DB, Azure Functions | Cloud Engineer, Data Engineer | 10-15 postings |
| **ServiceNow** | Incident Management, ITSM | Administrator, Developer, Consultant | 10-15 postings |
| **Workday** | HCM, Finance | Implementation Consultant, Analyst | 10-15 postings |
| **Full-Stack/Modern** | React, Node.js, Docker, Kubernetes | Frontend, Backend, DevOps Engineer | 10-15 postings |

**Total: 120-150 postings across 8 vendors**

### B. Seniority Level Distribution
```
Entry Level (0-2 yrs):        15% (18-22 postings)
Junior (2-4 yrs):             20% (24-30 postings)
Mid-Level (5-7 yrs):          30% (36-45 postings)
Senior (8-12 yrs):            20% (24-30 postings)
Lead/Manager (12+ yrs):       15% (18-22 postings)
```

### C. Work Type Distribution
```
Remote:                        40% (48-60 postings)
Hybrid:                        40% (48-60 postings)
On-site:                       20% (24-30 postings)
```

### D. Location Coverage (for On-site/Hybrid)
```
San Francisco, CA              12%
Austin, TX                     10%
New York, NY                   10%
Seattle, WA                    8%
Boston, MA                     8%
Denver, CO                     6%
Chicago, IL                    6%
Atlanta, GA                    6%
Phoenix, AZ                    5%
Charlotte, NC                  5%
Raleigh, NC                    4%
Portland, OR                   2%
Minneapolis, MN                2%
Remote (Nationwide, USA):      varies based on work_type
```

### E. Salary Range Diversity
```
Entry Level:         $50k-$75k
Junior:              $70k-$100k
Mid-Level:           $95k-$150k
Senior:              $140k-$200k
Lead/Manager:        $180k-$250k+

Contract Rates:      $120-$200/hr (varies by seniority)
```

### F. Employment Type Distribution
```
Full-Time:           70% (84-105 postings)
Contract:            25% (30-37 postings)
Temporary:           5% (6-7 postings)
```

### G. Skill Combinations (80+ unique skill sets)
**Technical Skills Category:**
- Languages: Python, Java, C#, JavaScript, TypeScript, Go, Rust, Ruby, PHP, C++
- Databases: SQL, PL/SQL, MongoDB, Cassandra, PostgreSQL, MySQL, Oracle DB, Cosmos DB, DynamoDB
- Cloud: AWS, Azure, GCP, Docker, Kubernetes, Terraform, CloudFormation
- ERP: Oracle Fusion, SAP S/4HANA, Salesforce, ServiceNow, Workday
- Frontend: React, Angular, Vue.js, Next.js
- Backend: Node.js, FastAPI, Spring Boot, Django
- DevOps: Jenkins, GitLab CI, GitHub Actions, Terraform, Ansible
- Data: Spark, Hadoop, Apache Flink, Airflow, dbt
- ML/AI: TensorFlow, PyTorch, Scikit-learn, LLMs

**Functional Skills:**
- ETL/Data Integration, Business Analysis, Project Management, Solution Architecture
- Agile/Scrum, Change Management, Requirements Gathering, Testing/QA

**Soft Skills:**
- Leadership, Communication, Problem-Solving, Teamwork, Mentoring

**Example Profile Skill Combos:**
1. Python, FastAPI, PostgreSQL, AWS, Docker, Git (Backend Python Dev)
2. SQL, PL/SQL, Oracle DB, ETL, Data Modeling (Oracle DBA)
3. React, TypeScript, Node.js, MongoDB, REST APIs (Full-Stack JavaScript)
4. Kubernetes, Docker, Terraform, CI/CD, AWS (DevOps Engineer)
5. Python, TensorFlow, Scikit-learn, AWS SageMaker (ML Engineer)
6. Oracle Fusion, SQL, Data Migration, Business Process (Fusion Consultant)

---

## 5. IMPLEMENTATION STRATEGY

### Phase 2A: Expand Candidate Pool (Optional but Recommended)
**Status:** Can use existing 15 if time constrained
**Benefit:** More test coverage for matching
**Action:** Create `seed_phase2_additional_candidates.py` → 35-65 new candidates
- Diversity: Different experience levels, skills, locations
- Time: 1-2 hours

### Phase 2B: Create 120-150 Job Postings (MAIN TASK)
**CRITICAL:** This is the focus
**File:** `seed_phase2_production_postings.py`

**Structure:**
```python
# Template 1: Oracle Vendor (25 postings)
# Template 2: SAP Vendor (20 postings)
# Template 3: Salesforce Vendor (18 postings)
# Template 4: AWS Vendor (20 postings)
# Template 5: Azure Vendor (12 postings)
# Template 6: ServiceNow Vendor (15 postings)
# Template 7: Workday Vendor (12 postings)
# Template 8: Modern Stack Vendor (12 postings)
# TOTAL: 134 postings
```

**Each Posting Must Include:**
- Complete job_description (substantive, 200+ words with responsibilities)
- 4-6 JobPostingSkill entries
- Balanced salary ranges (overlapping with candidate expectations)
- Realistic start_dates (spread across 30-90 days)
- Varied locations, work types, seniority levels

---

## 6. MATCHING ALGORITHM TEST SCENARIOS

Once populated, you'll be able to test these scenarios:

### Scenario 1: Perfect Match (90-100%)
- All skills match with right proficiency levels
- Experience range perfect fit (candidate_yrs in job_min to job_max)
- Salary overlaps perfectly
- Location matches exactly
- Work type matches
- **Expected Result:** Score 92-100%

### Scenario 2: Good Match (70-85%)
- 80% of skills match, some gap in one area
- Experience slightly overqualified or underqualified
- Salary partially overlaps
- Location acceptable (different city but same state, or remote accepted)
- **Expected Result:** Score 74-82%

### Scenario 3: Partial Match (50-70%)
- 60% skills match, gaps in key areas
- Experience quite different (candidate more junior)
- Salary minimally overlaps
- Location different but work-type is remote
- **Expected Result:** Score 55-68%

### Scenario 4: Poor Match (0-40%)
- Completely different skills
- Experience requirements vastly different
- Salary non-overlapping
- Location conflict and work-type incompatible
- **Expected Result:** Score 5-15%

---

## 7. IMPLEMENTATION STEPS (IN ORDER)

### Step 1: Create Job Posting Templates
Create reusable template data structures for each vendor

### Step 2: Generate Postings with Diversity
- 120-150 total postings
- Spread across 8 vendors
- Varied seniority, locations, work types, salaries
- 4-6 skills per posting

### Step 3: Create JobPostingSkill Entries
- Each posting gets skill entries
- Ratings vary (1-10 for required proficiency)
- Mix of technical, functional, soft skills

### Step 4: Database Population
- Seed into database
- Validate counts and diversity
- Check for NULL fields

### Step 5: Quality Validation Checks
- ✅ No NULL required fields
- ✅ All foreign keys valid
- ✅ Salary ranges realistic
- ✅ Skills exist for all postings
- ✅ All job_role/product_vendor combos valid
- ✅ Locations valid US cities
- ✅ Work type enum values correct

### Step 6: Test Queries
- Run matching algorithm on several candidate/posting pairs
- Verify scores fall in expected ranges
- Check top-N retrieval (should return 15-20 matches for test candidates)

---

## 8. FILE STRUCTURE

### Main Implementation File
**Location:** `backend2/seed_phase2_production_postings.py`

**Contains:**
1. Import statements and database setup
2. Helper functions (get_company, get_skills_for_combo, etc.)
3. Vendor-specific job posting templates (25-30 postings each)
4. Main orchestration loop
5. Validation checks
6. Logging and progress reporting

### Optional: Expanded Candidate File
**Location:** `backend2/seed_phase2_additional_candidates.py` (if needed)

**Contains:**
1. 35-65 new candidate profiles
2. Diverse skill sets matching job postings
3. Various experience levels, locations, salaries

---

## 9. PRODUCTION-READY QUALITY CHECKLIST

Before considering data ready for production testing:

### Data Completeness
- ✅ 120-150 job postings created
- ✅ 4-6 skills per posting
- ✅ All postings have job_description (200+ words)
- ✅ All postings have valid start_date
- ✅ All postings assigned to valid companies

### Data Consistency
- ✅ No NULL values in required fields
- ✅ Salary ranges realistic and varied
- ✅ Work type values match enums (REMOTE, HYBRID, ONSITE)
- ✅ Employment type valid (FT, CONTRACT, TEMPORARY)
- ✅ Seniority levels consistent with experience ranges
- ✅ Locations are valid US cities or "Remote"

### Data Diversity
- ✅ 8+ vendors represented
- ✅ All seniority levels covered (Entry→Manager)
- ✅ Work type distribution: 40% Remote, 40% Hybrid, 20% Onsite
- ✅ Salary ranges: $50k-$250k+ spectrum
- ✅ 80+ unique skill combinations
- ✅ 15+ different locations

### Algorithm Readiness
- ✅ Enough skills overlap to generate matches
- ✅ Salary ranges have overlaps (not all mismatched)
- ✅ Experience levels distributed (can test all scenarios)
- ✅ Location diversity enables both match and non-match scenarios
- ✅ Work type coverage enables all matching paths

### Database Validation
```sql
-- Should return 120-150
SELECT COUNT(*) FROM jobposting WHERE status = 'ACTIVE';

-- Should return 540-900 (4-6 per posting)
SELECT COUNT(*) FROM jobpostingskill;

-- No NULLs in critical fields
SELECT COUNT(*) FROM jobposting WHERE job_title IS NULL;
-- Result should be 0
```

---

## 10. TIMELINE & EFFORT

| Phase | Task | Time | Effort |
|---|---|---|---|
| 1 | Create vendor templates | 30 min | Low |
| 2 | Generate 120-150 postings | 1-1.5 hrs | Medium |
| 3 | Add skills per posting | 30 min | Low |
| 4 | Database seeding | 15 min | Low |
| 5 | Validation checks | 30 min | Low |
| **TOTAL** | **End-to-End** | **~3 hours** | **Medium** |

---

## 11. WHAT HAPPENS NEXT

Once complete, you'll have:
1. **Production-ready seed data** with no gaps
2. **Ability to test recommendation engine** comprehensively
3. **Diverse test scenarios** for all algorithm factors
4. **Real-world data patterns** for performance profiling
5. **Foundation for load testing** (can scale to 500+ postings later)

Then you can:
- Run matching algorithm on diverse candidate/posting pairs
- Verify score calculations (40% skills + 20% exp + 15% salary, etc.)
- Test ranking and top-N retrieval
- Validate that edge cases work (overqualified, underqualified, perfect matches)
- Prepare for production deployment

---

## 12. NEXT ACTION

Once you approve this plan, I will immediately:
1. Create `seed_phase2_production_postings.py` with all 120-150 postings
2. Ensure zero data gaps (all required fields populated)
3. Validate database constraints and FK relationships
4. Provide verification script to confirm data quality
5. Ready for production-use recommendation engine testing

**Proceed? (Y/N)**
