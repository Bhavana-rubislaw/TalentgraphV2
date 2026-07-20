import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import '../styles/Landing.css';

type RoleKey = 'candidates' | 'recruiters' | 'hr' | 'companies';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'For Teams', href: '#roles' },
  { label: 'Pricing', href: '#cta' },
  { label: 'About', href: '#footer' },
];

const TRUSTED_LOGOS = ['Accenture', 'Stripe', 'Notion', 'Figma', 'Vercel', 'Linear'];

const FEATURES = [
  {
    icon: 'brain',
    color: 'blue',
    eyebrow: 'AI MATCH ENGINE',
    title: 'Intelligent candidate scoring across 12+ dimensions',
    body: 'Our AI evaluates skills, experience, location, salary expectations, work preferences, and cultural signals — delivering ranked matches with transparent explanations.',
    stat: '3x',
    statLabel: 'faster shortlisting',
  },
  {
    icon: 'pipeline',
    color: 'purple',
    eyebrow: 'PIPELINE MANAGEMENT',
    title: 'Visual pipeline with drag-and-drop stages',
    body: 'Move candidates through New → Reviewed → Shortlisted → Interview → Offered → Hired with validated stage transitions and team collaboration.',
    stat: '40%',
    statLabel: 'faster time-to-hire',
  },
  {
    icon: 'calendar',
    color: 'green',
    eyebrow: 'INTERVIEW SCHEDULING',
    title: 'Automated scheduling with calendar sync',
    body: 'Schedule interviews with one click, send Google Meet links automatically, and manage day/week/month views with real-time availability.',
    stat: '90%',
    statLabel: 'scheduling time saved',
  },
  {
    icon: 'trend',
    color: 'orange',
    eyebrow: 'ANALYTICS',
    title: 'Hiring funnel analytics',
    body: 'Track conversion rates, time-to-hire, and source performance across every stage of your pipeline.',
    stat: '2x',
    statLabel: 'better offer acceptance',
  },
  {
    icon: 'shield',
    color: 'red',
    eyebrow: 'COMPLIANCE',
    title: 'GDPR-ready and audit-logged',
    body: 'Every action is logged. Data retention policies, consent management, and role-based access controls built in.',
    stat: '100%',
    statLabel: 'audit coverage',
  },
  {
    icon: 'zap',
    color: 'cyan',
    eyebrow: 'INTEGRATIONS',
    title: 'Connect your existing tools',
    body: 'Native integrations with Google Calendar, Slack, major ATS platforms, and a REST API for custom workflows.',
    stat: '50+',
    statLabel: 'integrations',
  },
];

const STATS = [
  { value: '50K+', label: 'Candidates', sub: 'active on the platform' },
  { value: '2,000+', label: 'Companies', sub: 'trust TalentGraph' },
  { value: '98%', label: 'Match Accuracy', sub: 'across AI recommendations' },
  { value: '40%', label: 'Faster Hiring', sub: 'average time-to-hire reduction' },
];

const ROLE_CONTENT: Record<RoleKey, {
  tabLabel: string;
  tabIcon: 'candidate' | 'search' | 'clipboard' | 'building';
  heading: string;
  description: string;
  bullets: string[];
  ctaLabel: string;
  signupParams: string;
  panelTitle: string;
  panelBadge: string;
  panelRows: { name: string; sub: string; score: string }[];
}> = {
  candidates: {
    tabLabel: 'Candidates',
    tabIcon: 'candidate',
    heading: 'Find roles that truly fit you',
    description:
      'Get AI-matched job recommendations based on your skills, experience, and preferences. Track every application in one place and receive real-time status updates.',
    bullets: [
      'AI match scores for every job posting',
      'One-click apply with smart profile autofill',
      'Real-time application status tracking',
      'Interview scheduling and reminders',
    ],
    ctaLabel: 'Find Your Next Role',
    signupParams: '?type=candidate',
    panelTitle: 'Recommended Jobs',
    panelBadge: '12 new',
    panelRows: [
      { name: 'Senior React Engineer', sub: 'Stripe · $160k', score: '96%' },
      { name: 'Frontend Architect', sub: 'Vercel · $145k', score: '91%' },
      { name: 'Staff Engineer', sub: 'Linear · $180k', score: '88%' },
    ],
  },
  recruiters: {
    tabLabel: 'Recruiters',
    tabIcon: 'search',
    heading: 'Source and hire top talent faster',
    description:
      'Get AI-ranked candidate shortlists, manage your pipeline visually, and schedule interviews without ever leaving the platform.',
    bullets: [
      'AI-ranked candidate shortlists across 12+ dimensions',
      'Drag-and-drop pipeline from New to Hired',
      'One-click interview scheduling with calendar sync',
      'Real-time messaging with candidates',
    ],
    ctaLabel: 'Start Sourcing Talent',
    signupParams: '?role=recruiter',
    panelTitle: 'Candidate Pipeline',
    panelBadge: 'AI Sorted',
    panelRows: [
      { name: 'Sarah Chen', sub: 'Senior Engineer', score: '94%' },
      { name: 'Marcus Webb', sub: 'Product Designer', score: '89%' },
      { name: 'Priya Nair', sub: 'Data Scientist', score: '87%' },
    ],
  },
  hr: {
    tabLabel: 'HR Managers',
    tabIcon: 'clipboard',
    heading: 'Oversee hiring across your organization',
    description:
      'Track funnel analytics, manage compliance, and give every recruiter on your team the tools they need — all from one dashboard.',
    bullets: [
      'Hiring funnel analytics and time-to-hire tracking',
      'GDPR-ready, audit-logged compliance tooling',
      'Team management with role-based access',
      'Company-wide job posting oversight',
    ],
    ctaLabel: 'Explore HR Tools',
    signupParams: '?role=hr',
    panelTitle: 'Hiring Funnel',
    panelBadge: 'This month',
    panelRows: [
      { name: 'Time-to-hire', sub: 'Company average', score: '18d' },
      { name: 'Offer acceptance', sub: 'Across all teams', score: '92%' },
      { name: 'Audit coverage', sub: 'All hiring actions', score: '100%' },
    ],
  },
  companies: {
    tabLabel: 'Companies',
    tabIcon: 'building',
    heading: 'Build your employer brand and dream team',
    description:
      'Post jobs, showcase your company culture, and connect with 50K+ active candidates matched to your open roles.',
    bullets: [
      'AI-matched candidate recommendations',
      'Company profile and job posting builder',
      '50+ integrations with your existing tools',
      'Dedicated onboarding support',
    ],
    ctaLabel: 'Set Up Your Company',
    signupParams: '?type=company',
    panelTitle: 'Company Overview',
    panelBadge: 'Live',
    panelRows: [
      { name: 'Open roles', sub: 'Across all teams', score: '14' },
      { name: 'Applicants', sub: 'Last 30 days', score: '312' },
      { name: 'Avg. match score', sub: 'Shortlisted candidates', score: '90%' },
    ],
  },
};

const ICONS: Record<string, React.ReactNode> = {
  brain: (
    <path d="M9.5 2a3.5 3.5 0 0 0-3.5 3.5v.11A3 3 0 0 0 4 8.5a3 3 0 0 0 .34 5.53A3.5 3.5 0 0 0 8 18.4V20a2 2 0 0 0 4 0v-2.1M14.5 2A3.5 3.5 0 0 1 18 5.5v.11A3 3 0 0 1 20 8.5a3 3 0 0 1-.34 5.53A3.5 3.5 0 0 1 16 18.4V20a2 2 0 0 1-4 0" />
  ),
  pipeline: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="12" r="2.5" />
      <path d="M8.2 7.2 15.8 10.8M8.2 16.8 15.8 13.2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18M9 15l2 2 4-4" />
    </>
  ),
  trend: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  shield: <path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3zM9 12l2 2 4-4" />,
  zap: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />,
  candidate: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 2h6v4H9zM9 11l2 2 4-4" />
    </>
  ),
  building: (
    <>
      <path d="M3 21V9l9-6 9 6v12" />
      <path d="M9 21V12h6v9" />
    </>
  ),
};

const Icon: React.FC<{ name: string; size?: number }> = ({ name, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {ICONS[name]}
  </svg>
);

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState<RoleKey>('candidates');
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoError, setDemoError] = useState('');
  const role = ROLE_CONTENT[activeRole];

  const scrollTo = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDemoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDemoError('');
    const form = new FormData(e.currentTarget);
    const fullName = String(form.get('fullName') || '').trim();
    const workEmail = String(form.get('workEmail') || '').trim();
    const company = String(form.get('company') || '').trim();
    const selectedRole = String(form.get('role') || '');

    setDemoSubmitting(true);
    try {
      await apiClient.requestDemo(fullName, workEmail, company, selectedRole);
      setDemoSubmitted(true);
    } catch (err: any) {
      setDemoError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setDemoSubmitting(false);
    }
  };

  return (
    <div className="tg-landing">
      {/* Navbar */}
      <header className="tg-nav">
        <div className="tg-nav-inner">
          <div className="tg-logo">
            <span className="tg-logo-mark">
              <Icon name="zap" size={16} />
            </span>
            TalentGraph
          </div>

          <nav className={`tg-nav-links ${menuOpen ? 'open' : ''}`}>
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} onClick={(e) => { e.preventDefault(); scrollTo(link.href); }}>
                {link.label}
              </a>
            ))}
            <div className="tg-nav-actions-mobile">
              <button className="tg-btn tg-btn-ghost" onClick={() => navigate('/signin')}>Sign in</button>
              <button className="tg-btn tg-btn-primary" onClick={() => navigate('/signup')}>Get Started Free</button>
            </div>
          </nav>

          <div className="tg-nav-actions">
            <button className="tg-btn tg-btn-ghost" onClick={() => navigate('/signin')}>Sign in</button>
            <button className="tg-btn tg-btn-primary" onClick={() => navigate('/signup')}>Get Started Free</button>
          </div>

          <button className="tg-nav-toggle" aria-label="Toggle menu" onClick={() => setMenuOpen((v) => !v)}>
            <span /><span /><span />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="tg-hero" id="home">
        <div className="tg-hero-inner">
          <div className="tg-hero-copy">
            <span className="tg-pill">
              <span className="tg-pill-dot" /> AI-Powered Recruitment Platform
            </span>
            <h1>
              Hire Smarter with <span className="tg-highlight">AI-Powered</span> Talent Matching
            </h1>
            <p className="tg-hero-sub">
              TalentGraph connects candidates, recruiters, and HR teams through intelligent match
              scoring — cutting time-to-hire by 40% and surfacing the right talent, every time.
            </p>
            <ul className="tg-checklist">
              <li><Icon name="trend" size={16} />AI match scores across 12+ compatibility dimensions</li>
              <li><Icon name="trend" size={16} />Unified platform for candidates, recruiters, and HR</li>
              <li><Icon name="trend" size={16} />Real-time pipeline with drag-and-drop stage management</li>
            </ul>
            <div className="tg-hero-actions">
              <button className="tg-btn tg-btn-primary tg-btn-lg" onClick={() => navigate('/signup')}>
                Get Started Free →
              </button>
              <button className="tg-btn tg-btn-outline tg-btn-lg" onClick={() => scrollTo('#features')}>
                See How It Works
              </button>
            </div>
            <p className="tg-hero-note">No credit card required · Free 14-day trial · Cancel anytime</p>
          </div>

          <div className="tg-hero-mock">
            <div className="tg-browser">
              <div className="tg-browser-bar">
                <span className="tg-dot red" /><span className="tg-dot yellow" /><span className="tg-dot green" />
                <span className="tg-browser-url">app.talentgraph.io/recruiter/pipeline</span>
              </div>
              <div className="tg-browser-body">
                <div className="tg-mock-header">
                  <div>
                    <p className="tg-mock-title">Candidate Pipeline</p>
                    <p className="tg-mock-sub">Senior Frontend Engineer · 63 applicants</p>
                  </div>
                  <span className="tg-badge tg-badge-blue">AI Sorted</span>
                </div>
                <div className="tg-mock-stats">
                  <div><strong>24</strong><span>New</span></div>
                  <div><strong>18</strong><span>Reviewed</span></div>
                  <div><strong>11</strong><span>Shortlisted</span></div>
                  <div><strong>7</strong><span>Interview</span></div>
                  <div><strong>3</strong><span>Offered</span></div>
                </div>
                {[
                  { i: 'SC', n: 'Sarah Chen', r: 'Senior Engineer', s: '94%' },
                  { i: 'MW', n: 'Marcus Webb', r: 'Product Designer', s: '89%' },
                  { i: 'PN', n: 'Priya Nair', r: 'Data Scientist', s: '87%' },
                ].map((c) => (
                  <div className="tg-mock-row" key={c.n}>
                    <span className="tg-avatar">{c.i}</span>
                    <div className="tg-mock-row-info">
                      <strong>{c.n}</strong>
                      <span>{c.r}</span>
                    </div>
                    <span className="tg-score">{c.s}</span>
                  </div>
                ))}
                <div className="tg-mock-footer">
                  <Icon name="brain" size={14} /> AI matched 3 top candidates based on 12 criteria
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="tg-trusted">
        <p>TRUSTED BY HIRING TEAMS AT</p>
        <div className="tg-trusted-row">
          {TRUSTED_LOGOS.map((name) => <span key={name}>{name}</span>)}
        </div>
      </section>

      {/* Role tabs */}
      <section className="tg-roles" id="roles">
        <div className="tg-section-head">
          <span className="tg-eyebrow">Built for every stakeholder</span>
          <h2>One platform, every role</h2>
          <p>TalentGraph adapts to how each team member works — giving everyone exactly the tools they need.</p>
        </div>

        <div className="tg-tabs">
          {(Object.keys(ROLE_CONTENT) as RoleKey[]).map((key) => (
            <button
              key={key}
              className={`tg-tab ${activeRole === key ? 'active' : ''}`}
              onClick={() => setActiveRole(key)}
            >
              <Icon name={ROLE_CONTENT[key].tabIcon} size={16} />
              {ROLE_CONTENT[key].tabLabel}
            </button>
          ))}
        </div>

        <div className="tg-role-panel">
          <div className="tg-role-copy">
            <h3>{role.heading}</h3>
            <p>{role.description}</p>
            <ul className="tg-checklist tg-checklist-dot">
              {role.bullets.map((b) => <li key={b}>{b}</li>)}
            </ul>
            <button className="tg-btn tg-btn-primary" onClick={() => navigate(`/signup${role.signupParams}`)}>
              {role.ctaLabel} →
            </button>
          </div>

          <div className="tg-role-card">
            <div className="tg-role-card-head">
              <strong>{role.panelTitle}</strong>
              <span className="tg-badge tg-badge-blue">{role.panelBadge}</span>
            </div>
            {role.panelRows.map((r) => (
              <div className="tg-role-card-row" key={r.name}>
                <div>
                  <strong>{r.name}</strong>
                  <span>{r.sub}</span>
                </div>
                <span className="tg-score">{r.score}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="tg-features" id="features">
        <div className="tg-section-head">
          <span className="tg-eyebrow">Platform capabilities</span>
          <h2>Everything you need to hire at scale</h2>
          <p>From AI-powered matching to compliance tooling — TalentGraph covers the full hiring lifecycle.</p>
        </div>

        <div className="tg-feature-grid">
          {FEATURES.map((f) => (
            <div className="tg-feature-card" key={f.title}>
              <div className={`tg-feature-icon tg-icon-${f.color}`}>
                <Icon name={f.icon} size={20} />
              </div>
              <span className={`tg-feature-eyebrow tg-text-${f.color}`}>{f.eyebrow}</span>
              <h4>{f.title}</h4>
              <p>{f.body}</p>
              <div className="tg-feature-stat">
                <strong className={`tg-text-${f.color}`}>{f.stat}</strong>
                <span>{f.statLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="tg-stats">
        <p className="tg-stats-eyebrow">PLATFORM AT A GLANCE</p>
        <div className="tg-stats-row">
          {STATS.map((s) => (
            <div key={s.label}>
              <strong>{s.value}</strong>
              <span className="tg-stats-label">{s.label}</span>
              <span className="tg-stats-sub">{s.sub}</span>
            </div>
          ))}
        </div>
        <div className="tg-stats-footer">
          <span>Powering recruitment at companies from seed-stage startups to Fortune 500 enterprises.</span>
        </div>
      </section>

      {/* CTA / Demo */}
      <section className="tg-cta" id="cta">
        <div className="tg-cta-inner">
          <div className="tg-cta-copy">
            <span className="tg-eyebrow tg-eyebrow-light">Get started today</span>
            <h2>Ready to transform your hiring?</h2>
            <p>Join thousands of companies using TalentGraph to find the right talent faster. Start your free trial — no credit card required.</p>
            <ul className="tg-checklist tg-checklist-dark">
              <li><Icon name="trend" size={16} />14-day free trial, no credit card required</li>
              <li><Icon name="trend" size={16} />Full access to all features from day one</li>
              <li><Icon name="trend" size={16} />Dedicated onboarding support</li>
              <li><Icon name="trend" size={16} />Cancel anytime, no lock-in</li>
            </ul>
          </div>

          <div className="tg-demo-card">
            <h3>Request a Demo</h3>
            <p>See TalentGraph in action with a personalized walkthrough for your team.</p>
            {demoSubmitted ? (
              <div className="tg-demo-success">
                Thanks! We've sent a confirmation to your email, and our team will be in touch within one business day.
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit}>
                <label>Full name</label>
                <input name="fullName" type="text" placeholder="Alex Johnson" required />
                <label>Work email</label>
                <input name="workEmail" type="email" placeholder="alex@company.com" required />
                <label>Company</label>
                <input name="company" type="text" placeholder="Acme Corp" required />
                <label>Your role</label>
                <select name="role" required defaultValue="">
                  <option value="" disabled>Select your role</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="hr">HR Manager</option>
                  <option value="admin">Company / Admin</option>
                </select>
                {demoError && <div className="tg-demo-error">{demoError}</div>}
                <button type="submit" className="tg-btn tg-btn-primary tg-btn-block" disabled={demoSubmitting}>
                  {demoSubmitting ? 'Sending…' : 'Request Demo →'}
                </button>
                <p className="tg-demo-legal">By submitting, you agree to our Privacy Policy and Terms of Service.</p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="tg-footer" id="footer">
        <div className="tg-footer-inner">
          <div className="tg-footer-brand">
            <div className="tg-logo tg-logo-light">
              <span className="tg-logo-mark"><Icon name="zap" size={16} /></span>
              TalentGraph
            </div>
            <p>AI-powered recruitment and talent-matching platform for modern hiring teams.</p>
          </div>

          <div className="tg-footer-col">
            <h5>Product</h5>
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('#features'); }}>Features</a>
            <a href="#cta" onClick={(e) => { e.preventDefault(); scrollTo('#cta'); }}>Pricing</a>
            <a href="#">Changelog</a>
            <a href="#">Roadmap</a>
            <a href="#">API Docs</a>
          </div>

          <div className="tg-footer-col">
            <h5>For Teams</h5>
            {(Object.keys(ROLE_CONTENT) as RoleKey[]).map((key) => (
              <a
                key={key}
                href="#roles"
                onClick={(e) => { e.preventDefault(); setActiveRole(key); scrollTo('#roles'); }}
              >
                {ROLE_CONTENT[key].tabLabel}
              </a>
            ))}
          </div>

          <div className="tg-footer-col">
            <h5>Company</h5>
            <a href="#">About</a>
            <a href="#">Blog</a>
            <a href="#">Careers</a>
            <a href="#">Press</a>
            <a href="#">Contact</a>
          </div>

          <div className="tg-footer-col">
            <h5>Legal</h5>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
            <a href="#">GDPR</a>
            <a href="#">Security</a>
          </div>
        </div>

        <div className="tg-footer-bottom">
          <span>© {new Date().getFullYear()} TalentGraph, Inc. All rights reserved.</span>
          <div className="tg-footer-social">
            <a href="#">Twitter</a>
            <a href="#">LinkedIn</a>
            <a href="#">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
