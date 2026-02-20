import React from 'react';

export interface CertOption {
  id: number;
  name: string;
  issuer?: string | null;
  issued_date?: string | null;
  expiry_date?: string | null;
}

interface CertificationsSelectorProps {
  certifications: CertOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

const CertificationsSelector: React.FC<CertificationsSelectorProps> = ({
  certifications, selectedIds, onChange
}) => {
  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(c => c !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (certifications.length === 0) {
    return (
      <div className="cp-cert-sel">
        <div className="cp-cert-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 40, height: 40, opacity: 0.4, marginBottom: 8 }}>
            <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
          </svg>
          <p>No certifications in your profile.</p>
          <a href="/candidate/profile" className="cp-cert-link">Go to Profile to add certifications</a>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-cert-sel">
      {certifications.map(c => (
        <label key={c.id} className={`cp-cert-row ${selectedIds.includes(c.id) ? 'selected' : ''}`}>
          <div className="cp-cert-check">
            <input
              type="checkbox"
              checked={selectedIds.includes(c.id)}
              onChange={() => toggle(c.id)}
            />
            <span className="cp-check-mark" />
          </div>
          <div className="cp-cert-info">
            <div className="cp-cert-name">{c.name}</div>
            {c.issuer && <div className="cp-cert-issuer">{c.issuer}</div>}
          </div>
          {c.issued_date && (
            <div className="cp-cert-date">
              {new Date(c.issued_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
          )}
        </label>
      ))}
      <p className="cp-cert-helper">
        Select certifications relevant to this job preference.
      </p>
    </div>
  );
};

export default CertificationsSelector;
