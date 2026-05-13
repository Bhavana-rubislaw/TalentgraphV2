# Sample Test Resumes

## Test Resume 1: Complete Profile (High Confidence)

Create a PDF or DOCX file with this content:

```
JOHN ALEXANDER DOE
john.doe@example.com | +1-555-123-4567
456 Oak Avenue, San Francisco, California 94102

LinkedIn: https://linkedin.com/in/johndoe
GitHub: https://github.com/johndoe

PROFESSIONAL SUMMARY
Experienced Full-Stack Software Engineer with 5+ years of expertise in developing scalable web applications using Python, React, and PostgreSQL. Proven track record of delivering high-quality software solutions in fast-paced startup environments.

WORK EXPERIENCE

Senior Software Engineer | TechCorp Inc. | San Francisco, CA | 2021 - Present
- Led development of microservices architecture serving 1M+ users
- Implemented CI/CD pipelines reducing deployment time by 60%
- Mentored 3 junior developers in best practices and code review

Software Engineer | StartupXYZ | Palo Alto, CA | 2019 - 2021
- Built RESTful APIs using FastAPI and PostgreSQL
- Developed responsive frontend using React and TypeScript
- Collaborated with product team to deliver 15+ features

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley | 2015 - 2019

SKILLS
Languages: Python, JavaScript, TypeScript, SQL
Frameworks: FastAPI, React, Node.js, Django
Tools: Git, Docker, PostgreSQL, Redis, AWS
```

**Expected Parsing Results:**
- Name: "JOHN ALEXANDER DOE" (HIGH confidence ~0.95)
- Email: "john.doe@example.com" (HIGH confidence ~1.0)
- Phone: "+1-555-123-4567" (HIGH confidence ~1.0)
- Address: "456 Oak Avenue" (MEDIUM confidence ~0.7)
- State: "California" (MEDIUM confidence ~0.7)
- Zipcode: "94102" (MEDIUM confidence ~0.7)
- County: Empty (LOW confidence ~0.0)
- LinkedIn: "https://linkedin.com/in/johndoe" (HIGH confidence ~0.9)
- GitHub: "https://github.com/johndoe" (HIGH confidence ~0.9)

---

## Test Resume 2: Incomplete Profile (Missing Fields)

Create a PDF or DOCX file with this content:

```
Sarah Johnson
sarah.j@example.com

Professional Experience

Marketing Manager | ABC Company | 2020 - Present
Led digital marketing campaigns resulting in 40% increase in customer engagement.
Managed team of 5 marketing specialists.

Social Media Coordinator | XYZ Corp | 2018 - 2020
Created and executed social media strategy across multiple platforms.
Increased follower base by 200% in 18 months.

Education
MBA in Marketing | Stanford University | 2018
BA in Communications | UCLA | 2016
```

**Expected Parsing Results:**
- Name: "Sarah Johnson" (HIGH confidence ~0.9)
- Email: "sarah.j@example.com" (HIGH confidence ~1.0)
- Phone: Empty (LOW confidence ~0.0) ⚠️
- Address: Empty (LOW confidence ~0.0) ⚠️
- State: Empty (LOW confidence ~0.0) ⚠️
- County: Empty (LOW confidence ~0.0) ⚠️
- Zipcode: Empty (LOW confidence ~0.0) ⚠️
- LinkedIn: Empty (LOW confidence ~0.0)
- GitHub: Empty (LOW confidence ~0.0)

**Testing Value:** Tests missing required fields highlighting (red borders)

---

## Test Resume 3: Alternative Phone Formats

Create a PDF or DOCX file with this content:

```
Michael Chen
michael.chen@gmail.com
Phone: (555) 987-6543

123 Elm Street
Austin, Texas 78701

OBJECTIVE
Seeking a challenging position as a Data Analyst where I can utilize my analytical skills and technical expertise.

PROFESSIONAL SUMMARY
Data analyst with 3 years of experience in business intelligence, data visualization, and statistical analysis. Proficient in SQL, Python, and Tableau.

EXPERIENCE
Data Analyst | DataCorp | Austin, TX | 2021 - Present
- Developed Tableau dashboards for executive reporting
- Analyzed customer data to identify trends and insights
- Automated reporting processes using Python scripts

Junior Analyst | Analytics Inc. | Houston, TX | 2020 - 2021
- Performed ad-hoc data analysis for business stakeholders
- Created SQL queries to extract and transform data
- Supported senior analysts with data visualization projects

EDUCATION
BS in Statistics | University of Texas at Austin | 2020

TECHNICAL SKILLS
Programming: Python, R, SQL
Visualization: Tableau, Power BI, Matplotlib
Databases: PostgreSQL, MySQL, MongoDB
```

**Expected Parsing Results:**
- Name: "Michael Chen" (HIGH confidence ~0.9)
- Email: "michael.chen@gmail.com" (HIGH confidence ~1.0)
- Phone: "(555) 987-6543" (HIGH confidence ~1.0)
- Address: "123 Elm Street" (MEDIUM confidence ~0.7)
- State: "Texas" (MEDIUM confidence ~0.7)
- Zipcode: "78701" (MEDIUM confidence ~0.7)
- County: Empty (LOW confidence ~0.0) ⚠️
- LinkedIn: Empty (LOW confidence ~0.0)
- GitHub: Empty (LOW confidence ~0.0)

**Testing Value:** Tests alternative phone format parsing

---

## Test Resume 4: Email-Derived Name

Create a PDF or DOCX file with this content:

```
Contact: emma.wilson@outlook.com
Mobile: 555-234-5678

2000 Main Street, Apt 5B
Denver, Colorado 80202

Profile: https://linkedin.com/in/emmawilson

ABOUT ME
Passionate graphic designer with 4 years of experience creating compelling visual content for brands across various industries. Specializing in brand identity, digital design, and user interface design.

PORTFOLIO
www.emmawilsondesign.com

EXPERIENCE

Senior Graphic Designer | Creative Agency | Denver, CO | 2022 - Present
• Lead designer for 10+ client accounts
• Created brand identities and marketing materials
• Collaborated with web development team on UI/UX projects

Graphic Designer | Design Studio | Boulder, CO | 2020 - 2022
• Designed logos, brochures, and digital advertisements
• Managed multiple projects simultaneously
• Presented design concepts to clients

EDUCATION
BFA in Graphic Design | Rocky Mountain College of Art + Design | 2020

SOFTWARE SKILLS
Adobe Creative Suite (Photoshop, Illustrator, InDesign)
Figma, Sketch, After Effects
```

**Expected Parsing Results:**
- Name: "Emma Wilson" (MEDIUM confidence ~0.6) - Derived from email
- Email: "emma.wilson@outlook.com" (HIGH confidence ~1.0)
- Phone: "555-234-5678" (HIGH confidence ~1.0)
- Address: "2000 Main Street, Apt 5B" (MEDIUM confidence ~0.7)
- State: "Colorado" (MEDIUM confidence ~0.7)
- Zipcode: "80202" (MEDIUM confidence ~0.7)
- County: Empty (LOW confidence ~0.0) ⚠️
- LinkedIn: "https://linkedin.com/in/emmawilson" (HIGH confidence ~0.9)
- GitHub: Empty (LOW confidence ~0.0)

**Testing Value:** Tests name extraction from email when not present in text

---

## Test Resume 5: Unconventional Format

Create a PDF or DOCX file with this content:

```
ROBERT "BOB" MARTINEZ
rob.martinez@company.com

========================================
CONTACT INFORMATION
========================================
Cell: 1-555-876-5432
Address: 789 Pine Road, Seattle, WA 98101
GitHub: github.com/robertmartinez
LinkedIn: linkedin.com/in/robert-martinez-dev

========================================
CAREER PROFILE
========================================
DevOps Engineer with 6 years of experience in cloud infrastructure, automation, and CI/CD pipelines. AWS and Docker certified professional.

========================================
PROFESSIONAL EXPERIENCE
========================================

DevOps Engineer III | CloudTech Solutions | Seattle, WA
January 2022 - Present
→ Architected and deployed Kubernetes clusters for production workloads
→ Implemented infrastructure as code using Terraform and Ansible
→ Reduced infrastructure costs by 30% through optimization

DevOps Engineer II | WebScale Inc. | Portland, OR
June 2019 - December 2021
→ Built CI/CD pipelines using Jenkins and GitLab CI
→ Managed AWS infrastructure serving 500K daily active users
→ Automated deployment processes reducing manual work by 80%

========================================
CERTIFICATIONS
========================================
• AWS Certified Solutions Architect - Professional
• Certified Kubernetes Administrator (CKA)
• Docker Certified Associate

========================================
TECHNICAL EXPERTISE
========================================
Cloud: AWS (EC2, S3, RDS, Lambda), Azure, Google Cloud
Containers: Docker, Kubernetes, ECS
IaC: Terraform, CloudFormation, Ansible
CI/CD: Jenkins, GitLab CI, GitHub Actions
Languages: Python, Bash, Go
```

**Expected Parsing Results:**
- Name: "ROBERT "BOB" MARTINEZ" (HIGH confidence ~0.9)
- Email: "rob.martinez@company.com" (HIGH confidence ~1.0)
- Phone: "1-555-876-5432" (HIGH confidence ~1.0)
- Address: "789 Pine Road" (MEDIUM confidence ~0.7)
- State: "WA" (MEDIUM confidence ~0.7) - Note: Abbreviation
- Zipcode: "98101" (MEDIUM confidence ~0.7)
- County: Empty (LOW confidence ~0.0) ⚠️
- LinkedIn: "linkedin.com/in/robert-martinez-dev" (HIGH confidence ~0.9)
- GitHub: "github.com/robertmartinez" (HIGH confidence ~0.9)

**Testing Value:** Tests unconventional formatting with symbols and state abbreviations

---

## Testing Instructions

### Creating Test Files

**Option 1: Using Microsoft Word**
1. Copy the resume text above
2. Open Microsoft Word
3. Paste the content
4. Save as `.docx` file
5. Also save as PDF: File → Save As → PDF

**Option 2: Using Google Docs**
1. Create new Google Doc
2. Paste resume text
3. Download as DOCX: File → Download → Microsoft Word
4. Download as PDF: File → Download → PDF

**Option 3: Quick PDF Creation (Python)**
```python
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def create_test_resume(filename, content):
    c = canvas.Canvas(filename, pagesize=letter)
    y = 750
    for line in content.split('\n'):
        c.drawString(50, y, line)
        y -= 15
        if y < 50:
            c.showPage()
            y = 750
    c.save()

# Use with resume content above
```

### Testing Workflow

1. **Test High-Confidence Resume** (Resume 1)
   - Upload → Should auto-fill most fields
   - Only county should need manual entry
   - All other fields green/orange

2. **Test Incomplete Resume** (Resume 2)
   - Upload → Most fields empty
   - Multiple red-bordered required fields
   - Test manual completion workflow

3. **Test Phone Format** (Resume 3)
   - Verify (555) 987-6543 format parses correctly
   - Check county field still missing

4. **Test Email-Derived Name** (Resume 4)
   - Verify "Emma Wilson" extracted from email
   - Should show MEDIUM confidence for name

5. **Test Unconventional Format** (Resume 5)
   - Verify parsing works with decorative elements
   - Check state abbreviation "WA" vs "Washington"

### Expected UI Behavior

**Red Border + Red Background:**
- Empty required fields: phone, address, state, county, zipcode

**Orange Border + Orange Background + Badge:**
- Fields with confidence < 0.5
- "Low Confidence - Please Review" badge visible

**Normal Border:**
- Fields with confidence ≥ 0.5
- All optional fields

---

## API Testing with curl

### Upload Resume
```powershell
# Get auth token first
$token = "your_jwt_token_here"

# Upload resume
curl -X POST "http://localhost:8001/candidates/onboarding/upload-resume" `
  -H "Authorization: Bearer $token" `
  -F "file=@test_resume.pdf"
```

### Get Draft
```powershell
curl -X GET "http://localhost:8001/candidates/onboarding/draft" `
  -H "Authorization: Bearer $token"
```

### Update Draft
```powershell
curl -X PUT "http://localhost:8001/candidates/onboarding/draft" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{
    "name": "Corrected Name",
    "phone": "+1-555-999-8888",
    "location_county": "San Francisco County"
  }'
```

### Finalize
```powershell
curl -X POST "http://localhost:8001/candidates/onboarding/finalize" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"reviewed": true}'
```

---

## Edge Cases to Test

1. **Very Large Resume** (>10MB)
   - Should reject with error message

2. **Unsupported Format** (.txt, .rtf)
   - Should show error message

3. **Password-Protected PDF**
   - Parsing should fail gracefully

4. **Scanned Resume (Image PDF)**
   - Text extraction will fail
   - Should show parsing error

5. **Multiple Phone Numbers**
   - Should extract first valid phone number

6. **International Address**
   - May not parse correctly
   - Fields should remain empty for manual entry

7. **No Name in Resume**
   - Should derive from email (MEDIUM confidence)

8. **Finalize Without Required Fields**
   - Backend should return 400 error
   - Error message should list missing fields

---

## Success Metrics

After testing all 5 resumes, verify:

- ✅ All PDF and DOCX files upload successfully
- ✅ Email always extracted with HIGH confidence
- ✅ Phone numbers extracted in various formats
- ✅ Name extraction works (text or email-derived)
- ✅ Location fields extracted when present
- ✅ Missing fields highlighted in red
- ✅ Low-confidence fields highlighted in orange
- ✅ Draft save works correctly
- ✅ Final save validates required fields
- ✅ Profile created only after finalization
- ✅ Redirect to dashboard after completion

---

## Performance Benchmarks

**Expected Processing Times:**
- File upload: < 1 second
- Text extraction: < 2 seconds
- Field parsing: < 1 second
- Total: < 4 seconds for average resume

**File Size Support:**
- Typical resume: 50-500 KB
- Maximum supported: 10 MB
- Recommended: Keep under 2 MB

---

## Next Steps After Testing

1. Collect accuracy metrics for each field
2. Identify common parsing failures
3. Consider additional field extractors (skills, experience dates)
4. Implement machine learning for better accuracy
5. Add resume quality scoring
6. Support additional file formats (RTF, TXT)

---

**Happy Testing! 🎉**
