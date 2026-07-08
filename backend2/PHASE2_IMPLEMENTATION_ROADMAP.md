# Phase 2 Implementation Roadmap

## PROJECT OVERVIEW

**Objective**: Transform TalentGraph V2 from Oracle-focused (86.7%) to production-ready diverse dataset for recommendation engine testing

**Current State**: 17 candidates, 83 job postings, 3 vendors, 9 cities
**Target State**: 17 candidates, 120-150 job postings, 8 vendors, 15+ cities
**Estimated Effort**: 5.5-6 hours
**Approach**: Option A - Expand Existing (keep 83 high-quality postings, add 37-67 new)

---

## IMPLEMENTATION PHASES

### PHASE 2A: DATA NORMALIZATION (1-1.5 hours)

**Purpose**: Standardize existing 83 postings for consistency

**Script**: `seed_phase2_normalize.py`

**Tasks**:

1. **Seniority Level Standardization**
   - Map 14 fragmented ranges → 5 standardized levels
   - Mappings:
     - "0-2 years" → ENTRY
     - "2-4 years" → JUNIOR
     - "3-5 years" → JUNIOR
     - "4-7 years" → MID
     - "5-8 years" → MID
     - "4-6 years" → MID
     - "3-6 years" → JUNIOR
     - "6-10 years" → SENIOR
     - "7-10 years" → SENIOR
     - "8-12 years" → SENIOR
     - "10+ years" → LEAD
   - Validate no data corruption

2. **Skill Assignment Completion**
   - Identify 11 postings with 0 skills assigned
   - Assign 4-6 relevant skills to each based on role/product
   - Verify skills exist in database
   - Test FK relationships

3. **Salary Range Validation**
   - Verify all salary ranges follow pattern: LOW - HIGH
   - Check consistency by seniority level
   - Flag any outliers for review
   - Expand range for entry-level if needed

4. **Data Quality Validation**
   - Verify 0 NULLs in critical fields
   - Verify all FK relationships still valid
   - Check all location values are in LocationPreference table
   - Confirm all work types are valid enum values
   - Confirm all employment types are valid enum values

**Deliverables**:
- ✓ Updated 83 postings with standardized seniority
- ✓ 11 postings with skills assigned
- ✓ Validation report (0 errors)
- ✓ Script for future normalization

---

### PHASE 2B: NEW VENDOR EXPANSION (2-2.5 hours)

**Purpose**: Add 93-118 new postings across 7 new vendor types

**Script**: `seed_phase2_expansion.py`

**Part 1: SAP POSTINGS (15-20 new postings)**

```python
Roles to create:
  1. SAP S/4HANA Functional Consultant
  2. SAP FICO Finance Consultant
  3. SAP MM Supply Chain Consultant
  4. SAP HCM HR Consultant
  5. SAP BW/Analytics Developer
  6. SAP ADF Development
  7. SAP Fiori UI Developer
  8. SAP NetWeaver Technical Consultant

Seniority Distribution: 5% Entry, 15% Junior, 45% Mid, 28% Senior, 7% Lead
Experience Ranges: 0-2, 2-4, 4-7, 7-10, 10+
Salary Ranges:
  Entry:    $60-85k
  Junior:   $85-110k
  Mid:      $110-155k
  Senior:   $155-200k
  Lead:     $200-250k

Locations:
  Denver, CO (5 postings)
  Atlanta, GA (4 postings)
  Chicago, IL (3 postings)
  Austin, TX (2 postings)
  New York, NY (1 posting)

Work Type Mix:
  Remote: 50%
  Hybrid: 30%
  On-site: 20%

Employment Mix:
  Full-time: 60%
  Contract: 40%
  Temporary: 0%

Skills per Posting: 5-6
Required Skills: [SAP, ABAP, Finance, Supply Chain, HCM, Analytics, Fiori, ADF, NetWeaver - relevant mix per role]
```

**Part 2: SALESFORCE POSTINGS (15-20 new postings)**

```python
Roles to create:
  1. Salesforce Administrator
  2. Salesforce Developer
  3. Salesforce Business Analyst
  4. Salesforce Solutions Architect
  5. Salesforce Commerce Cloud Developer
  6. Salesforce Marketing Cloud Specialist
  7. Salesforce Service Cloud Consultant
  8. Salesforce Integration Consultant

Seniority Distribution: 5% Entry, 15% Junior, 45% Mid, 28% Senior, 7% Lead
Experience Ranges: 0-2, 2-4, 4-7, 7-10, 10+
Salary Ranges:
  Entry:    $65-90k
  Junior:   $90-120k
  Mid:      $120-160k
  Senior:   $160-210k
  Lead:     $210-250k+

Locations:
  Denver, CO (2 postings)
  Atlanta, GA (3 postings)
  Charlotte, NC (2 postings)
  Raleigh, NC (2 postings)
  Chicago, IL (3 postings)
  Austin, TX (2 postings)
  Seattle, WA (1 posting)

Work Type Mix:
  Remote: 40%
  Hybrid: 40%
  On-site: 20%

Employment Mix:
  Full-time: 70%
  Contract: 30%
  Temporary: 0%

Skills per Posting: 5-6
Required Skills: [Salesforce, Apex, Visualforce, REST API, SOQL, Lightning, Marketing Cloud, Commerce - relevant mix]
```

**Part 3: AWS EXPANSION (13-18 new postings)**

```python
Current AWS: 2 postings
New AWS: 13-18 postings
Total AWS: 15-20 postings

Roles to create:
  1. AWS Solutions Architect
  2. AWS DevOps Engineer
  3. AWS Security Engineer
  4. AWS Database Specialist
  5. AWS Machine Learning Engineer
  6. AWS Cloud Migration Specialist
  7. AWS Infrastructure Engineer
  8. AWS Big Data Engineer

Seniority Distribution: 5% Entry, 15% Junior, 45% Mid, 28% Senior, 7% Lead
Experience Ranges: 0-2, 2-4, 4-7, 7-10, 10+
Salary Ranges:
  Entry:    $70-95k
  Junior:   $95-125k
  Mid:      $125-165k
  Senior:   $165-215k
  Lead:     $215-260k+

Locations:
  Denver, CO (3 postings)
  Austin, TX (3 postings)
  Seattle, WA (3 postings)
  Portland, OR (2 postings)
  San Francisco, CA (2 postings)

Work Type Mix:
  Remote: 50%
  Hybrid: 30%
  On-site: 20%

Employment Mix:
  Full-time: 60%
  Contract: 40%
  Temporary: 0%

Skills per Posting: 5-6
Required Skills: [AWS, EC2, S3, Lambda, RDS, CloudFormation, VPC, Security, DevOps, ML - relevant mix]
```

**Part 4: AZURE POSTINGS (10-15 new postings)**

```python
Roles to create:
  1. Azure Solutions Architect
  2. Azure DevOps Engineer
  3. Azure Database Administrator
  4. Azure Security Engineer
  5. Azure Data Engineer
  6. Azure Cloud Migration Specialist
  7. Azure Application Developer

Seniority Distribution: 5% Entry, 15% Junior, 45% Mid, 28% Senior, 7% Lead
Experience Ranges: 0-2, 2-4, 4-7, 7-10, 10+
Salary Ranges:
  Entry:    $65-90k
  Junior:   $90-120k
  Mid:      $120-160k
  Senior:   $160-210k
  Lead:     $210-250k+

Locations:
  Denver, CO (2 postings)
  Atlanta, GA (2 postings)
  Charlotte, NC (1 posting)
  New York, NY (2 postings)
  Chicago, IL (2 postings)
  Boston, MA (1 posting)

Work Type Mix:
  Remote: 45%
  Hybrid: 35%
  On-site: 20%

Employment Mix:
  Full-time: 65%
  Contract: 35%
  Temporary: 0%

Skills per Posting: 5-6
Required Skills: [Azure, VMs, Storage, SQL Database, App Service, DevOps, Security, Data - mix]
```

**Part 5: SERVICENOW POSTINGS (10-15 new postings)**

```python
Roles to create:
  1. ServiceNow Administrator
  2. ServiceNow Developer
  3. ServiceNow Business Analyst
  4. ServiceNow ITSM Consultant
  5. ServiceNow Security Engineer
  6. ServiceNow Integration Specialist

Seniority Distribution: 5% Entry, 15% Junior, 45% Mid, 28% Senior, 7% Lead
Experience Ranges: 0-2, 2-4, 4-7, 7-10, 10+
Salary Ranges:
  Entry:    $60-85k
  Junior:   $85-110k
  Mid:      $110-155k
  Senior:   $155-200k
  Lead:     $200-240k

Locations:
  Atlanta, GA (3 postings)
  Charlotte, NC (2 postings)
  Chicago, IL (2 postings)
  Austin, TX (2 postings)
  Remote (1 posting)

Work Type Mix:
  Remote: 50%
  Hybrid: 30%
  On-site: 20%

Employment Mix:
  Full-time: 70%
  Contract: 30%
  Temporary: 0%

Skills per Posting: 5-6
Required Skills: [ServiceNow, ITSM, JavaScript, APIs, Workflow, CMDB - mix]
```

**Part 6: WORKDAY POSTINGS (10-15 new postings)**

```python
Roles to create:
  1. Workday HCM Functional Consultant
  2. Workday Financials Consultant
  3. Workday Planning Consultant
  4. Workday Developer
  5. Workday Systems Administrator
  6. Workday Integration Specialist

Seniority Distribution: 5% Entry, 15% Junior, 45% Mid, 28% Senior, 7% Lead
Experience Ranges: 0-2, 2-4, 4-7, 7-10, 10+
Salary Ranges:
  Entry:    $65-90k
  Junior:   $90-120k
  Mid:      $120-160k
  Senior:   $160-210k
  Lead:     $210-250k+

Locations:
  Denver, CO (2 postings)
  Phoenix, AZ (2 postings)
  Atlanta, GA (2 postings)
  Raleigh, NC (1 posting)
  Austin, TX (2 postings)

Work Type Mix:
  Remote: 40%
  Hybrid: 40%
  On-site: 20%

Employment Mix:
  Full-time: 70%
  Contract: 30%
  Temporary: 0%

Skills per Posting: 5-6
Required Skills: [Workday, HCM, Financials, Integration, Studio, Security - mix]
```

**Part 7: CLOUD NATIVE / MODERN STACK (10-15 new postings)**

```python
Roles to create:
  1. Kubernetes Engineer
  2. Docker/Container Specialist
  3. Microservices Architect
  4. Cloud Native Developer
  5. Infrastructure as Code Engineer
  6. CI/CD Pipeline Engineer
  7. Serverless Architecture Specialist

Seniority Distribution: 5% Entry, 15% Junior, 45% Mid, 28% Senior, 7% Lead
Experience Ranges: 0-2, 2-4, 4-7, 7-10, 10+
Salary Ranges:
  Entry:    $75-100k
  Junior:   $100-130k
  Mid:      $130-170k
  Senior:   $170-220k
  Lead:     $220-270k+

Locations:
  Seattle, WA (2 postings)
  San Francisco, CA (2 postings)
  Austin, TX (2 postings)
  Portland, OR (2 postings)
  Denver, CO (1 posting)

Work Type Mix:
  Remote: 60%
  Hybrid: 30%
  On-site: 10%

Employment Mix:
  Full-time: 60%
  Contract: 40%
  Temporary: 0%

Skills per Posting: 5-6
Required Skills: [Kubernetes, Docker, Microservices, IaC, Terraform, CI/CD, Cloud - mix]
```

**Summary - Part 1-7**:
- Total New Postings: 93-118
- New Vendors: 7 (SAP, Salesforce, Azure, ServiceNow, Workday, Cloud Native)
- Expanded Vendor: 1 (AWS)
- Cumulative Total: 176-201 postings (trim to 120-150 by reducing some counts)

**Adjustment for Target**:
Currently targeting 120-150, so scale down Part 1-7:
- SAP: 12-15 postings
- Salesforce: 12-15 postings
- AWS: 10-13 postings (expand from 2)
- Azure: 8-10 postings
- ServiceNow: 8-10 postings
- Workday: 8-10 postings
- Cloud Native: 8-10 postings
- Total New: 66-83 postings
- Grand Total: 149-166 (keep at 120-150 range by optimization)

---

### PHASE 2C: GEOGRAPHIC EXPANSION

**Included in seed_phase2_expansion.py**

New locations to add (6-7 cities):
1. **Denver, CO**: 7-9 postings (SAP, Salesforce, AWS, Azure, Workday)
2. **Atlanta, GA**: 7-9 postings (SAP, Salesforce, ServiceNow, Azure, Workday)
3. **Phoenix, AZ**: 6-7 postings (Salesforce, SAP, Workday)
4. **Charlotte, NC**: 6-7 postings (Azure, ServiceNow, Salesforce)
5. **Raleigh, NC**: 5-6 postings (ServiceNow, Salesforce, Azure)
6. **Portland, OR**: 2-3 postings (AWS, Cloud Native)
7. **Minneapolis, MN**: 2-3 postings (Modern Stack, Cloud Native)

---

### PHASE 2D: WORK TYPE REBALANCING

**Current**:
- Remote: 25 postings (30%)
- Hybrid: 58 postings (70%)
- On-site: 0 postings (0%)

**Target**:
- Remote: 48-60 postings (40%)
- Hybrid: 48-60 postings (40%)
- On-site: 24-30 postings (20%)

**New Postings Distribution**:
- Remote: 40% of 66-83 new = 26-33 postings
- Hybrid: 40% of 66-83 new = 26-33 postings
- On-site: 20% of 66-83 new = 13-17 postings

**Result**:
- Remote: 25 + 26-33 = 51-58 (42-48%, target 40%) ✓
- Hybrid: 58 + 26-33 = 84-91 (54-60%, target 40%) - needs adjustment
- On-site: 0 + 13-17 = 13-17 (10-14%, target 20%) - needs adjustment

**Adjustment Strategy**:
Rebalance distribution to hit 40/40/20 exactly:
- Reduce some existing Hybrid to Remote
- Add more On-site to new postings

---

### PHASE 2E: EMPLOYMENT TYPE REBALANCING

**Current**:
- Contract: 57 postings (69%)
- Full-time: 26 postings (31%)
- Temporary: 0 postings (0%)

**Target**:
- Full-time: 84-105 postings (70%)
- Contract: 30-37 postings (25%)
- Temporary: 6-7 postings (5%)

**New Postings Distribution**:
- FT: 65% average of new = 43-54 postings
- Contract: 30% average of new = 20-25 postings
- Temporary: 5% average of new = 3-4 postings

**Result**:
- FT: 26 + 43-54 = 69-80 (58-68%, target 70%) - close, adjust upward
- Contract: 57 + 20-25 = 77-82 (51-68%, target 25%) - too high, need reduction
- Temporary: 0 + 3-4 = 3-4 (2-4%, target 5%) - close

**Adjustment Strategy**:
- Increase new FT postings to 70% of new
- Decrease new Contract postings to 25% of new
- Add 2-3 more Temporary postings

---

### PHASE 2F: FINAL VALIDATION (0.5-1 hour)

**Script**: `validate_phase2_data.py`

**Validation Checklist**:

```python
# Run compare_dataset.py to verify
validate_metrics = {
    'job_postings': {
        'current': 83,
        'expected_new': 37-67,
        'expected_total': 120-150,
        'check': 'total >= 120 and total <= 150'
    },
    'vendors': {
        'oracle': 'should be ~40-50 postings',
        'sap': 'should be 12-15 postings',
        'salesforce': 'should be 12-15 postings',
        'aws': 'should be 15-20 postings',
        'azure': 'should be 8-10 postings',
        'servicenow': 'should be 8-10 postings',
        'workday': 'should be 8-10 postings',
        'cloud_native': 'should be 8-10 postings',
        'check': 'all 8 vendors present'
    },
    'work_types': {
        'remote_percent': 40,
        'hybrid_percent': 40,
        'onsite_percent': 20,
        'tolerance': 5,
        'check': 'all within ±5%'
    },
    'employment_types': {
        'ft_percent': 70,
        'contract_percent': 25,
        'temporary_percent': 5,
        'tolerance': 5,
        'check': 'all within ±5%'
    },
    'geographic': {
        'expected_cities': 15,
        'new_cities': ['Denver CO', 'Atlanta GA', 'Phoenix AZ', 
                       'Charlotte NC', 'Raleigh NC', 'Portland OR', 'Minneapolis MN'],
        'check': 'all new cities present in postings'
    },
    'seniority_levels': {
        'standardized_levels': ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD'],
        'check': 'only 5 levels used, no fragmented ranges'
    },
    'skills': {
        'min_per_posting': 4,
        'max_per_posting': 6,
        'check': 'all postings 4-6 skills (except special cases)',
        'zero_skills_allowed': 0
    },
    'data_quality': {
        'null_count': 0,
        'fk_valid': True,
        'unique_skills_min': 247,
        'check': '0 NULLs, all FKs valid, 247+ unique skills'
    }
}

# Expected output after Phase 2
expected_output = """
═══════════════════════════════════════════════════════════════
                  PHASE 2 VALIDATION REPORT
═══════════════════════════════════════════════════════════════

✓ Total Job Postings: 120-150 (was 83)
✓ Vendors: 8 (Oracle, SAP, Salesforce, AWS, Azure, ServiceNow, Workday, Cloud Native)
✓ Remote %: 40% (was 30%)
✓ Hybrid %: 40% (was 70%)
✓ On-site %: 20% (was 0%)
✓ FT %: 70% (was 31%)
✓ Contract %: 25% (was 69%)
✓ Temporary %: 5% (was 0%)
✓ Geographic Locations: 15+ cities (was 9)
✓ Seniority Levels: 5 standardized (was 14 fragmented)
✓ Skills per Posting: 4-6 range (was 6.9 avg)
✓ NULL Values: 0 (maintained)
✓ FK Relationships: 100% valid (maintained)
✓ Unique Skills: 247+ (maintained)

DATA QUALITY SUMMARY:
✓ All 120-150 postings have required fields
✓ No data corruption detected
✓ All foreign key relationships valid
✓ Ready for recommendation engine testing

STATUS: PHASE 2 IMPLEMENTATION COMPLETE ✓
═══════════════════════════════════════════════════════════════
"""
```

---

## EXECUTION CHECKLIST

### Pre-Implementation
- [ ] Review this roadmap
- [ ] Confirm Option A approach (Expand Existing)
- [ ] Backup database (safety precaution)
- [ ] Confirm no other processes using database

### Phase 2A Execution
- [ ] Create `seed_phase2_normalize.py`
- [ ] Run normalization script
- [ ] Verify 0 errors in validation output
- [ ] Check all 83 postings updated correctly

### Phase 2B Execution
- [ ] Create `seed_phase2_expansion.py`
- [ ] Run expansion script for SAP (15 postings)
- [ ] Run expansion script for Salesforce (15 postings)
- [ ] Run expansion script for AWS expansion (13 postings)
- [ ] Run expansion script for Azure (10 postings)
- [ ] Run expansion script for ServiceNow (10 postings)
- [ ] Run expansion script for Workday (10 postings)
- [ ] Run expansion script for Cloud Native (10 postings)
- [ ] Verify total postings in target range

### Phase 2C-E Execution
- [ ] Verify geographic distribution (7 new cities)
- [ ] Verify work type distribution (40/40/20)
- [ ] Verify employment type distribution (70/25/5)
- [ ] Verify seniority level standardization

### Phase 2F Execution
- [ ] Run `validate_phase2_data.py`
- [ ] Review validation report
- [ ] Confirm all checks pass
- [ ] Verify no data corruption
- [ ] Verify recommendation engine can access data

### Post-Implementation
- [ ] Archive Phase 2 implementation scripts
- [ ] Document any customizations made
- [ ] Update project status to "Phase 2 Complete"
- [ ] Ready for recommendation engine integration testing

---

## TROUBLESHOOTING GUIDE

### Issue: Foreign Key Constraint Violation
**Cause**: Skill doesn't exist in Skill table
**Solution**: 
```sql
SELECT DISTINCT skill_name FROM JobPostingSkill 
WHERE skill_name NOT IN (SELECT name FROM Skill)
```
Then add missing skills to Skill table first

### Issue: Duplicate Postings Created
**Cause**: Script ran twice
**Solution**: 
```sql
DELETE FROM JobPosting 
WHERE title IN (SELECT title FROM JobPosting GROUP BY title HAVING COUNT(*) > 1)
-- Keep older version
```

### Issue: Seniority Level Not Recognized
**Cause**: Misspelled enum value
**Solution**: 
```python
SENIORITY_LEVELS = ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD']
# Use exact spelling only
```

### Issue: Null Values After Insert
**Cause**: Required field not provided in script
**Solution**: 
```python
# Check all required fields populated:
required_fields = ['title', 'description', 'location', 'salary_min', 'salary_max', 
                   'work_type', 'employment_type', 'seniority_level', 'company_id']
```

---

## SUCCESS CRITERIA

✓ Phase 2 is successful when:
1. Total postings: 120-150
2. All 8 vendors represented
3. Work types: 40% remote, 40% hybrid, 20% on-site
4. Employment: 70% FT, 25% contract, 5% temporary
5. Geographic: 15+ cities
6. Seniority: 5 standardized levels only
7. Data quality: 0 NULLs, valid FKs
8. Recommendations: Matching engine can process all postings

---

**STATUS**: Ready for implementation upon user approval
**ESTIMATED COMPLETION**: 5.5-6 hours
**NEXT STEP**: Await user go-ahead to execute Phase 2
