import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Landing.css';

const LandingPage: React.FC = () => {
  console.log('[COMPONENT MOUNT] LandingPage loaded');
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Background gradient overlay */}
      <div className="landing-bg"></div>

      {/* Main hero section */}
      <div className="landing-hero">
        {/* Brand header */}
        <header className="landing-header">
          <h1 className="brand-name">TalentGraph</h1>
          <p className="brand-subtitle">Enterprise Hiring Dating App</p>
        </header>

        {/* Dual card layout - Candidates and Companies */}
        <div className="landing-cards">
          {/* Candidate Card */}
          <div className="option-card">
            <div className="card-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <h2 className="card-headline">Looking for Opportunities?</h2>
            
            <p className="card-description">
              Build your profile, upload your resume, and match with amazing companies.
            </p>

            <button 
              className="btn-cta btn-candidate"
              onClick={() => { 
                console.log('[NAVIGATION] Candidate Signup'); 
                navigate('/signup?type=candidate'); 
              }}
            >
              Sign Up as Candidate
            </button>

            <a 
              href="/signin?type=candidate" 
              className="signin-link"
              onClick={(e) => {
                e.preventDefault();
                console.log('[NAVIGATION] Candidate SignIn');
                navigate('/signin?type=candidate');
              }}
            >
              Already have an account? <span>Sign in</span>
            </a>
          </div>

          {/* Company Card */}
          <div className="option-card">
            <div className="card-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <h2 className="card-headline">Hiring Top Talent?</h2>
            
            <p className="card-description">
              Create job posts, swipe through candidates, and build your dream team.
            </p>

            <button 
              className="btn-cta btn-company"
              onClick={() => { 
                console.log('[NAVIGATION] Company Signup'); 
                navigate('/signup?type=company'); 
              }}
            >
              Sign Up as Company
            </button>

            <a 
              href="/signin?type=company" 
              className="signin-link"
              onClick={(e) => {
                e.preventDefault();
                console.log('[NAVIGATION] Company SignIn');
                navigate('/signin?type=company');
              }}
            >
              Already have an account? <span>Sign in</span>
            </a>
          </div>
        </div>

        {/* Footer tagline */}
        <footer className="landing-footer">
          <p>Enterprise recruitment made simple</p>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
