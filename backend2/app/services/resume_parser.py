"""
Resume parsing service - Extract structured data from resume files
Supports PDF and DOCX formats with confidence scoring
"""

import re
import logging
from typing import Dict, Any, Optional, Tuple
from pathlib import Path
import json

logger = logging.getLogger(__name__)


class ResumeParser:
    """Parse resume text and extract structured candidate data"""
    
    # Confidence thresholds
    HIGH_CONFIDENCE = 0.8
    MEDIUM_CONFIDENCE = 0.5
    LOW_CONFIDENCE = 0.3
    
    # US States for location parsing
    US_STATES = [
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
        'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
        'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
        'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
        'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
        'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
        'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
    ]
    
    # State abbreviations
    STATE_ABBREV = {
        'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
        'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
        'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
        'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
        'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
        'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire',
        'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina',
        'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania',
        'RI': 'Rhode Island', 'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee',
        'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington',
        'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
    }
    
    @staticmethod
    def extract_text_from_file(file_path: str) -> str:
        """Extract text from PDF, DOCX, DOC, or TXT file"""
        file_path_obj = Path(file_path)
        extension = file_path_obj.suffix.lower()
        
        try:
            if extension == '.pdf':
                return ResumeParser._extract_from_pdf(file_path)
            elif extension in ['.docx', '.doc']:
                return ResumeParser._extract_from_docx(file_path)
            elif extension == '.txt':
                return ResumeParser._extract_from_txt(file_path)
            else:
                logger.error(f"Unsupported file format: {extension}")
                raise ValueError(f"Unsupported file format: {extension}")
        except Exception as e:
            logger.error(f"Error extracting text from {file_path}: {e}")
            raise
    
    @staticmethod
    def _extract_from_txt(file_path: str) -> str:
        """Extract text from plain text file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        except UnicodeDecodeError:
            # Try with different encoding if UTF-8 fails
            try:
                with open(file_path, 'r', encoding='latin-1') as file:
                    return file.read()
            except Exception as e:
                logger.error(f"Failed to read text file with alternative encoding: {e}")
                raise
    
    @staticmethod
    def _extract_from_pdf(file_path: str) -> str:
        """Extract text from PDF using PyPDF2"""
        try:
            import PyPDF2
            text = []
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text.append(page.extract_text())
            return '\n'.join(text)
        except ImportError:
            logger.error("PyPDF2 not installed. Install with: pip install PyPDF2")
            raise ImportError("PyPDF2 library required for PDF parsing")
    
    @staticmethod
    def _extract_from_docx(file_path: str) -> str:
        """Extract text from DOCX using python-docx"""
        try:
            from docx import Document
            doc = Document(file_path)
            text = []
            for paragraph in doc.paragraphs:
                text.append(paragraph.text)
            return '\n'.join(text)
        except ImportError:
            logger.error("python-docx not installed. Install with: pip install python-docx")
            raise ImportError("python-docx library required for DOCX parsing")
    
    @staticmethod
    def parse_resume(text: str) -> Dict[str, Any]:
        """
        Parse resume text and extract candidate fields with confidence scores
        Returns dict with parsed fields and their confidence scores
        """
        logger.info("Starting resume parsing")
        
        result = {
            'name': None, 'name_confidence': 0.0,
            'email': None, 'email_confidence': 0.0,
            'phone': None, 'phone_confidence': 0.0,
            'residential_address': None, 'residential_address_confidence': 0.0,
            'location_state': None, 'location_state_confidence': 0.0,
            'location_county': None, 'location_county_confidence': 0.0,
            'location_zipcode': None, 'location_zipcode_confidence': 0.0,
            'linkedin_url': None, 'linkedin_url_confidence': 0.0,
            'github_url': None, 'github_url_confidence': 0.0,
            'portfolio_url': None, 'portfolio_url_confidence': 0.0,
            'profile_summary': None, 'profile_summary_confidence': 0.0,
        }
        
        # Parse each field
        result['email'], result['email_confidence'] = ResumeParser._extract_email(text)
        result['phone'], result['phone_confidence'] = ResumeParser._extract_phone(text)
        result['name'], result['name_confidence'] = ResumeParser._extract_name(text, result['email'])
        result['linkedin_url'], result['linkedin_url_confidence'] = ResumeParser._extract_linkedin(text)
        result['github_url'], result['github_url_confidence'] = ResumeParser._extract_github(text)
        result['portfolio_url'], result['portfolio_url_confidence'] = ResumeParser._extract_portfolio(text)
        
        # Location parsing
        address, state, county, zipcode = ResumeParser._extract_location(text)
        result['residential_address'] = address[0] if address else None
        result['residential_address_confidence'] = address[1] if address else 0.0
        result['location_state'] = state[0] if state else None
        result['location_state_confidence'] = state[1] if state else 0.0
        result['location_county'] = county[0] if county else None
        result['location_county_confidence'] = county[1] if county else 0.0
        result['location_zipcode'] = zipcode[0] if zipcode else None
        result['location_zipcode_confidence'] = zipcode[1] if zipcode else 0.0
        
        # Extract profile summary
        result['profile_summary'], result['profile_summary_confidence'] = ResumeParser._extract_summary(text)
        
        logger.info(f"Resume parsing completed. Extracted {sum(1 for k, v in result.items() if k.endswith('_confidence') and v > 0)} fields")
        return result
    
    @staticmethod
    def _extract_email(text: str) -> Tuple[Optional[str], float]:
        """Extract email address with confidence"""
        # Email regex pattern
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        
        if emails:
            # Use first email found (usually the primary one)
            return emails[0].lower(), ResumeParser.HIGH_CONFIDENCE
        return None, 0.0
    
    @staticmethod
    def _extract_phone(text: str) -> Tuple[Optional[str], float]:
        """Extract phone number with confidence"""
        # Phone patterns - various formats
        phone_patterns = [
            r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # (123) 456-7890 or 123-456-7890
            r'\+1[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # +1 (123) 456-7890
            r'\d{10}',  # 1234567890
        ]
        
        for pattern in phone_patterns:
            phones = re.findall(pattern, text)
            if phones:
                # Clean and format phone
                phone = re.sub(r'[^\d+]', '', phones[0])
                if len(phone) >= 10:
                    return phones[0], ResumeParser.HIGH_CONFIDENCE
        
        return None, 0.0
    
    @staticmethod
    def _extract_name(text: str, email: Optional[str] = None) -> Tuple[Optional[str], float]:
        """Extract candidate name - usually first line or derived from email"""
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        if not lines:
            return None, 0.0
        
        # Try first non-empty line (common resume format)
        first_line = lines[0]
        
        # Check if first line looks like a name (2-4 words, title case, no special chars)
        words = first_line.split()
        if 2 <= len(words) <= 4 and all(word[0].isupper() for word in words if word):
            # Check it's not a heading like "RESUME" or "CURRICULUM VITAE"
            if not any(keyword in first_line.upper() for keyword in ['RESUME', 'CV', 'CURRICULUM', 'VITAE']):
                return first_line, ResumeParser.HIGH_CONFIDENCE
        
        # Fallback: derive from email if available
        if email:
            email_name = email.split('@')[0]
            # Convert john.doe or john_doe to John Doe
            name_parts = re.split(r'[._-]', email_name)
            name = ' '.join(word.capitalize() for word in name_parts)
            return name, ResumeParser.MEDIUM_CONFIDENCE
        
        return None, 0.0
    
    @staticmethod
    def _extract_linkedin(text: str) -> Tuple[Optional[str], float]:
        """Extract LinkedIn URL"""
        linkedin_pattern = r'(?:https?://)?(?:www\.)?linkedin\.com/in/[\w-]+'
        matches = re.findall(linkedin_pattern, text, re.IGNORECASE)
        
        if matches:
            url = matches[0]
            if not url.startswith('http'):
                url = 'https://' + url
            return url, ResumeParser.HIGH_CONFIDENCE
        return None, 0.0
    
    @staticmethod
    def _extract_github(text: str) -> Tuple[Optional[str], float]:
        """Extract GitHub URL"""
        github_pattern = r'(?:https?://)?(?:www\.)?github\.com/[\w-]+'
        matches = re.findall(github_pattern, text, re.IGNORECASE)
        
        if matches:
            url = matches[0]
            if not url.startswith('http'):
                url = 'https://' + url
            return url, ResumeParser.HIGH_CONFIDENCE
        return None, 0.0
    
    @staticmethod
    def _extract_portfolio(text: str) -> Tuple[Optional[str], float]:
        """Extract portfolio/website URL (excluding LinkedIn, GitHub)"""
        # General URL pattern
        url_pattern = r'https?://(?:www\.)?[\w\-\.]+\.[\w]{2,}(?:/[\w\-\./?%&=]*)?'
        urls = re.findall(url_pattern, text, re.IGNORECASE)
        
        # Filter out common non-portfolio sites
        excluded_domains = ['linkedin.com', 'github.com', 'gmail.com', 'yahoo.com', 'outlook.com']
        
        for url in urls:
            if not any(domain in url.lower() for domain in excluded_domains):
                return url, ResumeParser.MEDIUM_CONFIDENCE
        
        return None, 0.0
    
    @staticmethod
    def _extract_location(text: str) -> Tuple[Tuple[Optional[str], float], ...]:
        """Extract location components: address, state, county, zipcode"""
        address, address_conf = None, 0.0
        state, state_conf = None, 0.0
        county, county_conf = None, 0.0
        zipcode, zipcode_conf = None, 0.0
        
        # Extract zipcode
        zipcode_pattern = r'\b\d{5}(?:-\d{4})?\b'
        zipcodes = re.findall(zipcode_pattern, text)
        if zipcodes:
            zipcode = zipcodes[0]
            zipcode_conf = ResumeParser.HIGH_CONFIDENCE
        
        # Extract state (full name or abbreviation)
        for state_name in ResumeParser.US_STATES:
            if re.search(r'\b' + state_name + r'\b', text, re.IGNORECASE):
                state = state_name
                state_conf = ResumeParser.HIGH_CONFIDENCE
                break
        
        # Check abbreviations if full name not found
        if not state:
            for abbrev, full_name in ResumeParser.STATE_ABBREV.items():
                if re.search(r'\b' + abbrev + r'\b', text):
                    state = full_name
                    state_conf = ResumeParser.MEDIUM_CONFIDENCE
                    break
        
        # Try to extract full address line (if state found, look for line containing it)
        if state:
            lines = text.split('\n')
            for line in lines:
                if state in line or (state and any(abbrev in line for abbrev, name in ResumeParser.STATE_ABBREV.items() if name == state)):
                    # This line likely contains the address
                    address = line.strip()
                    address_conf = ResumeParser.MEDIUM_CONFIDENCE
                    break
        
        return (address, address_conf), (state, state_conf), (county, county_conf), (zipcode, zipcode_conf)
    
    @staticmethod
    def _extract_summary(text: str) -> Tuple[Optional[str], float]:
        """Extract profile summary or objective section"""
        # Look for common summary section headers
        summary_keywords = [
            'summary', 'profile', 'objective', 'about', 'professional summary',
            'career objective', 'professional profile', 'overview'
        ]
        
        lines = text.split('\n')
        summary_start = -1
        
        # Find summary section
        for i, line in enumerate(lines):
            line_lower = line.lower().strip()
            if any(keyword in line_lower for keyword in summary_keywords):
                # Check if this is a section header (short line, possibly all caps or title case)
                if len(line.strip()) < 50:
                    summary_start = i + 1
                    break
        
        # Extract summary content (next 3-5 lines after header)
        if summary_start > 0 and summary_start < len(lines):
            summary_lines = []
            for i in range(summary_start, min(summary_start + 5, len(lines))):
                line = lines[i].strip()
                # Stop at next section header
                if line.isupper() or (len(line) < 30 and line.endswith(':')):
                    break
                if line:
                    summary_lines.append(line)
            
            if summary_lines:
                summary = ' '.join(summary_lines)
                return summary, ResumeParser.MEDIUM_CONFIDENCE
        
        return None, 0.0
    
    @staticmethod
    def identify_missing_required_fields(parsed_data: Dict[str, Any]) -> list:
        """
        Identify which required fields are missing or have low confidence
        Required fields match CandidateCreate schema
        """
        required_fields = [
            'name', 'email', 'phone', 'residential_address',
            'location_state', 'location_county', 'location_zipcode'
        ]
        
        missing = []
        for field in required_fields:
            value = parsed_data.get(field)
            confidence = parsed_data.get(f'{field}_confidence', 0.0)
            
            # Field is missing if value is None or empty, or confidence is too low
            if not value or confidence < ResumeParser.LOW_CONFIDENCE:
                missing.append(field)
        
        return missing
    
    # ========== JOB PREFERENCES PARSING METHODS ==========
    
    @staticmethod
    def parse_resume_for_job_preferences(text: str) -> Dict[str, Any]:
        """
        Parse resume text and extract job preference fields
        Returns dict with job-related parsed fields and confidence scores
        """
        logger.info("Starting job preferences parsing from resume")
        
        result = {
            'skills': [], 'skills_confidence': 0.0,
            'years_of_experience': None, 'years_of_experience_confidence': 0.0,
            'seniority_level': None, 'seniority_level_confidence': 0.0,
            'job_titles': [], 'job_titles_confidence': 0.0,
            'preferred_job_titles': [], 'preferred_job_titles_confidence': 0.0,
            'highest_education': None, 'highest_education_confidence': 0.0,
            'certifications': [], 'certifications_confidence': 0.0,
            'linkedin_url': None, 'linkedin_url_confidence': 0.0,
            'github_url': None, 'github_url_confidence': 0.0,
            'portfolio_url': None, 'portfolio_url_confidence': 0.0,
        }
        
        # Extract job preference fields
        result['skills'], result['skills_confidence'] = ResumeParser._extract_skills(text)
        result['years_of_experience'], result['years_of_experience_confidence'] = ResumeParser._extract_experience_years(text)
        result['seniority_level'], result['seniority_level_confidence'] = ResumeParser._extract_seniority_level(text)
        result['job_titles'], result['job_titles_confidence'] = ResumeParser._extract_job_titles(text)
        result['preferred_job_titles'], result['preferred_job_titles_confidence'] = ResumeParser._extract_preferred_roles(result['job_titles'])
        result['highest_education'], result['highest_education_confidence'] = ResumeParser._extract_education(text)
        result['certifications'], result['certifications_confidence'] = ResumeParser._extract_certifications(text)
        
        # Also extract URLs (useful for job profiles)
        result['linkedin_url'], result['linkedin_url_confidence'] = ResumeParser._extract_linkedin(text)
        result['github_url'], result['github_url_confidence'] = ResumeParser._extract_github(text)
        result['portfolio_url'], result['portfolio_url_confidence'] = ResumeParser._extract_portfolio(text)
        
        logger.info(f"Job preferences parsing completed. Extracted {sum(1 for k, v in result.items() if k.endswith('_confidence') and v > 0)} fields")
        return result
    
    @staticmethod
    def _extract_skills(text: str) -> Tuple[list, float]:
        """Extract technical skills from resume"""
        # Common technical skills keywords
        common_skills = [
            # Programming languages
            'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin',
            'go', 'rust', 'scala', 'r', 'matlab', 'perl', 'objective-c',
            # Web technologies
            'html', 'css', 'react', 'angular', 'vue', 'node.js', 'django', 'flask', 'express',
            'spring', 'asp.net', 'laravel', 'rails', 'fastapi', 'next.js', 'nuxt.js',
            # Databases
            'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'oracle', 'cassandra', 'dynamodb',
            'sqlite', 'mariadb', 'elasticsearch', 'neo4j',
            # Cloud & DevOps
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform',
            'ansible', 'puppet', 'chef', 'git', 'github', 'gitlab', 'bitbucket',
            # Data & ML
            'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'keras', 'scikit-learn',
            'pandas', 'numpy', 'spark', 'hadoop', 'tableau', 'power bi', 'data analysis',
            # Mobile
            'ios', 'android', 'react native', 'flutter', 'xamarin',
            # Other
            'agile', 'scrum', 'jira', 'rest api', 'graphql', 'microservices', 'testing',
            'unit testing', 'integration testing', 'tdd', 'linux', 'windows', 'macos'
        ]
        
        text_lower = text.lower()
        found_skills = []
        
        # Look for skills section first
        skills_section = ResumeParser._extract_section(text, ['skills', 'technical skills', 'competencies', 'expertise'])
        if skills_section:
            # Extract skills from dedicated section
            for skill in common_skills:
                if skill.lower() in skills_section.lower():
                    # Capitalize properly
                    found_skills.append(skill.title() if ' ' in skill else skill.upper() if len(skill) <= 4 else skill.capitalize())
            
            if found_skills:
                # Remove duplicates and sort
                found_skills = sorted(list(set(found_skills)))
                return found_skills, ResumeParser.HIGH_CONFIDENCE
        
        # Fallback: scan entire resume
        for skill in common_skills:
            if skill.lower() in text_lower:
                found_skills.append(skill.title() if ' ' in skill else skill.upper() if len(skill) <= 4 else skill.capitalize())
        
        if found_skills:
            # Remove duplicates and sort
            found_skills = sorted(list(set(found_skills)))
            return found_skills, ResumeParser.MEDIUM_CONFIDENCE
        
        return [], 0.0
    
    @staticmethod
    def _extract_experience_years(text: str) -> Tuple[Optional[int], float]:
        """Calculate years of experience from work history dates"""
        # Look for patterns like "2018 - 2023", "Jan 2020 - Present", etc.
        date_patterns = [
            r'(\d{4})\s*[-–—]\s*(\d{4}|\bpresent\b|\bcurrent\b)',
            r'(\w+\s+\d{4})\s*[-–—]\s*(\w+\s+\d{4}|\bpresent\b|\bcurrent\b)',
        ]
        
        years = []
        from datetime import datetime
        current_year = datetime.now().year
        
        for pattern in date_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                start = match.group(1)
                end = match.group(2)
                
                # Extract start year
                start_year_match = re.search(r'\d{4}', start)
                if start_year_match:
                    start_year = int(start_year_match.group())
                    
                    # Extract end year
                    if 'present' in end.lower() or 'current' in end.lower():
                        end_year = current_year
                    else:
                        end_year_match = re.search(r'\d{4}', end)
                        if end_year_match:
                            end_year = int(end_year_match.group())
                        else:
                            continue
                    
                    # Add this experience period
                    years.append((start_year, end_year))
        
        if years:
            # Calculate total unique years (handle overlaps)
            all_years = set()
            for start, end in years:
                all_years.update(range(start, end + 1))
            
            total_years = len(all_years)
            
            # Alternative: just use earliest to latest
            earliest = min(y[0] for y in years)
            total_years_simple = current_year - earliest
            
            # Use the more conservative estimate
            experience = min(total_years, total_years_simple)
            
            return experience, ResumeParser.HIGH_CONFIDENCE
        
        # Fallback: look for explicit mentions like "5+ years of experience"
        experience_pattern = r'(\d+)\+?\s*years?\s+(?:of\s+)?experience'
        matches = re.findall(experience_pattern, text, re.IGNORECASE)
        if matches:
            # Use the highest number found
            experience = max(int(m) for m in matches)
            return experience, ResumeParser.MEDIUM_CONFIDENCE
        
        return None, 0.0
    
    @staticmethod
    def _extract_seniority_level(text: str) -> Tuple[Optional[str], float]:
        """Infer seniority level from job titles"""
        import re
        text_lower = text.lower()
        
        # Seniority indicators (ordered by priority) - matches frontend expectations
        seniority_markers = {
            'manager': [r'\bchief\b', r'\bcto\b', r'\bceo\b', r'\bcfo\b', r'\bcoo\b'],  # C-level executives
            'lead': [r'\bvp\b', r'vice president', r'\bdirector\b', r'head of', r'\blead\b'],  # Leadership roles
            'senior': [r'\bsenior\b', r'\bsr\.\b', r'\bprincipal\b', r'\bstaff\b', r'\barchitect\b'],
            'mid': [r'mid-level', r'mid level', r'\bintermediate\b', r'\bspecialist\b', r'engineer ii', r'developer ii'],
            'junior': [r'\bjunior\b', r'\bjr\.\b', r'\bassociate\b', r'\bassistant\b'],
            'entry': [r'\bentry\b', r'entry-level', r'entry level', r'\btrainee\b', r'\bintern\b', r'\bgraduate\b'],
        }
        
        # Count occurrences in work history section
        experience_section = ResumeParser._extract_section(text, ['experience', 'work history', 'employment', 'professional experience'])
        search_text = experience_section if experience_section else text_lower
        
        # Check seniority markers in priority order (C-level > VP/Director > Senior > Mid > Junior > Entry)
        for level, patterns in seniority_markers.items():
            for pattern in patterns:
                if re.search(pattern, search_text):
                    confidence = ResumeParser.HIGH_CONFIDENCE if experience_section else ResumeParser.MEDIUM_CONFIDENCE
                    return level, confidence  # Return first match in priority order
        
        return None, 0.0
    
    @staticmethod
    def _extract_job_titles(text: str) -> Tuple[list, float]:
        """Extract job titles from experience section"""
        # Look for experience section
        experience_section = ResumeParser._extract_section(text, ['experience', 'work history', 'employment', 'professional experience'])
        
        if not experience_section:
            return [], 0.0
        
        # Common job title patterns
        job_title_keywords = [
            'engineer', 'developer', 'programmer', 'analyst', 'scientist', 'architect',
            'manager', 'director', 'lead', 'specialist', 'consultant', 'designer',
            'administrator', 'coordinator', 'associate', 'executive', 'officer',
            'technician', 'researcher', 'instructor', 'teacher', 'professor'
        ]
        
        lines = experience_section.split('\n')
        titles = []
        
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            # Job titles are usually short lines (< 60 chars) and contain job keywords
            if len(line_stripped) < 60 and any(keyword in line_stripped.lower() for keyword in job_title_keywords):
                # Exclude lines that are clearly dates or companies
                if not re.search(r'\d{4}', line_stripped) and not any(word in line_stripped.lower() for word in ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']):
                    titles.append(line_stripped)
        
        if titles:
            # Remove duplicates while preserving order
            seen = set()
            unique_titles = []
            for title in titles:
                if title.lower() not in seen:
                    seen.add(title.lower())
                    unique_titles.append(title)
            
            return unique_titles[:5], ResumeParser.HIGH_CONFIDENCE  # Return top 5
        
        return [], 0.0
    
    @staticmethod
    def _extract_preferred_roles(job_titles: list) -> Tuple[list, float]:
        """Infer preferred roles from past job titles (use most recent/common)"""
        if not job_titles:
            return [], 0.0
        
        # Preferred roles are typically the most recent titles
        # Assume first 2-3 titles are most recent (chronological resume format)
        preferred = job_titles[:3] if len(job_titles) >= 3 else job_titles
        
        return preferred, ResumeParser.MEDIUM_CONFIDENCE
    
    @staticmethod
    def _extract_education(text: str) -> Tuple[Optional[str], float]:
        """Extract highest education level - returns values matching frontend dropdown"""
        education_keywords = {
            'doctorate': ['ph.d', 'phd', 'ph d', 'doctorate', 'doctoral', 'doctor of philosophy'],
            'master': ['master', 'm.s', 'ms', 'm.a', 'ma', 'mba', 'm.eng', 'meng', 'master of'],
            'bachelor': ['bachelor', 'b.s', 'bs', 'b.a', 'ba', 'b.tech', 'b.eng', 'beng', 'bachelor of'],
            'associate': ['associate', 'a.a', 'aa', 'a.s', 'as', 'associate of'],
            'high_school': ['high school', 'secondary', 'secondary school', 'diploma', 'ged', 'hsed'],
        }
        
        # Look for education section
        education_section = ResumeParser._extract_section(text, ['education', 'academic', 'qualifications'])
        search_text = (education_section if education_section else text).lower()
        
        # Check in priority order (highest to lowest)
        for level, keywords in education_keywords.items():
            if any(keyword in search_text for keyword in keywords):
                confidence = ResumeParser.HIGH_CONFIDENCE if education_section else ResumeParser.MEDIUM_CONFIDENCE
                return level, confidence  # Return exact frontend key (lowercase with underscore)
        
        return None, 0.0
    
    @staticmethod
    def _extract_certifications(text: str) -> Tuple[list, float]:
        """Extract certifications from resume"""
        # Look for certifications section
        cert_section = ResumeParser._extract_section(text, ['certifications', 'certificates', 'licenses', 'credentials'])
        
        if not cert_section:
            return [], 0.0
        
        # Common certification patterns
        cert_patterns = [
            r'AWS\s+Certified\s+[\w\s]+',
            r'Microsoft\s+Certified\s+[\w\s]+',
            r'Google\s+[\w\s]+\s+Certified',
            r'PMP',
            r'Certified\s+[\w\s]+',
            r'\b[A-Z]{2,}\s+Certification\b',
        ]
        
        certifications = []
        lines = cert_section.split('\n')
        
        for line in lines:
            line_stripped = line.strip()
            # Certifications are usually in bullet points or short lines
            if 10 < len(line_stripped) < 100:
                # Check if it matches common patterns
                if any(re.search(pattern, line_stripped, re.IGNORECASE) for pattern in cert_patterns):
                    certifications.append(line_stripped)
                # Or contains "certified", "certification", "license"
                elif any(word in line_stripped.lower() for word in ['certified', 'certification', 'certificate', 'license']):
                    certifications.append(line_stripped)
        
        if certifications:
            return certifications[:10], ResumeParser.HIGH_CONFIDENCE  # Return top 10
        
        return [], 0.0
    
    @staticmethod
    def _extract_section(text: str, section_keywords: list) -> Optional[str]:
        """Extract a specific section from resume (helper method)"""
        lines = text.split('\n')
        section_start = -1
        section_end = -1
        
        # Find section start
        for i, line in enumerate(lines):
            line_lower = line.lower().strip()
            # Check if line is a section header
            if any(keyword in line_lower for keyword in section_keywords):
                # Must be short (< 50 chars) and possibly all caps or title case
                if len(line.strip()) < 50:
                    section_start = i + 1
                    break
        
        if section_start < 0:
            return None
        
        # Find section end (next section header or empty lines)
        common_sections = ['experience', 'education', 'skills', 'certifications', 'projects', 'awards', 'publications', 'references']
        for i in range(section_start, len(lines)):
            line = lines[i].strip()
            line_lower = line.lower()
            
            # Check if this is a new section header
            if len(line) < 50 and any(section in line_lower for section in common_sections):
                # Make sure it's not in current section keywords
                if not any(keyword in line_lower for keyword in section_keywords):
                    section_end = i
                    break
        
        # If no end found, take next 20 lines
        if section_end < 0:
            section_end = min(section_start + 20, len(lines))
        
        # Extract section content
        section_lines = lines[section_start:section_end]
        return '\n'.join(section_lines)
