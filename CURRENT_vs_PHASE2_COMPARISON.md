# CURRENT vs PHASE 2 TARGETS: Dataset Comparison

**Date:** 2026-07-06  
**Current State:** 83 Job Postings  
**Target State:** 120-150 Job Postings

---

## 📊 QUICK SUMMARY

```
┌─────────────────────────────────────────────────────────────┐
│                    GAP ANALYSIS                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Overall Completion:  83/120 = 69%                          │
│                                                              │
│  🔴 CRITICAL GAPS:                                           │
│     • 37-67 job postings missing (need 37 MORE minimum)     │
│     • Only 3/8 vendors (missing 5 vendors)                  │
│     • Location coverage insufficient (9/15+)               │
│     • Seniority imbalanced (heavily Mid-level)              │
│     • Work type imbalanced (70% Hybrid, 0% On-site)         │
│     • Skills per posting wrong distribution                  │
│     • Employment type backwards (68% Contract vs 70% FT)    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ ENTITY COUNTS

| Metric | Current | Target | Status | Gap |
|--------|---------|--------|--------|-----|
| **Job Postings** | 83 | 120-150 | ❌ | -37 to -67 |
| **Candidates** | 17 | 50-80 | ⚠️  | Can use existing |
| **Job Profiles** | 53 | 50-80 | ✅ | Aligned |
| **Companies** | 23 | 6-8 | ✅ | More than enough |
| **Total Skills** | 527 | 400-900 | ✅ | Within range |
| **Location Prefs** | 69 | 150-240 | ❌ | -81 to -171 |

**Analysis:** Only postings and location preferences are significantly short.

---

## 2️⃣ VENDOR DISTRIBUTION

### Current (3 vendors)
```
Oracle        72 ████████████████████████████████████ (86.7%)
General        9 ████ (10.8%)
AWS            2 ██ (2.4%)
```

### Target Phase 2 (8 vendors)
```
Oracle         20-25  ████████
SAP            15-20  ██████
Salesforce     15-20  ██████
AWS            15-20  ██████
Azure          10-15  █████
ServiceNow     10-15  █████
Workday        10-15  █████
Modern Stack   10-15  █████
```

### Status Per Vendor
| Vendor | Current | Target | Status | Action |
|--------|---------|--------|--------|--------|
| Oracle | 72 | 20-25 | ⚠️ OVERLOADED | Reduce to 20 (remove 52) |
| SAP | 0 | 15-20 | ❌ MISSING | **Add 15-20** |
| Salesforce | 0 | 15-20 | ❌ MISSING | **Add 15-20** |
| AWS | 2 | 15-20 | ❌ UNDERREPRESENTED | **Add 13-18** |
| Azure | 0 | 10-15 | ❌ MISSING | **Add 10-15** |
| ServiceNow | 0 | 10-15 | ❌ MISSING | **Add 10-15** |
| Workday | 0 | 10-15 | ❌ MISSING | **Add 10-15** |
| Modern Stack | 0 | 10-15 | ❌ MISSING | **Add 10-15** |

**Key Problem:** 86% of postings are Oracle. Need to diversify heavily.

---

## 3️⃣ WORK TYPE DISTRIBUTION

### Current (2/3 types)
```
Hybrid   58 ███████████████████████████████████████████████████ (69.9%)  ⚠️ TOO HIGH
Remote   25 ███████████████████████ (30.1%)  ⚠️ TOO LOW
On-site   0 (0%)  ❌ MISSING
```

### Target
```
Remote   40% █████████████████████
Hybrid   40% █████████████████████
On-site  20% ███████████
```

### Gap Analysis
| Type | Current | Target | Status | Adjustment |
|------|---------|--------|--------|------------|
| Remote | 30% | 40% | ❌ | +10% (need ~10 more) |
| Hybrid | 70% | 40% | ⚠️ | -30% (need ~26 fewer) |
| On-site | 0% | 20% | ❌ | +20% (need ~24 new) |

**Key Problem:** Hybrid is overrepresented. Need 24 on-site positions created.

---

## 4️⃣ SENIORITY LEVEL DISTRIBUTION

### Current (Fragmented 14 different ranges)
```
5-8 years     18 ████████████████████ (21.7%)
4-7 years     14 ██████████████ (16.9%)
3-5 years     12 ████████████ (14.5%)
3-6 years     10 ██████████ (12.0%)
6-10 years     6 ██████ (7.2%)
4-6 years      5 █████ (6.0%)
7-10 years     5 █████ (6.0%)
8-12 years     5 █████ (6.0%)
[7 other ranges with <2% each]
```

### Target
```
Entry (0-2)    15% ████████
Junior (2-4)   20% ███████████
Mid (5-7)      30% █████████████████
Senior (8-12)  20% ███████████
Lead (12+)     15% ████████
```

### Gap Analysis
| Level | Current | Target | Status | Issue |
|-------|---------|--------|--------|-------|
| Entry (0-2) | 1.2% | 15% | ❌ | Only 1 posting |
| Junior (2-4) | 1.2% | 20% | ❌ | Only 1 posting |
| Mid (5-7) | ~48% | 30% | ⚠️ | Overrepresented |
| Senior (8-12) | ~14% | 20% | ⚠️ | Underrepresented |
| Lead (12+) | 1.2% | 15% | ❌ | Only 1 posting |

**Key Problem:** Seniority data is fractured into 14 ranges instead of 5 clean levels. Need standardization + entry/lead level addition.

---

## 5️⃣ LOCATION DISTRIBUTION

### Current (9 locations)
```
New York, NY        12 ███████████ (14.5%)
Chicago, IL         12 ███████████ (14.5%)
San Francisco, CA   11 ███████████ (13.3%)
Austin, TX          11 ███████████ (13.3%)
Seattle, WA         11 ███████████ (13.3%)
Boston, MA          11 ███████████ (13.3%)
Remote               7 ███████ (8.4%)
Remote, USA          7 ███████ (8.4%)
Dallas, TX           1 (1.2%)
```

### Target (15+ locations)
```
San Francisco       12% ████████
Austin              10% ███████
New York            10% ███████
Seattle              8% █████
Boston               8% █████
Denver               6% ████
Chicago              6% ████
Atlanta              6% ████
Phoenix              5% ███
Charlotte            5% ███
Raleigh              4% ███
Portland             2% █
Minneapolis          2% █
Remote (Nationwide) Varies
```

### Status
| City | Current | Target | Missing |
|------|---------|--------|---------|
| SF | 11 | 12% (14-18) | -3 to -7 |
| Austin | 11 | 10% (12-15) | -4 to +1 |
| NYC | 12 | 10% (12-15) | -3 to 0 |
| Seattle | 11 | 8% (10-12) | -1 to +1 |
| Boston | 11 | 8% (10-12) | -1 to +1 |
| Denver | 0 | 6% (7-9) | **-7 to -9** |
| Chicago | 12 | 6% (7-9) | **+3 to +5** |
| Atlanta | 0 | 6% (7-9) | **-7 to -9** |
| Phoenix | 0 | 5% (6-7) | **-6 to -7** |
| Charlotte | 0 | 5% (6-7) | **-6 to -7** |
| Raleigh | 0 | 4% (5-6) | **-5 to -6** |
| Portland | 0 | 2% (2-3) | **-2 to -3** |
| Minneapolis | 0 | 2% (2-3) | **-2 to -3** |
| Remote | 14 | Varies | OK |

**Key Problem:** Missing 6 cities (Denver, Atlanta, Phoenix, Charlotte, Raleigh, Portland, Minneapolis). Chicago overrepresented.

---

## 6️⃣ SKILLS PER POSTING

### Current Distribution
```
Min:  0 skills    ⚠️ PROBLEM (11 postings)
Avg:  6.9 skills  ⚠️ TOO HIGH
Max:  8 skills

<4 skills:   11 postings (13%) ❌ BAD (needs 4-6)
4-6 skills:   0 postings (0%)  ❌ NONE in target range!
>6 skills:   72 postings (87%) ⚠️ EXCESS (above 6)
```

### Target
```
Target Range: 4-6 skills per posting
Ideal:  All postings should have 4-6 skills
Current: 0 postings in ideal range (0%)
```

**Key Problem:** 
- 11 postings have 0 skills (data quality issue)
- 72 postings have 7-8 skills (overshooting target)
- 0 postings in the perfect 4-6 range

---

## 7️⃣ SALARY RANGE COVERAGE

### Current
```
Minimum floor:   $105 (!)  ❌ WAY TOO LOW (likely data error)
Maximum ceiling: $200,000
Avg min offer:   $41,603
Avg max offer:   $53,869
```

### Target
```
Entry level:      $50k-$75k
Junior:           $70k-$100k
Mid-level:        $95k-$150k
Senior:           $140k-$200k
Lead/Manager:     $180k-$250k+
Contract rates:   $120-$200/hr
Range spectrum:   $50k-$250k+
```

### Analysis
| Bracket | Current | Target | Status |
|---------|---------|--------|--------|
| $50k-$75k (Entry) | Unknown | Present | ⚠️ Need to verify |
| $70k-$100k (Junior) | Low | Present | ⚠️ Need to verify |
| $95k-$150k (Mid) | Unknown | Present | ⚠️ Need to verify |
| $140k-$200k (Senior) | High end | Present | ⚠️ Need to verify |
| $180k-$250k+ (Lead) | Few | Present | ❌ Underrepresented |

**Key Problem:** Salary averages appear low ($41k-$53k range). Likely due to contract positions being hourly. Need to separate hourly vs annual rates.

---

## 8️⃣ SKILLS DIVERSITY

### Current (247 unique skills)
```
247 unique skills found ✅

Top Skills:
  Python              21 ✓✓✓
  AWS                 10 ✓✓
  Docker              10 ✓✓
  Problem Solving     10 ✓✓
  Teamwork            10 ✓✓
  Kubernetes           9 ✓✓
  Communication        8 ✓
  Terraform            7 ✓
  JavaScript           7 ✓
  PostgreSQL           7 ✓
  [237 other skills with lower frequency]
```

### Target
```
80+ unique skills ✅ (Currently have 247)
Diverse coverage across:
  - Languages, Databases, Cloud, ERP systems
  - Frontend, Backend, DevOps, Data, ML/AI
  - Functional skills (ETL, Analysis, Project Mgmt)
  - Soft skills (Leadership, Communication)
```

**Status:** ✅ **GOOD** — Have more than double the target diversity.

---

## 9️⃣ EMPLOYMENT TYPE DISTRIBUTION

### Current
```
Contract   57 ██████████████████████████████████ (68.7%)  ⚠️ BACKWARDS
FT         26 ███████████████ (31.3%)  ⚠️ BACKWARDS
```

### Target
```
FT         70% █████████████████████
Contract   25% ███████████
Temporary   5% ██
```

### Gap Analysis
| Type | Current | Target | Gap |
|------|---------|--------|-----|
| Full-Time | 31% | 70% | **-39% (need ~46 more FT)** |
| Contract | 69% | 25% | **+44% (need ~38 fewer contract)** |
| Temporary | 0% | 5% | **-5% (need ~6 temporary)** |

**Key Problem:** Ratio is inverted. Current has 68% contract; target needs 70% FT. This is a major rebalance.

---

## 🔟 DATA QUALITY CHECKS

### NULL Field Analysis
```
✅ job_title           : 0 NULLs  (GOOD)
✅ product_vendor      : 0 NULLs  (GOOD)
✅ product_type        : 0 NULLs  (GOOD)
✅ job_role            : 0 NULLs  (GOOD)
✅ seniority_level     : 0 NULLs  (GOOD)
✅ worktype            : 0 NULLs  (GOOD)
✅ location            : 0 NULLs  (GOOD)
✅ salary_min          : 0 NULLs  (GOOD)
✅ salary_max          : 0 NULLs  (GOOD)
✅ job_description     : 0 NULLs  (GOOD)
```

**Status:** ✅ **EXCELLENT** — No required fields are NULL.

---

## 📋 OVERALL GAPS SUMMARY

### CRITICAL GAPS (Must Fix)
| Gap | Current | Target | Action |
|-----|---------|--------|--------|
| **Job Postings** | 83 | 120-150 | Add 37-67 postings |
| **Vendors** | 3/8 | 8/8 | Add SAP, Salesforce, Azure, ServiceNow, Workday, Modern Stack |
| **Work Type Distribution** | 30% Remote, 70% Hybrid, 0% On-site | 40/40/20 | Rebalance: add ~24 on-site, reduce ~26 hybrid |
| **Employment Type** | 69% Contract, 31% FT | 25% Contract, 70% FT | Flip ratio: add ~46 FT, reduce ~38 contract |
| **Seniority Levels** | 14 fragmented ranges | 5 clean levels | Standardize & add Entry/Lead level |
| **Locations** | 9 cities | 15+ cities | Add Denver, Atlanta, Phoenix, Charlotte, Raleigh, Portland, Minneapolis |

### MODERATE GAPS (Should Fix)
| Gap | Current | Issue | Action |
|-----|---------|-------|--------|
| **Location Preferences** | 69 | Should be 150-240 | Add location prefs for new candidates |
| **Skills per Posting** | 0 in 4-6 range | 11 have 0 skills, 72 have 7-8 | Normalize all to 4-6 |
| **Salary Ranges** | Low average | May be hourly/annual mix | Verify and separate rates |

### GOOD AREAS (No Action)
| Area | Current | Target | Status |
|------|---------|--------|--------|
| Skills Diversity | 247 unique | 80+ | ✅ Exceeds target |
| Data Quality | 0 NULLs | All populated | ✅ Perfect |
| Companies | 23 | 6-8 needed | ✅ More than sufficient |
| Job Profiles | 53 | 50-80 | ✅ Within range |

---

## ⚡ WHAT THIS MEANS

### For Phase 2 Implementation:

**Option 1: Keep Existing + Add New (RECOMMENDED)**
```
Keep: 83 existing postings (with normalization)
Add:  37-67 new postings
Total: 120-150

Details:
  • Keep Oracle postings (don't delete, just normalize skills)
  • Add 15-20 SAP postings
  • Add 15-20 Salesforce postings
  • Add 13-18 AWS postings
  • Add 10-15 Azure postings
  • Add 10-15 ServiceNow postings
  • Add 10-15 Workday postings
  • Add 10-15 Modern Stack postings
  • Add 24 On-site positions
  • Add 46 Full-time positions
  • Add location preferences
```

**Option 2: Clean Slate (RISKY)**
```
Delete: All 83 existing
Create: 120-150 new from scratch
Pros: Perfect data structure
Cons: Loses existing test data, time consuming
```

**Recommendation:** Go with **Option 1**. The existing data is clean (no NULLs) and just needs expansion + normalization.

---

## 🎯 IMPLEMENTATION ROADMAP

### Phase 2A: Normalize Existing Data (30 min)
- Standardize seniority levels (14 ranges → 5 levels)
- Normalize skills per posting (distribute all to 4-6)
- Verify salary data (hourly vs annual)

### Phase 2B: Create New Postings (2-3 hours)
- Create SAP postings (15-20)
- Create Salesforce postings (15-20)
- Create Azure postings (10-15)
- Create ServiceNow postings (10-15)
- Create Workday postings (10-15)
- Create Modern Stack postings (10-15)
- Add AWS postings to reach 13-18 (currently 2)
- Create On-site positions (24)
- Create Full-time positions (46)
- Add new locations (Denver, Atlanta, etc.)

### Phase 2C: Expand Candidates (1-2 hours - OPTIONAL)
- Create 35-65 new candidates if desired
- Add location preferences (150-240 total)

### Phase 2D: Validation (30 min)
- Run comparison script again
- Verify all targets met
- Check for new NULLs
- Validate FK relationships

**Total Time: ~3-4 hours for fully production-ready data**

---

## ✅ NEXT STEPS

Shall I proceed with:

1. **Phase 2A:** Normalize existing 83 postings (fix seniority, skills, salary)
2. **Phase 2B:** Create 37-67 new postings across missing vendors
3. **Phase 2C:** Expand candidates (optional)
4. **Phase 2D:** Final validation

Proceed? (Y/N)
