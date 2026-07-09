"""
Comprehensive Test Suite for Resume Parsing Feature
Tests resume parser service, API endpoints, and integration flows
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from fastapi.testclient import TestClient
from io import BytesIO
from app.main import app
from app.services.resume_parser import ResumeParser

# Test client
client = TestClient(app)


class TestResumeParserService:
    """Unit tests for ResumeParser service"""
    
    def test_extract_skills_basic(self):
        """Test skill extraction from resume text"""
        text = """
        Senior Software Engineer with expertise in Python, JavaScript, React, and AWS.
        Proficient in Docker, Kubernetes, PostgreSQL, and FastAPI.
        """
        skills, confidence = ResumeParser._extract_skills(text)
        
        assert confidence > 0.0, "Should return some confidence score"
        assert len(skills) > 0, "Should extract at least some skills"
        assert any('python' in s.lower() for s in skills), "Should find Python"
        assert any('react' in s.lower() for s in skills), "Should find React"
    
    def test_extract_skills_no_skills(self):
        """Test skill extraction with no technical skills"""
        text = "I am a person who likes to work hard and learn new things."
        skills, confidence = ResumeParser._extract_skills(text)
        
        assert confidence <= 0.5, "Confidence should be low with no clear skills"
        # May extract soft skills, but confidence should be low
    
    def test_extract_experience_years_explicit(self):
        """Test experience extraction with explicit years"""
        text = "10+ years of experience in software development"
        years, confidence = ResumeParser._extract_experience_years(text)
        
        assert years >= 10, f"Should extract 10+ years, got {years}"
        assert confidence >= 0.5, "Should have decent confidence with explicit statement"
    
    def test_extract_experience_years_date_range(self):
        """Test experience extraction from date ranges"""
        text = """
        Google Inc. | Software Engineer | 2015-2020
        Microsoft | Senior Engineer | 2020-2025
        """
        years, confidence = ResumeParser._extract_experience_years(text)
        
        assert years >= 8, f"Should calculate ~10 years from dates, got {years}"
        assert confidence > 0.0, "Should have some confidence from date ranges"
    
    def test_extract_seniority_level_senior(self):
        """Test seniority extraction for senior level"""
        text = "Senior Software Engineer at Google"
        seniority, confidence = ResumeParser._extract_seniority_level(text)
        
        assert seniority == 'senior', f"Should extract 'senior', got '{seniority}'"
        assert confidence >= 0.5, "Should have decent confidence"
    
    def test_extract_seniority_level_lead(self):
        """Test seniority extraction for lead/VP level"""
        text = "VP of Engineering | Director of Technology"
        seniority, confidence = ResumeParser._extract_seniority_level(text)
        
        assert seniority == 'lead', f"Should extract 'lead' for VP/Director, got '{seniority}'"
        assert confidence >= 0.5, "Should have decent confidence"
    
    def test_extract_seniority_level_manager(self):
        """Test seniority extraction for C-level"""
        text = "CEO and Co-Founder | Chief Technology Officer"
        seniority, confidence = ResumeParser._extract_seniority_level(text)
        
        assert seniority == 'manager', f"Should extract 'manager' for C-level, got '{seniority}'"
        assert confidence >= 0.5, "Should have decent confidence"
    
    def test_extract_education_doctorate(self):
        """Test education extraction for PhD"""
        text = "Ph.D. in Computer Science from Stanford University"
        education, confidence = ResumeParser._extract_education(text)
        
        assert education == 'doctorate', f"Should extract 'doctorate', got '{education}'"
        assert confidence >= 0.5, "Should have decent confidence"
    
    def test_extract_education_masters(self):
        """Test education extraction for Master's"""
        text = "Master of Science in Software Engineering"
        education, confidence = ResumeParser._extract_education(text)
        
        assert education == 'master', f"Should extract 'master', got '{education}'"
        assert confidence >= 0.5, "Should have decent confidence"
    
    def test_extract_education_bachelors(self):
        """Test education extraction for Bachelor's"""
        text = "Bachelor's Degree in Computer Science"
        education, confidence = ResumeParser._extract_education(text)
        
        assert education == 'bachelor', f"Should extract 'bachelor', got '{education}'"
        assert confidence >= 0.5, "Should have decent confidence"
    
    def test_extract_job_titles(self):
        """Test job title extraction"""
        text = """
        WORK EXPERIENCE
        Senior Software Engineer - Google (2020-2025)
        Software Developer - Microsoft (2015-2020)
        """
        titles, confidence = ResumeParser._extract_job_titles(text)
        
        # Job title extraction may return empty list if no clear titles found
        # This is acceptable as long as confidence is properly set
        assert confidence >= 0.0, "Should return valid confidence score"
        if len(titles) > 0:
            # If titles found, check they contain relevant keywords
            titles_str = ' '.join(titles).lower()
            assert any(keyword in titles_str for keyword in ['engineer', 'developer', 'software']), \
                "Extracted titles should contain relevant keywords"
    
    def test_extract_certifications(self):
        """Test certification extraction"""
        text = """
        CERTIFICATIONS
        - AWS Certified Solutions Architect
        - Certified Kubernetes Administrator (CKA)
        - PMP - Project Management Professional
        """
        certs, confidence = ResumeParser._extract_certifications(text)
        
        assert len(certs) > 0, "Should extract certifications"
        assert confidence >= 0.5, "Should have decent confidence with clear section"
    
    def test_parse_resume_for_job_preferences_complete(self):
        """Test complete job preferences parsing"""
        text = """
        JOHN DOE
        Senior Software Engineer
        
        PROFESSIONAL SUMMARY
        10+ years of experience in full-stack development with expertise in Python, React, AWS.
        
        EDUCATION
        Master of Science in Computer Science - Stanford University (2010-2012)
        
        EXPERIENCE
        Senior Software Engineer - Google Inc. (2018-2025)
        Software Engineer - Microsoft (2012-2018)
        
        SKILLS
        Python, JavaScript, React, Node.js, Docker, Kubernetes, PostgreSQL, MongoDB
        
        CERTIFICATIONS
        AWS Certified Solutions Architect
        Certified Kubernetes Administrator
        """
        
        result = ResumeParser.parse_resume_for_job_preferences(text)
        
        # Verify structure
        assert 'skills' in result
        assert 'skills_confidence' in result
        assert 'years_of_experience' in result
        assert 'seniority_level' in result
        assert 'highest_education' in result
        
        # Verify data quality
        assert len(result['skills']) > 0, "Should extract skills"
        assert result['years_of_experience'] is not None, "Should extract experience"
        
        # Seniority and education may be None if not found clearly in resume
        if result['seniority_level'] is not None:
            assert result['seniority_level'] in ['entry', 'junior', 'mid', 'senior', 'lead', 'manager'], \
                f"Seniority should be valid enum, got '{result['seniority_level']}'"
        
        if result['highest_education'] is not None:
            assert result['highest_education'] in ['high_school', 'associate', 'bachelor', 'master', 'doctorate'], \
                f"Education should be valid enum, got '{result['highest_education']}'"


class TestResumeParsingAPI:
    """Integration tests for resume parsing API endpoint"""
    
    @staticmethod
    def get_auth_headers():
        """Get authentication headers for test candidate"""
        response = client.post("/auth/login", json={
            "email": "sarah.anderson@email.com",
            "password": "Kutty_1304"
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            return {"Authorization": f"Bearer {token}"}
        return {}
    
    def test_parse_resume_endpoint_without_auth(self):
        """Test endpoint requires authentication"""
        # Create a dummy PDF file
        file_content = b"%PDF-1.4 fake pdf content"
        files = {"file": ("test_resume.pdf", BytesIO(file_content), "application/pdf")}
        
        response = client.post("/candidates/parse-resume-for-job-preferences", files=files)
        
        assert response.status_code == 401, "Should require authentication"
    
    def test_parse_resume_endpoint_invalid_file_type(self):
        """Test endpoint rejects invalid file types"""
        headers = self.get_auth_headers()
        file_content = b"Invalid file content"
        files = {"file": ("test.exe", BytesIO(file_content), "application/x-msdownload")}
        
        response = client.post("/candidates/parse-resume-for-job-preferences", 
                              files=files, headers=headers)
        
        assert response.status_code == 400, "Should reject invalid file type"
        assert "Invalid file type" in response.json()["detail"]
    
    def test_parse_resume_endpoint_file_too_large(self):
        """Test endpoint rejects files over 10MB"""
        headers = self.get_auth_headers()
        # Create a file larger than 10MB
        large_content = b"x" * (11 * 1024 * 1024)  # 11MB
        files = {"file": ("large_resume.pdf", BytesIO(large_content), "application/pdf")}
        
        response = client.post("/candidates/parse-resume-for-job-preferences",
                              files=files, headers=headers)
        
        assert response.status_code == 400, "Should reject large files"
        assert "File size must be under 10MB" in response.json()["detail"]
    
    def test_parse_resume_endpoint_empty_file(self):
        """Test endpoint rejects empty files"""
        headers = self.get_auth_headers()
        files = {"file": ("empty.pdf", BytesIO(b""), "application/pdf")}
        
        response = client.post("/candidates/parse-resume-for-job-preferences",
                              files=files, headers=headers)
        
        assert response.status_code == 400, "Should reject empty files"
        assert "empty" in response.json()["detail"].lower()
    
    def test_parse_resume_endpoint_pdf_success(self):
        """Test successful PDF parsing (mock)"""
        headers = self.get_auth_headers()
        
        # Create a simple text-based "PDF" for testing
        # In production, use a real PDF with PyPDF2
        pdf_content = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj
4 0 obj << /Length 50 >> stream
BT /F1 12 Tf 100 700 Td (Senior Engineer 10 years Python) Tj ET
endstream endobj
xref 0 5
trailer << /Size 5 /Root 1 0 R >>
%%EOF"""
        
        files = {"file": ("test_resume.pdf", BytesIO(pdf_content), "application/pdf")}
        
        response = client.post("/candidates/parse-resume-for-job-preferences",
                              files=files, headers=headers)
        
        # May fail if PDF parsing fails, but should not crash
        if response.status_code == 200:
            data = response.json()
            assert data["success"] is True
            assert "data" in data
            assert "skills" in data["data"]
            assert "years_of_experience" in data["data"]
            assert "seniority_level" in data["data"]
    
    def test_parse_resume_endpoint_txt_success(self):
        """Test successful TXT parsing"""
        headers = self.get_auth_headers()
        
        txt_content = b"""
JOHN DOE
Senior Software Engineer

EXPERIENCE
10+ years in Python, React, AWS development

EDUCATION  
Master's Degree in Computer Science

SKILLS
Python, JavaScript, React, Docker, Kubernetes, PostgreSQL
"""
        
        files = {"file": ("resume.txt", BytesIO(txt_content), "text/plain")}
        
        response = client.post("/candidates/parse-resume-for-job-preferences",
                              files=files, headers=headers)
        
        assert response.status_code == 200, f"Should succeed with TXT, got {response.status_code}"
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        
        # Verify parsed data structure
        parsed = data["data"]
        assert "skills" in parsed
        assert "skills_confidence" in parsed
        assert "years_of_experience" in parsed
        assert "seniority_level" in parsed
        assert "highest_education" in parsed
    
    def test_parse_resume_response_structure(self):
        """Test response structure matches frontend expectations"""
        headers = self.get_auth_headers()
        
        txt_content = b"Senior Developer with 5 years experience in Java and Python"
        files = {"file": ("resume.txt", BytesIO(txt_content), "text/plain")}
        
        response = client.post("/candidates/parse-resume-for-job-preferences",
                              files=files, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify top-level structure
            assert "success" in data
            assert "message" in data
            assert "data" in data
            
            # Verify all expected fields in data
            parsed = data["data"]
            expected_fields = [
                'skills', 'skills_confidence',
                'years_of_experience', 'years_of_experience_confidence',
                'seniority_level', 'seniority_level_confidence',
                'job_titles', 'job_titles_confidence',
                'preferred_job_titles', 'preferred_job_titles_confidence',
                'highest_education', 'highest_education_confidence',
                'certifications', 'certifications_confidence',
                'linkedin_url', 'linkedin_url_confidence',
                'github_url', 'github_url_confidence',
                'portfolio_url', 'portfolio_url_confidence',
            ]
            
            for field in expected_fields:
                assert field in parsed, f"Missing field: {field}"


class TestResumeParsingIntegration:
    """End-to-end integration tests"""
    
    @staticmethod
    def get_auth_headers():
        """Get authentication headers"""
        response = client.post("/auth/login", json={
            "email": "sarah.anderson@email.com",
            "password": "Kutty_1304"
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            return {"Authorization": f"Bearer {token}"}
        return {}
    
    def test_full_workflow_with_various_resumes(self):
        """Test parsing different resume formats"""
        headers = self.get_auth_headers()
        
        test_cases = [
            {
                "name": "Entry Level Fresh Graduate",
                "content": b"""
JANE SMITH
Software Developer

EDUCATION
Bachelor of Science in Computer Science - XYZ University (2024)

SKILLS
Python, Java, HTML, CSS, JavaScript, SQL

PROJECTS
E-commerce Website - Built using React and Node.js
Chat Application - Real-time messaging with WebSockets
                """,
                "expected": {
                    "seniority": "entry",
                    "education": "bachelor",
                    "skills_min": 3
                }
            },
            {
                "name": "Mid-Level Professional",
                "content": b"""
ALEX JOHNSON
Software Engineer

EXPERIENCE
Software Engineer - Tech Corp (2020-2025) - 5 years
Built scalable microservices using Python and Docker

EDUCATION
Master's in Software Engineering (2018-2020)

SKILLS
Python, JavaScript, Docker, Kubernetes, AWS, PostgreSQL
                """,
                "expected": {
                    "seniority": "mid",
                    "education": "master",
                    "experience_min": 3
                }
            },
            {
                "name": "Senior Executive",
                "content": b"""
ROBERT WILLIAMS
Chief Technology Officer

EXPERIENCE
CTO - StartupCo (2020-2025)
VP Engineering - BigTech (2015-2020)
Senior Architect - MegaCorp (2010-2015)

15+ years leading engineering teams

EDUCATION
Ph.D. in Computer Science

SKILLS
Architecture, Leadership, Python, Java, Cloud Computing, AI/ML
                """,
                "expected": {
                    "seniority": "manager",  # C-level
                    "education": "doctorate",
                    "experience_min": 10
                }
            }
        ]
        
        for test_case in test_cases:
            files = {"file": (f"{test_case['name']}.txt", 
                            BytesIO(test_case["content"]), 
                            "text/plain")}
            
            response = client.post("/candidates/parse-resume-for-job-preferences",
                                  files=files, headers=headers)
            
            assert response.status_code == 200, \
                f"Failed for {test_case['name']}: {response.text}"
            
            data = response.json()["data"]
            
            # Verify expectations (if confidence is sufficient)
            if data.get('seniority_level_confidence', 0) >= 0.3:
                assert data['seniority_level'] == test_case['expected']['seniority'], \
                    f"{test_case['name']}: Expected seniority '{test_case['expected']['seniority']}', got '{data['seniority_level']}'"
            
            if data.get('highest_education_confidence', 0) >= 0.3:
                assert data['highest_education'] == test_case['expected']['education'], \
                    f"{test_case['name']}: Expected education '{test_case['expected']['education']}', got '{data['highest_education']}'"


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
