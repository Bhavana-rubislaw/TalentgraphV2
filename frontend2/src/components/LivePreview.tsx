import React from 'react';
import type { SelectedSkill } from './SkillsPicker';
import type { ResumeOption } from './ResumeSelector';
import type { CertOption } from './CertificationsSelector';

interface LocationPref { city: string; state: string; country?: string; }

interface PreviewProps {
  formData: any;
  technicalSkills: SelectedSkill[];
  softSkills: SelectedSkill[];
  resumes: ResumeOption[];
  certifications: CertOption[];
  selectedCertIds: number[];
  primaryResumeId: number | null;
  attachedResumeIds: number[];
}

const LABELS: Record<string, Record<string, string>> = {
  worktype: { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' },
  employment_type: { ft: 'Full-Time', pt: 'Part-Time', contract: 'Contract', c2c: 'C2C', w2: 'W2' },
  seniority_level: { entry: 'Entry', junior: 'Junior', mid: 'Mid-Level', senior: 'Senior', lead: 'Lead', manager: 'Manager' },
  visa_status: { us_citizen: 'US Citizen', us_green_card: 'Green Card', us_visa: 'US Visa', eu_citizen: 'EU Citizen', uk_citizen: 'UK Citizen', work_visa: 'Work Visa' },
  pay_type: { hourly: 'Hourly', annually: 'Annually' },
  negotiability: { fixed: 'Fixed', negotiable: 'Negotiable', depends: 'Depends on role' },
  travel_willingness: { none: 'None', occasional: 'Occasional', frequent: 'Frequent' },
  shift_preference: { day: 'Day', night: 'Night', flexible: 'Flexible' },
  remote_acceptance: { fully_remote: 'Fully Remote', remote_country: 'Remote within Country', remote_anywhere: 'Remote Anywhere' },
  relocation_willingness: { yes: 'Yes', no: 'No', depends: 'Depends on Offer' },
  security_clearance: { none: 'None', eligible: 'Eligible', active: 'Active' },
  highest_education: { high_school: 'High School', associate: 'Associate', bachelor: "Bachelor's", master: "Master's", doctorate: 'Doctorate' },
  notice_period: { immediate: 'Immediate', '2weeks': '2 Weeks', '1month': '1 Month', '2months': '2 Months', '3months': '3 Months' },
};

const lbl = (group: string, val: string | undefined | null) => {
  if (!val) return null;
  return LABELS[group]?.[val] || val;
};

const fmtSalary = (min: number, max: number, currency: string) => {
  const c = (currency || 'usd').toUpperCase();
  const f = (v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : v.toLocaleString();
  if (!min && !max) return null;
  return `${c} ${f(min)} – ${f(max)}`;
};

const RATING_LABELS = ['Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];

const LivePreview: React.FC<PreviewProps> = ({
  formData, technicalSkills, softSkills, resumes, certifications, selectedCertIds, primaryResumeId, attachedResumeIds
}) => {
  const titles = (() => {
    try { return JSON.parse(formData.preferred_job_titles || '[]'); } catch { return []; }
  })();
  const categories = (() => {
    try { return JSON.parse(formData.job_category || '[]'); } catch { return []; }
  })();
  const strengths = (() => {
    try { return JSON.parse(formData.core_strengths || '[]'); } catch { return []; }
  })();
  const locations: LocationPref[] = formData.location_preferences || [];

  const primaryResume = resumes.find(r => r.id === primaryResumeId);
  const attachedResumes = resumes.filter(r => attachedResumeIds.includes(r.id));
  const selectedCerts = certifications.filter(c => selectedCertIds.includes(c.id));

  const isEmpty = !formData.profile_name && titles.length === 0 && technicalSkills.length === 0;

  return (
    <div className="cp-preview">
      <div className="cp-preview-title-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
        <span>Live Preview</span>
      </div>

      {isEmpty ? (
        <div className="cp-preview-empty">
          <p>Start filling out the form to see a live preview of your job preference card.</p>
        </div>
      ) : (
        <div className="cp-preview-card">
          {/* Header */}
          <div className="cp-pv-header">
            <h3 className="cp-pv-name">{formData.profile_name || 'Untitled Preference'}</h3>
            <p className="cp-pv-sub">
              {formData.product_vendor}{formData.product_type ? ` · ${formData.product_type}` : ''}
            </p>
          </div>

          {/* Roles & Seniority */}
          {(formData.job_role || lbl('seniority_level', formData.seniority_level) || titles.length > 0) && (
            <div className="cp-pv-section">
              <div className="cp-pv-label">Role & Domain</div>
              {formData.job_role && <div className="cp-pv-value">{formData.job_role}</div>}
              {lbl('seniority_level', formData.seniority_level) && (
                <span className="cp-pv-chip accent">{lbl('seniority_level', formData.seniority_level)}</span>
              )}
              {titles.length > 0 && (
                <div className="cp-pv-chips" style={{ marginTop: 4 }}>
                  {titles.map((t: string, i: number) => <span key={i} className="cp-pv-chip">{t}</span>)}
                </div>
              )}
              {categories.length > 0 && (
                <div className="cp-pv-chips" style={{ marginTop: 4 }}>
                  {categories.map((c: string, i: number) => <span key={i} className="cp-pv-chip outline">{c}</span>)}
                </div>
              )}
            </div>
          )}

          {/* Work Style */}
          {(formData.worktype || formData.employment_type) && (
            <div className="cp-pv-section">
              <div className="cp-pv-label">Work Style</div>
              <div className="cp-pv-chips">
                {lbl('worktype', formData.worktype) && <span className="cp-pv-chip accent">{lbl('worktype', formData.worktype)}</span>}
                {lbl('employment_type', formData.employment_type) && <span className="cp-pv-chip">{lbl('employment_type', formData.employment_type)}</span>}
                {lbl('shift_preference', formData.shift_preference) && <span className="cp-pv-chip outline">{lbl('shift_preference', formData.shift_preference)}</span>}
                {lbl('travel_willingness', formData.travel_willingness) && <span className="cp-pv-chip outline">Travel: {lbl('travel_willingness', formData.travel_willingness)}</span>}
              </div>
            </div>
          )}

          {/* Location */}
          {(locations.length > 0 || formData.remote_acceptance || formData.relocation_willingness) && (
            <div className="cp-pv-section">
              <div className="cp-pv-label">Location</div>
              {locations.length > 0 && (
                <div className="cp-pv-chips">
                  {locations.map((l, i) => <span key={i} className="cp-pv-chip green">{l.city}, {l.state}</span>)}
                </div>
              )}
              <div className="cp-pv-meta-row">
                {lbl('remote_acceptance', formData.remote_acceptance) && <span>{lbl('remote_acceptance', formData.remote_acceptance)}</span>}
                {lbl('relocation_willingness', formData.relocation_willingness) && <span>Relocation: {lbl('relocation_willingness', formData.relocation_willingness)}</span>}
              </div>
            </div>
          )}

          {/* Compensation */}
          {(formData.salary_min > 0 || formData.salary_max > 0) && (
            <div className="cp-pv-section">
              <div className="cp-pv-label">Compensation</div>
              <div className="cp-pv-value salary">{fmtSalary(formData.salary_min, formData.salary_max, formData.salary_currency)}</div>
              <div className="cp-pv-meta-row">
                {lbl('pay_type', formData.pay_type) && <span>{lbl('pay_type', formData.pay_type)}</span>}
                {lbl('negotiability', formData.negotiability) && <span>{lbl('negotiability', formData.negotiability)}</span>}
              </div>
            </div>
          )}

          {/* Skills */}
          {(technicalSkills.length > 0 || softSkills.length > 0) && (
            <div className="cp-pv-section">
              <div className="cp-pv-label">Skills</div>
              {technicalSkills.length > 0 && (
                <>
                  <div className="cp-pv-sublabel">Technical ({technicalSkills.length})</div>
                  <div className="cp-pv-skill-list">
                    {technicalSkills.slice(0, 6).map((s, i) => (
                      <div key={i} className="cp-pv-skill-item">
                        <span>{s.skill_name}</span>
                        <span className="cp-pv-dots">
                          {[1,2,3,4,5].map(l => <span key={l} className={`dot ${l <= s.proficiency_level ? 'on' : ''}`} />)}
                        </span>
                      </div>
                    ))}
                    {technicalSkills.length > 6 && <div className="cp-pv-more">+{technicalSkills.length - 6} more</div>}
                  </div>
                </>
              )}
              {softSkills.length > 0 && (
                <>
                  <div className="cp-pv-sublabel" style={{ marginTop: 8 }}>Soft Skills ({softSkills.length})</div>
                  <div className="cp-pv-chips">
                    {softSkills.map((s, i) => <span key={i} className="cp-pv-chip">{s.skill_name}</span>)}
                  </div>
                </>
              )}
              {strengths.length > 0 && (
                <>
                  <div className="cp-pv-sublabel" style={{ marginTop: 8 }}>Core Strengths</div>
                  <div className="cp-pv-chips">
                    {strengths.map((s: string, i: number) => <span key={i} className="cp-pv-chip accent">{s}</span>)}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Experience */}
          {(formData.years_of_experience > 0 || formData.availability_date || formData.notice_period) && (
            <div className="cp-pv-section">
              <div className="cp-pv-label">Experience & Availability</div>
              <div className="cp-pv-meta-row">
                {formData.years_of_experience > 0 && <span>{formData.years_of_experience} yrs total</span>}
                {formData.relevant_experience && <span>{formData.relevant_experience} yrs relevant</span>}
                {lbl('notice_period', formData.notice_period) && <span>Notice: {lbl('notice_period', formData.notice_period)}</span>}
              </div>
              {formData.start_date_preference && <div className="cp-pv-value" style={{ fontSize: 13 }}>Start: {formData.start_date_preference}</div>}
            </div>
          )}

          {/* Authorization */}
          {(formData.visa_status || formData.security_clearance) && (
            <div className="cp-pv-section">
              <div className="cp-pv-label">Authorization</div>
              <div className="cp-pv-chips">
                {lbl('visa_status', formData.visa_status) && <span className="cp-pv-chip">{lbl('visa_status', formData.visa_status)}</span>}
                {lbl('security_clearance', formData.security_clearance) && formData.security_clearance !== 'none' && <span className="cp-pv-chip accent">Clearance: {lbl('security_clearance', formData.security_clearance)}</span>}
              </div>
            </div>
          )}

          {/* Education & Certs */}
          {(formData.highest_education || selectedCerts.length > 0) && (
            <div className="cp-pv-section">
              <div className="cp-pv-label">Education & Credentials</div>
              {lbl('highest_education', formData.highest_education) && (
                <div className="cp-pv-value">{lbl('highest_education', formData.highest_education)}</div>
              )}
              {selectedCerts.length > 0 && (
                <div className="cp-pv-chips" style={{ marginTop: 4 }}>
                  {selectedCerts.map(c => <span key={c.id} className="cp-pv-chip outline">{c.name}</span>)}
                </div>
              )}
            </div>
          )}

          {/* Resume */}
          {primaryResume && (
            <div className="cp-pv-section">
              <div className="cp-pv-label">Resume</div>
              <div className="cp-pv-value">{primaryResume.filename} <span className="cp-pv-badge">Primary</span></div>
              {attachedResumes.length > 0 && (
                <div className="cp-pv-meta-row" style={{ marginTop: 4 }}>
                  {attachedResumes.map(r => <span key={r.id}>{r.filename}</span>)}
                </div>
              )}
            </div>
          )}

          {/* Social Links */}
          {(formData.linkedin_url || formData.github_url || formData.portfolio_url || formData.twitter_url || formData.website_url) && (
            <div className="cp-pv-section">
              <div className="cp-pv-label">Social & Web Links</div>
              <div className="cp-pv-socials">
                {formData.linkedin_url && (
                  <a href={formData.linkedin_url} target="_blank" rel="noopener noreferrer" className="cp-pv-social-link linkedin" title="LinkedIn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                    <span>LinkedIn</span>
                  </a>
                )}
                {formData.github_url && (
                  <a href={formData.github_url} target="_blank" rel="noopener noreferrer" className="cp-pv-social-link github" title="GitHub">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>
                    <span>GitHub</span>
                  </a>
                )}
                {formData.portfolio_url && (
                  <a href={formData.portfolio_url} target="_blank" rel="noopener noreferrer" className="cp-pv-social-link portfolio" title="Portfolio">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                    <span>Portfolio</span>
                  </a>
                )}
                {formData.twitter_url && (
                  <a href={formData.twitter_url} target="_blank" rel="noopener noreferrer" className="cp-pv-social-link twitter" title="Twitter / X">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                    <span>Twitter</span>
                  </a>
                )}
                {formData.website_url && (
                  <a href={formData.website_url} target="_blank" rel="noopener noreferrer" className="cp-pv-social-link website" title="Website">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                    <span>Website</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LivePreview;
