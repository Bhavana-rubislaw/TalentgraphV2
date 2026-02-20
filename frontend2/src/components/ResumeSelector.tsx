import React from 'react';

export interface ResumeOption {
  id: number;
  filename: string;
  uploaded_at: string;
}

interface ResumeSelectorProps {
  resumes: ResumeOption[];
  primaryResumeId: number | null;
  attachedResumeIds: number[];
  onPrimaryChange: (id: number | null) => void;
  onAttachedChange: (ids: number[]) => void;
}

const ResumeSelector: React.FC<ResumeSelectorProps> = ({
  resumes, primaryResumeId, attachedResumeIds, onPrimaryChange, onAttachedChange
}) => {
  const toggleAttached = (id: number) => {
    if (attachedResumeIds.includes(id)) {
      onAttachedChange(attachedResumeIds.filter(r => r !== id));
    } else {
      onAttachedChange([...attachedResumeIds, id]);
    }
  };

  if (resumes.length === 0) {
    return (
      <div className="cp-resume-sel">
        <div className="cp-resume-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 40, height: 40, opacity: 0.4, marginBottom: 8 }}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          <p>No resumes found in your profile.</p>
          <a href="/candidate/profile" className="cp-resume-link">Go to Profile to upload resumes</a>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-resume-sel">
      <div className="cp-resume-label-row">
        <span className="cp-resume-col-label">Resume</span>
        <span className="cp-resume-col-label center">Primary</span>
        <span className="cp-resume-col-label center">Attach</span>
      </div>
      {resumes.map(r => (
        <div key={r.id} className={`cp-resume-row ${primaryResumeId === r.id ? 'primary' : ''}`}>
          <div className="cp-resume-info">
            <svg className="cp-resume-file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <div>
              <div className="cp-resume-name">{r.filename}</div>
              <div className="cp-resume-date">
                Uploaded {new Date(r.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
          <div className="cp-resume-action center">
            <label className="cp-radio-circle">
              <input
                type="radio"
                name="primary-resume"
                checked={primaryResumeId === r.id}
                onChange={() => onPrimaryChange(r.id)}
              />
              <span className="cp-radio-mark" />
            </label>
          </div>
          <div className="cp-resume-action center">
            <label className="cp-check-circle">
              <input
                type="checkbox"
                checked={attachedResumeIds.includes(r.id)}
                onChange={() => toggleAttached(r.id)}
              />
              <span className="cp-check-mark" />
            </label>
          </div>
        </div>
      ))}
      <p className="cp-resume-helper">
        Select one primary resume (required) and optionally attach additional resumes.
      </p>
    </div>
  );
};

export default ResumeSelector;
