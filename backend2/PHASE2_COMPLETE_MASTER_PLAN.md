# Phase 2 COMPLETE PLAN: Job Postings + Job Preferences

## PROJECT SCOPE OVERVIEW

### Current State
```
17 Candidates with 53 Job Preference Profiles
                    ↓
              100% Oracle-focused
                    ↓
        Can only match to Oracle jobs
                    
                    vs
                    
17 Companies with 83 Job Postings
                    ↓
            86.7% Oracle Postings
                    ↓
        Limited matching diversity
```

### Phase 2 Target
```
17 Candidates with 118-135 Job Preference Profiles
                    ↓
        8 vendors, diverse levels, expanded geography
                    ↓
        Can match to any vendor jobs
                    
                    vs
                    
23 Companies with 120-150 Job Postings
                    ↓
        8 vendors, balanced work types, diverse locations
                    ↓
        Rich matching potential (3,000+ combinations)
```

---

## PHASE 2 IMPLEMENTATION: COMPLETE BREAKDOWN

### PART A: JOB POSTING EXPANSION (5.5-6 hours total)

#### A.1 Normalize Existing Postings (1-1.5 hours)
**Script**: `seed_phase2_normalize.py`
- Map 14 seniority ranges → 5 standardized levels
- Assign skills to 11 postings with 0 skills
- Validate salary ranges for consistency
- Ensure all required fields populated

**Deliverable**: 83 normalized postings ready for expansion

#### A.2 Add New Vendor Postings (2-2.5 hours)
**Script**: `seed_phase2_expansion.py`

| Vendor | New Postings | Roles | Experience | Salary |
|--------|---|---|---|---|
| **SAP** | 12-15 | FICO, MM, HCM, BW, Fiori | Mid-Lead | $110-250k |
| **Salesforce** | 12-15 | Admin, Dev, BA, Architect, Cloud | Mid-Lead | $110-250k |
| **AWS** (expand) | 13-18 | Architect, DevOps, Security, DBA, ML | Mid-Lead | $120-260k |
| **Azure** | 8-10 | Architect, DevOps, DBA, Security, Dev | Mid-Lead | $110-250k |
| **ServiceNow** | 8-10 | Admin, Dev, BA, ITSM, Security | Mid-Lead | $110-240k |
| **Workday** | 8-10 | HCM, Finance, Planning, Dev, Admin | Mid-Lead | $120-250k |
| **Cloud Native** | 8-10 | Kubernetes, Docker, Microservices, IaC | Mid-Lead | $130-270k |
| **Oracle** (keep) | 45-50 | All current roles | Mid-Lead | $110-200k |
| **TOTAL** | **120-150** | - | - | - |

**Deliverable**: 66-83 new postings added

#### A.3 Rebalance Work Types (included in A.2)
- Add 24+ on-site positions
- Maintain 25+ remote positions
- Keep 40+ hybrid positions
- **Result**: Remote 40%, Hybrid 40%, On-site 20%

#### A.4 Rebalance Employment (included in A.2)
- Add 46+ full-time positions
- Reduce ~32 contract positions
- Add 6-7 temporary positions
- **Result**: FT 70%, Contract 25%, Temporary 5%

#### A.5 Expand Geography (included in A.2)
- Add 7 new cities (Denver, Atlanta, Phoenix, Charlotte, Raleigh, Portland, Minneapolis)
- Distribute postings across 15+ total cities
- **Result**: Strong geographic diversity

**Deliverable**: 120-150 total job postings with:
- ✓ 8 vendor types
- ✓ 40/40/20 work type distribution
- ✓ 70/25/5 employment distribution
- ✓ 15+ cities
- ✓ Full salary spectrum
- ✓ 0 NULLs, valid FKs

#### A.6 Final Validation (0.5-1 hour)
**Script**: `validate_phase2_postings.py`
- Verify 120-150 postings created
- Confirm all metrics aligned
- Check 0 NULLs and valid FKs
- Validate recommendation engine readiness

---

### PART B: JOB PREFERENCE EXPANSION (2-3 hours total)

#### B.1 Create Alternative Vendor Profiles (1-1.5 hours)
**Script**: `seed_phase2_job_preferences.py`

For each of 17 candidates, add 2 alternative vendor profiles:

| Candidate | Current (3) | Add | New Total | Vendors |
|-----------|---|---|---|---|
| Finance Focus | 3 | +2 | 5 | Oracle + SAP + Salesforce |
| HCM Focus | 3 | +2 | 5 | Oracle + Workday + Salesforce |
| Database Focus | 3 | +2 | 5 | Oracle + AWS + Azure |
| Supply Chain | 3 | +2 | 5 | Oracle + SAP + Salesforce |
| Developers | 3 | +2 | 5 | Oracle + Salesforce + AWS |
| (and 12 more) | 3 | +2 | 5 | (varied combinations) |

**Per Candidate**:
- Same core skills (transferable)
- Similar salary ranges
- Same location preferences (mostly)
- Same work type preferences

**Deliverable**: 34 new alternative vendor job preference profiles

#### B.2 Add Entry & Junior Level Profiles (0.5-1 hour)
**Script**: `seed_phase2_job_preferences.py` (continued)

Create entry/junior level profiles for:
- 8-10 candidates (selected from current 17)
- Experience: 0-2 years (Entry), 2-4 years (Junior)
- Salary: $50-85k (Entry), $85-110k (Junior)
- Same skill domains (just earlier career stage)

**Deliverable**: 16-20 new entry/junior level profiles

#### B.3 Add On-site Variants (0.25-0.5 hour)
**Script**: `seed_phase2_job_preferences.py` (continued)

Create on-site flexible profiles for:
- 5-8 willing candidates
- Specific on-site cities (Chicago, NY, Austin, Denver)
- Slightly higher salary (relocation incentive)
- Same core skills and experience

**Deliverable**: 5-8 new on-site variant profiles

#### B.4 Add Geographic Flexible Profiles (0.25-0.5 hour)
**Script**: `seed_phase2_job_preferences.py` (continued)

Create flexible location profiles for:
- 5-10 candidates open to new markets
- Multiple city preferences (not just favorites)
- Include new Phase 2 cities (Denver, Atlanta, etc.)
- Same salary and skills

**Deliverable**: 5-10 new geographic flexible profiles

#### B.5 Validation (0.5 hour)
**Script**: `validate_phase2_preferences.py`
- Verify 118-135 total profiles created
- Confirm 65-82 new profiles added
- Check skills properly mapped
- Verify all FKs valid
- Confirm 0 NULLs

**Deliverable**: 118-135 total job preference profiles with:
- ✓ 8 vendor types represented
- ✓ All 5 experience levels (Entry through Lead)
- ✓ Full salary spectrum ($50-250k+)
- ✓ 15+ geographic locations
- ✓ Multiple work type options
- ✓ 0 NULLs, valid FKs

---

## COMPLETE PHASE 2 TIMELINE

```
Task                                    Time      Cumulative
─────────────────────────────────────────────────────────────
A.1: Normalize Postings              1-1.5 hrs    1-1.5 hrs
A.2: Add New Vendor Postings         2-2.5 hrs    3-4 hrs
A.3-A.5: Rebalancing (in A.2)        (included)   (included)
A.6: Validate Postings               0.5-1 hr     3.5-5 hrs
─────────────────────────────────────────────────────────────
B.1: Add Alternative Vendor           1-1.5 hrs   4.5-6.5 hrs
B.2: Add Entry/Junior Profiles       0.5-1 hr    5-7.5 hrs
B.3: Add On-site Variants            0.25-0.5 hr 5.25-8 hrs
B.4: Add Geographic Flexible         0.25-0.5 hr 5.5-8.5 hrs
B.5: Validate Preferences            0.5 hr      6-9 hrs
─────────────────────────────────────────────────────────────
TOTAL PHASE 2:                                    6-9 HOURS
─────────────────────────────────────────────────────────────

Estimated Time: 7.5 hours average
```

---

## PHASE 2 DELIVERABLES

### Data Outputs
✓ 120-150 job postings (was 83)
✓ 118-135 job preference profiles (was 53)
✓ 8 vendor types represented
✓ 15+ geographic locations
✓ 5 standardized seniority levels
✓ Full salary spectrum ($50-250k+)
✓ Balanced work types (40/40/20)
✓ Balanced employment (70/25/5)

### Scripts Generated
✓ seed_phase2_normalize.py - Normalize existing 83 postings
✓ seed_phase2_expansion.py - Add 66-83 new job postings
✓ seed_phase2_job_preferences.py - Add 65-82 new profiles
✓ validate_phase2_postings.py - Validate postings
✓ validate_phase2_preferences.py - Validate profiles

### Documentation Outputs
✓ CURRENT_STATE_DETAILED_ANALYSIS.md
✓ JOB_PREFERENCES_CURRENT_vs_PHASE2.md
✓ JOB_PREFERENCES_VISUAL_SUMMARY.md
✓ PHASE2_IMPLEMENTATION_ROADMAP.md
✓ PHASE2_QUICK_REFERENCE_VISUAL.md
✓ PHASE2_COMPLETE_PLAN.md (this file)

### Quality Metrics
✓ 0 NULLs in critical fields (maintained)
✓ 100% valid FK relationships
✓ 247+ unique skills (maintained)
✓ 0 data quality issues

---

## MATCHING ENGINE CAPABILITY IMPROVEMENT

### Before Phase 2
```
Candidates: 51 profiles (3 per candidate)
Postings: 83 (86.7% Oracle)
Possible Matches: ~140 combinations
Match Quality: Limited (87% Oracle-only)

Recommendation Engine Can:
  ✓ Show matching candidates for Oracle jobs
  ✓ Demonstrate basic matching algorithm
  ✗ Cannot show vendor diversity
  ✗ Cannot show career progression paths
  ✗ Cannot test multi-vendor recommendations
  ✗ Not suitable for production testing
```

### After Phase 2
```
Candidates: 118-135 profiles (7-8 per candidate)
Postings: 120-150 (8 vendors)
Possible Matches: 3,000+ combinations
Match Quality: Rich & diverse

Recommendation Engine Can:
  ✓ Show matching candidates across 8 vendors
  ✓ Demonstrate career progression (Entry → Lead)
  ✓ Show work type flexibility (Remote → On-site)
  ✓ Show salary progression ($50k → $250k+)
  ✓ Show geographic mobility (NY → Denver)
  ✓ Show vendor transitions (Oracle → SAP, etc.)
  ✓ Generate complex matching scenarios
  ✓ PRODUCTION-READY for recommendation testing
```

---

## SUCCESS CRITERIA CHECKLIST

### Job Postings (Part A)
- [ ] 120-150 total postings (was 83)
- [ ] 8 vendor types present (was 3)
- [ ] 40% remote / 40% hybrid / 20% on-site
- [ ] 70% FT / 25% contract / 5% temporary
- [ ] 15+ geographic locations (was 9)
- [ ] 5 standardized seniority levels (was 14 fragmented)
- [ ] All postings 4-6 skills (normalized)
- [ ] $50-250k+ salary spectrum
- [ ] 0 NULLs, valid FKs
- [ ] Script validation passes 100%

### Job Preferences (Part B)
- [ ] 118-135 total profiles (was 53)
- [ ] 65-82 new profiles created
- [ ] Alternative vendor profiles: 34
- [ ] Entry/junior profiles: 16-20
- [ ] On-site variant profiles: 5-8
- [ ] Geographic flexible profiles: 5-10
- [ ] All profiles properly linked to candidates
- [ ] All skills properly mapped
- [ ] 0 NULLs, valid FKs
- [ ] Script validation passes 100%

### Integrated (Parts A + B)
- [ ] Matching potential: 3,000+ combinations
- [ ] Recommendation engine ready for production
- [ ] No data corruption
- [ ] All FK relationships valid
- [ ] Documentation complete
- [ ] Scripts tested and working
- [ ] Ready for recommendation engine testing

---

## RISK MITIGATION

| Risk | Mitigation Strategy |
|------|-------------------|
| Data corruption | Keep existing 83 postings, add new only |
| FK violations | Validate all relationships before/after |
| NULLs introduced | Use scripts with field validation |
| Duplicate records | Check uniqueness before insert |
| Skill mapping errors | Manual review of transferable skills |
| Seniority inconsistency | Use 5 standardized levels only |

---

## NEXT STEPS (USER DECISION)

1. **Review**: Read all 5 analysis documents:
   - CURRENT_STATE_DETAILED_ANALYSIS.md
   - JOB_PREFERENCES_CURRENT_vs_PHASE2.md
   - JOB_PREFERENCES_VISUAL_SUMMARY.md
   - PHASE2_IMPLEMENTATION_ROADMAP.md
   - PHASE2_QUICK_REFERENCE_VISUAL.md

2. **Confirm**: Approve Phase 2 approach:
   - [ ] Option A (Expand Existing) for job postings
   - [ ] Job preference expansion (65-82 new profiles)
   - [ ] Total scope: 6-9 hours implementation

3. **Customize**: Provide any preferences:
   - Vendor priorities?
   - Geographic focus?
   - Work type emphasis?
   - Salary ranges adjustment?

4. **Authorize**: Give go-ahead to implement:
   - [ ] Start Part A (job postings) → 5.5-6 hours
   - [ ] Start Part B (job preferences) → 2-3 hours
   - [ ] Full Phase 2 implementation → 6-9 hours total

---

## PRODUCTION READINESS STATEMENT

**Phase 2 will deliver a production-worthy dataset that is:**
- ✓ Diverse: 8 vendors, 5 experience levels, 15+ cities
- ✓ Complete: 0 data quality gaps
- ✓ Balanced: Work types, employment types, salary ranges
- ✓ Robust: 0 NULLs, valid FK relationships
- ✓ Rich: 3,000+ matching scenarios for recommendation engine
- ✓ Testable: Ready for comprehensive recommendation algorithm validation

**Recommendation Engine Can:**
- Test vendor-specific matching logic
- Validate experience level progression
- Evaluate geographic flexibility
- Assess salary range negotiation
- Demonstrate career path recommendations
- Show multi-dimensional matching scenarios

---

**READY FOR USER DECISION AND AUTHORIZATION**

