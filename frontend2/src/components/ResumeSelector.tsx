import React from 'react';

export interface ResumeOption {
  id: number;
  filename: string;
  uploaded_at: string;
}

interface ResumeSelectorProps {
  resumes: ResumeOption[];
  /** ID of the single resume to attach to this job preference (max 1). */
  primaryResumeId: number | null;
  onPrimaryChange: (id: number | null) => void;
}

const ResumeSelector: React.FC<ResumeSelectorProps> = ({
  resumes, primaryResumeId, onPrimaryChange
}) => {
  if (resumes.length === 0) {
    return (
      <div className="cp-resume-dropdown-wrap">
        <div className="cp-resume-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36, opacity: 0.4, marginBottom: 8 }}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          <p>No resumes found in your profile.</p>
          <a href="/candidate/profile" className="cp-resume-link">Go to Profile to upload resumes →</a>
        </div>
      </div>
    );
  }

  const selected = resumes.find(r => r.id === primaryResumeId) ?? null;

  return (
    <div className="cp-resume-dropdown-wrap">
      <div className="cp-resume-dropdown-field">
        <svg className="cp-resume-dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <select
          className="cp-resume-select"
          value={primaryResumeId ?? ''}
          onChange={e => {
            const val = e.target.value;
            onPrimaryChange(val === '' ? null : Number(val));
          }}
        >
          <option value="">— Select a resume —</option>
          {resumes.map(r => (
            <option key={r.id} value={r.id}>
              {r.filename}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="cp-resume-selected-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>
            <strong>{selected.filename}</strong>
            &nbsp;·&nbsp;Uploaded {new Date(selected.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      )}

      <p className="cp-resume-helper">
        Choose one resume from your profile to attach to this job preference.
        <a href="/candidate/profile" className="cp-resume-manage-link"> Manage resumes in Profile →</a>
      </p>
    </div>
  );
};

export default ResumeSelector;
