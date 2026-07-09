# Resume Parsing Feature - Frontend & UI Testing Guide

## Overview
This document provides comprehensive manual testing procedures for the resume parsing feature in the Job Preferences page.

---

## Test Environment Setup

### Prerequisites
- Backend server running on `http://127.0.0.1:8001`
- Frontend server running on `http://localhost:3003`
- Test user credentials: `sarah.anderson@email.com` / `Kutty_1304`
- Sample resume files (PDF, DOCX, TXT formats)

### Browser Requirements
- Test in Chrome/Edge (primary)
- Test in Firefox (secondary)
- Test in Safari if available (optional)

---

## Frontend Component Tests

### 1. Resume Upload Button Visibility

**Test ID:** FE-01  
**Priority:** High  
**Objective:** Verify upload button appears only on new preference creation

#### Test Steps:
1. Navigate to Job Preferences page
2. Verify "Upload Resume" button is NOT visible in list view
3. Click "Create First Preference" or "Add Preference"
4. Verify "Upload Resume" banner appears at top of form
5. Fill out profile name and save
6. Click "Edit" on saved preference
7. Verify "Upload Resume" button is NOT visible in edit mode

#### Expected Results:
- ✅ Upload button visible only when creating NEW preference
- ✅ Upload button hidden in edit mode
- ✅ Banner has purple gradient background with file icon

---

### 2. File Input Validation

**Test ID:** FE-02  
**Priority:** Critical  
**Objective:** Verify file type and size validation

#### Test Cases:

##### 2.1 Valid File Types
| File Type | Extension | Expected Result |
|-----------|-----------|-----------------|
| PDF | .pdf | ✅ Accepted |
| DOCX | .docx | ✅ Accepted |
| DOC | .doc | ✅ Accepted |
| TXT | .txt | ✅ Accepted |

**Steps:**
1. Click "Upload Resume" button
2. Select file of each type above
3. Verify upload initiates

##### 2.2 Invalid File Types
| File Type | Extension | Expected Error |
|-----------|-----------|----------------|
| Image | .jpg, .png | "Invalid file type" |
| Executable | .exe | "Invalid file type" |
| Archive | .zip, .rar | "Invalid file type" |
| Spreadsheet | .xlsx | "Invalid file type" |

**Steps:**
1. Click "Upload Resume" button
2. Select invalid file
3. Verify error toast appears with message
4. Verify no upload occurs

##### 2.3 File Size Validation
**Steps:**
1. Create a test file > 10MB
2. Try to upload
3. Verify error toast: "File size must be under 10MB"
4. Create a 0-byte empty file
5. Try to upload
6. Verify appropriate error message

---

### 3. Upload Progress Indication

**Test ID:** FE-03  
**Priority:** High  
**Objective:** Verify loading states during upload

#### Test Steps:
1. Click "Upload Resume"
2. Select a valid resume file
3. Immediately observe button state

#### Expected Results:
- ✅ Button text changes to "Parsing..."
- ✅ Button becomes disabled during upload
- ✅ Loading spinner or animation appears
- ✅ Button returns to normal after completion
- ✅ No double-upload possible during parsing

---

### 4. Field Auto-Population

**Test ID:** FE-04  
**Priority:** Critical  
**Objective:** Verify parsed data populates form fields

#### Test Setup:
Create test resume with known content:
```
Name: John Doe
Title: Senior Software Engineer
Experience: 10+ years
Education: Master's Degree
Skills: Python, React, AWS, Docker, PostgreSQL
Certifications: AWS Certified Solutions Architect
```

#### Test Steps:
1. Upload the test resume
2. Wait for "Resume parsed successfully" toast
3. Check each field:

##### Fields to Verify:
| Field | Expected Value | Confidence Threshold |
|-------|----------------|---------------------|
| Years of Experience | 10 | ≥ 0.3 |
| Relevant Experience | 10 | ≥ 0.3 |
| Seniority Level | "Senior" selected | ≥ 0.3 |
| Preferred Job Titles | Contains "Software Engineer" | ≥ 0.3 |
| Highest Education | "Master's Degree" selected | ≥ 0.3 |
| Skills | Python, React, AWS, Docker listed | ≥ 0.3 |

#### Expected Results:
- ✅ Fields populate automatically
- ✅ Dropdown values match parsed data
- ✅ Array fields (skills, titles) are properly formatted
- ✅ Confidence badge appears next to auto-filled fields
- ✅ Success toast shows number of fields filled

---

### 5. Confidence Score Indication

**Test ID:** FE-05  
**Priority:** Medium  
**Objective:** Verify visual indicators for parsed fields

#### Test Steps:
1. Upload resume
2. Look for parsed field badges/indicators

#### Expected Results:
- ✅ Green checkmark or badge appears next to auto-filled fields
- ✅ Badge tooltip shows "Auto-filled from resume" (if implemented)
- ✅ Toast message shows count: "7 fields auto-filled"

---

### 6. Manual Override Capability

**Test ID:** FE-06  
**Priority:** High  
**Objective:** Verify user can edit auto-filled values

#### Test Steps:
1. Upload resume that auto-fills "Seniority Level" to "Senior"
2. Manually change dropdown to "Lead"
3. Add a skill manually
4. Remove an auto-filled skill
5. Click "Save Preference"
6. Navigate away and come back
7. Verify manual changes persisted

#### Expected Results:
- ✅ All auto-filled fields remain editable
- ✅ Manual changes override parsed values
- ✅ Save button saves manual changes
- ✅ No re-parsing on page reload

---

### 7. Error Handling

**Test ID:** FE-07  
**Priority:** Critical  
**Objective:** Verify graceful error handling

#### Test Cases:

##### 7.1 Backend Server Down
**Steps:**
1. Stop backend server
2. Try to upload resume
3. Observe error handling

**Expected:**
- ✅ Error toast appears
- ✅ Message: "Failed to connect" or "Network error"
- ✅ Button returns to normal state
- ✅ No form corruption

##### 7.2 Malformed Resume
**Steps:**
1. Create corrupted PDF (random binary data)
2. Upload file
3. Observe error

**Expected:**
- ✅ Error toast: "Failed to parse resume"
- ✅ Form remains intact
- ✅ User can retry with different file

##### 7.3 Resume with No Extractable Data
**Steps:**
1. Create TXT with gibberish: "asdfasdf 12345 @#$%"
2. Upload file
3. Observe response

**Expected:**
- ✅ Success toast: "Resume parsed successfully. 0 fields auto-filled."
- ✅ No fields change
- ✅ No errors thrown

---

### 8. Multiple Resume Upload

**Test ID:** FE-08  
**Priority:** Medium  
**Objective:** Verify behavior with multiple uploads

#### Test Steps:
1. Upload Resume A (has skills: Python, React)
2. Wait for completion
3. Upload Resume B (has skills: Java, AWS)
4. Verify behavior

#### Expected Results:
- ✅ Second upload replaces/merges with first
- ✅ Latest upload takes precedence
- ✅ No duplicate skills added
- ✅ Parsed fields counter updates correctly

---

### 9. Form State Preservation

**Test ID:** FE-09  
**Priority:** High  
**Objective:** Verify form data not lost during upload

#### Test Steps:
1. Manually fill out "Profile Name" field: "My Oracle Profile"
2. Manually select "Product Vendor": "Oracle"
3. Upload resume
4. Wait for parsing
5. Verify manually entered data

#### Expected Results:
- ✅ Profile Name still shows "My Oracle Profile"
- ✅ Product Vendor still shows "Oracle"
- ✅ Only empty fields get auto-filled
- ✅ No data loss during parsing

---

### 10. Accessibility Testing

**Test ID:** FE-10  
**Priority:** Medium  
**Objective:** Verify keyboard and screen reader support

#### Test Steps:
1. **Keyboard Navigation:**
   - Tab to "Upload Resume" button
   - Press Enter to trigger file dialog
   - Tab through auto-filled fields
   - Verify focus indicators visible

2. **Screen Reader:**
   - Enable screen reader (NVDA/JAWS)
   - Navigate to upload button
   - Verify proper labels announced
   - Verify success/error messages announced

#### Expected Results:
- ✅ All interactive elements keyboard accessible
- ✅ Focus indicators visible
- ✅ ARIA labels present
- ✅ Status messages announced

---

## UI Visual Regression Tests

### 11. Upload Banner Styling

**Test ID:** UI-01  
**Priority:** Low  
**Objective:** Verify visual consistency

#### Visual Checklist:
- ✅ Purple gradient background (135deg, #667eea to #764ba2)
- ✅ White text color
- ✅ File icon displayed on left
- ✅ Responsive layout (stacks on mobile)
- ✅ Upload button has rounded corners
- ✅ Upload button hover effect works
- ✅ Parsed fields badge has green checkmark

#### Test in Different Screen Sizes:
| Size | Resolution | Expected |
|------|------------|----------|
| Desktop | 1920x1080 | Banner full width, button inline |
| Tablet | 768x1024 | Banner full width, button below text |
| Mobile | 375x667 | Banner stacked, button full width |

---

### 12. Toast Notifications

**Test ID:** UI-02  
**Priority:** Medium  
**Objective:** Verify toast appearance and behavior

#### Test Cases:

##### 12.1 Success Toast
**Expected:**
- ✅ Green background
- ✅ Checkmark icon
- ✅ Message: "Resume '[filename]' parsed! Auto-filled X fields"
- ✅ Appears top-right of screen
- ✅ Auto-dismisses after 3.5 seconds
- ✅ Can be manually dismissed

##### 12.2 Error Toast
**Expected:**
- ✅ Red background
- ✅ Error icon
- ✅ Message shows specific error
- ✅ Remains until manually dismissed or 5 seconds

---

## Integration Tests

### 13. End-to-End Workflow

**Test ID:** E2E-01  
**Priority:** Critical  
**Objective:** Complete user journey

#### Test Steps:
1. **Setup:**
   - Login as candidate
   - Navigate to Job Preferences
   - Click "Create First Preference"

2. **Upload & Parse:**
   - Click "Upload Resume"
   - Select valid resume file
   - Wait for parsing completion

3. **Review & Edit:**
   - Verify auto-filled fields
   - Manually add Profile Name: "Oracle Cloud Expert"
   - Manually select Product Vendor: "Oracle"
   - Manually add a custom skill

4. **Save:**
   - Click "Save Preference"
   - Wait for success message

5. **Verify:**
   - Navigate to list view
   - Verify preference appears with correct data
   - Click "Edit"
   - Verify all data persisted correctly

#### Expected Results:
- ✅ Complete workflow succeeds
- ✅ All data saved correctly
- ✅ No errors or warnings
- ✅ Data persists across navigation

---

## Performance Tests

### 14. Upload Speed

**Test ID:** PERF-01  
**Priority:** Medium  
**Objective:** Verify acceptable performance

#### Test Cases:
| File Size | Expected Parse Time |
|-----------|---------------------|
| 50 KB TXT | < 1 second |
| 500 KB PDF | < 3 seconds |
| 2 MB DOCX | < 5 seconds |
| 5 MB PDF (max realistic) | < 10 seconds |

#### Test Steps:
1. Upload file
2. Start timer when request sent
3. Stop timer when response received
4. Verify within acceptable range

---

## Browser Compatibility Tests

### 15. Cross-Browser Testing

**Test ID:** COMPAT-01  
**Priority:** Medium  
**Objective:** Verify feature works across browsers

#### Browser Matrix:
| Browser | Version | File Upload | Parsing | Field Population |
|---------|---------|-------------|---------|------------------|
| Chrome | Latest | ✅ | ✅ | ✅ |
| Edge | Latest | ✅ | ✅ | ✅ |
| Firefox | Latest | ? | ? | ? |
| Safari | Latest | ? | ? | ? |

#### Test Each Browser:
1. File selection dialog works
2. Upload progresses
3. Parsing completes
4. Fields populate correctly
5. Toast notifications display

---

## Security Tests

### 16. File Upload Security

**Test ID:** SEC-01  
**Priority:** High  
**Objective:** Verify no security vulnerabilities

#### Test Cases:

##### 16.1 Malicious File Names
**Steps:**
1. Rename file to: `../../etc/passwd.pdf`
2. Upload file
3. Verify no path traversal

##### 16.2 Script Injection
**Steps:**
1. Create TXT with: `<script>alert('XSS')</script>`
2. Upload and parse
3. Verify no script execution

##### 16.3 Authentication Required
**Steps:**
1. Logout
2. Try to access upload endpoint directly
3. Verify 401 Unauthorized

---

## Regression Tests

### 17. Input Focus Issue

**Test ID:** REG-01  
**Priority:** Critical  
**Objective:** Verify focus fix remains stable

#### Test Steps:
1. Click on "Profile Name" field
2. Type "Oracle Cloud Senior Developer"
3. Verify you can type continuously without re-clicking

#### Expected Results:
- ✅ Full string typed without interruption
- ✅ No focus loss after each keystroke
- ✅ Cursor remains in field

---

## Test Execution Checklist

### Before Testing:
- [ ] Backend server running and healthy
- [ ] Frontend server running
- [ ] Test user account created
- [ ] Sample resume files prepared (PDF, DOCX, TXT)
- [ ] Browser DevTools console open

### During Testing:
- [ ] Monitor console for errors
- [ ] Check Network tab for failed requests
- [ ] Verify no memory leaks (increase over time)
- [ ] Take screenshots of issues

### After Testing:
- [ ] Document all bugs found
- [ ] Log bug severity (Critical/High/Medium/Low)
- [ ] Create reproduction steps
- [ ] Verify fixes don't break other features

---

## Sample Test Resumes

### High Confidence Resume (should parse well)
```
JOHN DOE
Senior Software Engineer | john.doe@email.com | +1-555-0123

PROFESSIONAL SUMMARY
Highly skilled Senior Software Engineer with 10+ years of experience in 
full-stack development, specializing in Python, React, and AWS cloud services.

EXPERIENCE
Senior Software Engineer | Google Inc. | 2018 - 2025
- Led team of 5 engineers building scalable microservices
- Architected cloud infrastructure serving 1M+ users

Software Engineer | Microsoft Corporation | 2013 - 2018
- Developed enterprise applications using .NET and SQL Server

EDUCATION
Master of Science in Computer Science | Stanford University | 2011-2013
Bachelor of Science in Software Engineering | MIT | 2007-2011

SKILLS
Programming: Python, JavaScript, Java, C++, TypeScript
Frameworks: React, Node.js, Django, Flask, FastAPI
Cloud: AWS, Azure, GCP, Docker, Kubernetes
Databases: PostgreSQL, MongoDB, Redis, MySQL

CERTIFICATIONS
- AWS Certified Solutions Architect - Professional
- Certified Kubernetes Administrator (CKA)
- PMP - Project Management Professional

LINKS
LinkedIn: linkedin.com/in/johndoe
GitHub: github.com/johndoe
Portfolio: johndoe.dev
```

### Low Confidence Resume (minimal data)
```
Resume

Name: Jane
Job: Developer
School: College

I am good at computers and want a job.
```

---

## Bug Report Template

```markdown
**Bug ID:** [Unique ID]
**Title:** [Short description]
**Severity:** [Critical/High/Medium/Low]
**Priority:** [P0/P1/P2/P3]

**Environment:**
- Browser: [Chrome 120.0]
- OS: [Windows 11]
- Frontend Version: [2.0.0]
- Backend Version: [2.0.0]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happens]

**Screenshots:**
[Attach screenshots]

**Console Errors:**
```
[Paste console errors]
```

**Additional Context:**
[Any other relevant information]
```

---

## Test Metrics & Success Criteria

### Acceptance Criteria:
- ✅ 100% of critical tests pass
- ✅ 95%+ of high priority tests pass
- ✅ No P0/P1 bugs remaining
- ✅ Upload success rate > 98%
- ✅ Average parse time < 5 seconds
- ✅ Zero security vulnerabilities
- ✅ Cross-browser compatibility confirmed

### Quality Gates:
- **Critical bugs:** 0
- **High bugs:** ≤ 2
- **Medium bugs:** ≤ 5
- **Low bugs:** ≤ 10

---

## Automation Recommendations

For future automation, consider:
1. **Cypress/Playwright** for E2E tests
2. **Jest + React Testing Library** for component tests
3. **Lighthouse** for performance testing
4. **axe-core** for accessibility testing

---

## Test Sign-off

**Tested By:** _______________  
**Date:** _______________  
**Test Environment:** _______________  
**Overall Status:** [ ] Pass [ ] Fail [ ] Conditional Pass  

**Notes:**
_______________________________________________
_______________________________________________
