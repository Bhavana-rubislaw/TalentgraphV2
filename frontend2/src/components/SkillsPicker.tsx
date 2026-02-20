import React, { useState, useRef, useEffect } from 'react';

export interface SelectedSkill {
  skill_name: string;
  skill_category: string;
  proficiency_level: number;
}

interface SkillsPickerProps {
  catalog: string[];
  category: 'technical' | 'soft';
  selected: SelectedSkill[];
  onChange: (skills: SelectedSkill[]) => void;
  label?: string;
  maxSkills?: number;
}

const RATING_LABELS = ['Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];

const SkillsPicker: React.FC<SkillsPickerProps> = ({
  catalog, category, selected, onChange, label, maxSkills = 20
}) => {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedNames = new Set(selected.map(s => s.skill_name));
  const filtered = catalog.filter(s =>
    !selectedNames.has(s) && s.toLowerCase().includes(query.toLowerCase())
  );

  const addSkill = (name: string) => {
    if (selected.length >= maxSkills) return;
    onChange([...selected, { skill_name: name, skill_category: category, proficiency_level: 3 }]);
    setQuery('');
    setShowDropdown(false);
  };

  const removeSkill = (index: number) => {
    onChange(selected.filter((_, i) => i !== index));
  };

  const updateRating = (index: number, level: number) => {
    const next = [...selected];
    next[index] = { ...next[index], proficiency_level: level };
    onChange(next);
  };

  return (
    <div className="cp-skills-picker" ref={wrapperRef}>
      {label && <label className="cp-sp-label">{label}</label>}

      {/* Search input */}
      <div className="cp-sp-search-wrap">
        <svg className="cp-sp-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          className="cp-sp-search"
          placeholder={`Search ${category} skills...`}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          disabled={selected.length >= maxSkills}
        />
        {selected.length >= maxSkills && (
          <span className="cp-sp-limit">Max reached</span>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && filtered.length > 0 && (
        <div className="cp-sp-dropdown">
          {filtered.slice(0, 12).map(name => (
            <button key={name} type="button" className="cp-sp-dropdown-item" onClick={() => addSkill(name)}>
              <span>{name}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          ))}
          {filtered.length > 12 && (
            <div className="cp-sp-more">+{filtered.length - 12} more — type to narrow</div>
          )}
        </div>
      )}

      {/* Selected list with ratings */}
      {selected.length > 0 && (
        <div className="cp-sp-list">
          {selected.map((skill, i) => (
            <div key={skill.skill_name} className="cp-sp-row">
              <span className="cp-sp-name">{skill.skill_name}</span>
              <div className="cp-sp-rating">
                {[1,2,3,4,5].map(level => (
                  <button
                    key={level}
                    type="button"
                    className={`cp-sp-dot ${level <= skill.proficiency_level ? 'active' : ''}`}
                    onClick={() => updateRating(i, level)}
                    title={RATING_LABELS[level - 1]}
                  />
                ))}
                <span className="cp-sp-rating-label">{RATING_LABELS[skill.proficiency_level - 1]}</span>
              </div>
              <button type="button" className="cp-sp-remove" onClick={() => removeSkill(i)} title="Remove">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {selected.length === 0 && (
        <p className="cp-sp-empty">No {category} skills selected. Search above to add.</p>
      )}
    </div>
  );
};

export default SkillsPicker;
