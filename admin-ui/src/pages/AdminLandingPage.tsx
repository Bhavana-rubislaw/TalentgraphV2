import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  IconUsers,
  IconBarChart,
  IconShield,
  IconActivity,
  IconHierarchy,
  IconTarget,
} from '../components/Icons';
import '../styles/Landing.css';

const AdminLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  const primaryCta = () => navigate(user?.role === 'admin' ? '/dashboard' : '/login');

  return (
    <div className="tg-landing">
      <header className="tg-nav">
        <div className="tg-nav-inner">
          <div className="tg-logo" onClick={() => navigate('/')} role="button" tabIndex={0}>
            <span className="tg-logo-mark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
              </svg>
            </span>
            TalentGraph
            <span className="tg-badge tg-badge-blue" style={{ marginLeft: 8 }}>Admin</span>
          </div>

          <nav className={`tg-nav-links ${navOpen ? 'open' : ''}`}>
            <a href="#capabilities" onClick={() => setNavOpen(false)}>Capabilities</a>
            <a href="#oversight" onClick={() => setNavOpen(false)}>Oversight</a>
            {user?.role === 'admin' ? (
              <div className="tg-nav-actions-mobile">
                <button className="tg-btn tg-btn-primary" onClick={primaryCta}>Go to Dashboard</button>
              </div>
            ) : (
              <div className="tg-nav-actions-mobile">
                <button className="tg-btn tg-btn-primary" onClick={primaryCta}>Sign In</button>
              </div>
            )}
          </nav>

          <div className="tg-nav-actions">
            {user?.role === 'admin' ? (
              <button className="tg-btn tg-btn-primary" onClick={primaryCta}>Go to Dashboard</button>
            ) : (
              <>
                <span className="tg-auth-nav-hint">Administrator access only</span>
                <button className="tg-btn tg-btn-primary" onClick={primaryCta}>Sign In</button>
              </>
            )}
          </div>

          <button className="tg-nav-toggle" onClick={() => setNavOpen((v) => !v)} aria-label="Toggle menu">
            <span /><span /><span />
          </button>
        </div>
      </header>

      <section className="tg-hero" style={{ paddingBottom: 64 }}>
        <div className="tg-hero-inner" style={{ gridTemplateColumns: '1fr', textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
          <div className="tg-hero-copy" style={{ margin: '0 auto' }}>
            <span className="tg-pill" style={{ margin: '0 auto 20px' }}>
              <span className="tg-pill-dot" />
              Internal tool · Restricted access
            </span>
            <h1>
              Command center for the <span className="tg-highlight">TalentGraph</span> platform
            </h1>
            <p className="tg-hero-sub" style={{ margin: '0 auto 24px' }}>
              Manage users, companies, job postings, and matching quality across every
              portal — candidate, recruiter, and HR — from a single admin console.
            </p>
            <div className="tg-hero-actions" style={{ justifyContent: 'center' }}>
              <button className="tg-btn tg-btn-primary tg-btn-lg" onClick={primaryCta}>
                {user?.role === 'admin' ? 'Go to Dashboard' : 'Sign In to Admin Portal'}
              </button>
            </div>
            <p className="tg-hero-note">Access is limited to authorized TalentGraph administrators.</p>
          </div>
        </div>
      </section>

      <section id="capabilities" className="tg-roles">
        <div className="tg-section-head">
          <span className="tg-eyebrow">What you can do here</span>
          <h2>Everything the platform team needs</h2>
          <p>Oversight tools for the people, companies, and matching logic behind every TalentGraph portal.</p>
        </div>

        <div className="tg-feature-grid">
          <div className="tg-feature-card">
            <div className="tg-feature-icon tg-icon-blue"><IconUsers size={20} /></div>
            <span className="tg-feature-eyebrow tg-text-blue">USERS</span>
            <h4>Manage every account</h4>
            <p>Search, review, and moderate candidate, recruiter, and HR accounts across the platform.</p>
          </div>

          <div className="tg-feature-card">
            <div className="tg-feature-icon tg-icon-green"><IconTarget size={20} /></div>
            <span className="tg-feature-eyebrow tg-text-green">COMPANIES</span>
            <h4>Companies &amp; job postings</h4>
            <p>Review company profiles and job postings, and keep listings accurate and up to date.</p>
          </div>

          <div className="tg-feature-card">
            <div className="tg-feature-icon tg-icon-purple"><IconHierarchy size={20} /></div>
            <span className="tg-feature-eyebrow tg-text-purple">TAXONOMY</span>
            <h4>Matching &amp; taxonomy</h4>
            <p>Tune the skills taxonomy and matching algorithm that power every recommendation.</p>
          </div>

          <div className="tg-feature-card">
            <div className="tg-feature-icon tg-icon-orange"><IconBarChart size={20} /></div>
            <span className="tg-feature-eyebrow tg-text-orange">ANALYTICS</span>
            <h4>Platform analytics</h4>
            <p>Track engagement, application volume, and match quality across all three portals.</p>
          </div>

          <div className="tg-feature-card">
            <div className="tg-feature-icon tg-icon-cyan"><IconActivity size={20} /></div>
            <span className="tg-feature-eyebrow tg-text-cyan">LOGS</span>
            <h4>System &amp; email logs</h4>
            <p>Audit activity logs and email delivery to troubleshoot issues fast.</p>
          </div>

          <div className="tg-feature-card">
            <div className="tg-feature-icon tg-icon-red"><IconShield size={20} /></div>
            <span className="tg-feature-eyebrow tg-text-red">SECURITY</span>
            <h4>Restricted by design</h4>
            <p>Every session is scoped to the admin role — no candidate or recruiter can reach this console.</p>
          </div>
        </div>
      </section>

      <section id="oversight" className="tg-stats">
        <p className="tg-stats-eyebrow">ONE CONSOLE, THREE PORTALS</p>
        <div className="tg-stats-row">
          <div>
            <strong>Candidate</strong>
            <span className="tg-stats-label">Profiles &amp; applications</span>
            <span className="tg-stats-sub">Job preferences, matches, swipes</span>
          </div>
          <div>
            <strong>Recruiter</strong>
            <span className="tg-stats-label">Postings &amp; pipeline</span>
            <span className="tg-stats-sub">Shortlists, interviews, offers</span>
          </div>
          <div>
            <strong>HR Manager</strong>
            <span className="tg-stats-label">Team oversight</span>
            <span className="tg-stats-sub">Applications, analytics</span>
          </div>
          <div>
            <strong>Admin</strong>
            <span className="tg-stats-label">Platform control</span>
            <span className="tg-stats-sub">Users, taxonomy, algorithm</span>
          </div>
        </div>
      </section>

      <footer className="tg-footer">
        <div className="tg-footer-bottom" style={{ maxWidth: 1200 }}>
          <div className="tg-logo tg-logo-light">
            <span className="tg-logo-mark">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
              </svg>
            </span>
            TalentGraph Admin
          </div>
          <span>© {new Date().getFullYear()} TalentGraph. Internal use only.</span>
        </div>
      </footer>
    </div>
  );
};

export default AdminLandingPage;
