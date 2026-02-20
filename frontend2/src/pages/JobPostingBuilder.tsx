import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import '../styles/JobPostingBuilder.css';

// ============ TYPES ============
interface PostingSkill {
  id?: number;
  skill_name: string;
  skill_category: 'technical' | 'soft';
  rating: number;
}

interface JobPostingFormData {
  job_title: string;
  product_vendor: string;
  product_type: string;
  job_role: string;
  seniority_level: string;
  worktype: string;
  location: string;
  employment_type: string;
  start_date: string;
  end_date: string;
  salary_min: string;
  salary_max: string;
  salary_currency: string;
  pay_type: string;
  job_description: string;
  job_category: string;
  travel_requirements: string;
  visa_info: string;
  education_qualifications: string;
  certifications_required: string[];
  skills: PostingSkill[];
}

interface JobPosting {
  id: number;
  company_id: number;
  job_title: string;
  product_vendor: string;
  product_type: string;
  job_role: string;
  seniority_level: string;
  worktype: string;
  location: string;
  employment_type: string;
  start_date: string;
  end_date?: string;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  pay_type?: string;
  job_description: string;
  job_category?: string;
  travel_requirements?: string;
  visa_info?: string;
  education_qualifications?: string;
  certifications_required?: string;
  required_skills?: string;
  posting_skills: PostingSkill[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Catalogs {
  technical_skills: string[];
  soft_skills: string[];
  certifications: string[];
}

// ============ CONSTANTS ============

const EMPTY_FORM: JobPostingFormData = {
  job_title: '',
  product_vendor: 'Oracle',
  product_type: '',
  job_role: '',
  seniority_level: '',
  worktype: 'remote',
  location: '',
  employment_type: 'ft',
  start_date: '',
  end_date: '',
  salary_min: '',
  salary_max: '',
  salary_currency: 'usd',
  pay_type: 'annually',
  job_description: '',
  job_category: '',
  travel_requirements: 'None',
  visa_info: '',
  education_qualifications: '',
  certifications_required: [],
  skills: [],
};

const SENIORITY_LEVELS = ['Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director'];
const EMPLOYMENT_TYPES = [
  { value: 'ft', label: 'Full-Time' },
  { value: 'pt', label: 'Part-Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'c2c', label: 'C2C' },
  { value: 'w2', label: 'W2' },
];
const TRAVEL_OPTIONS = ['None', '0-10%', '10-25%', '25-50%', '50%+'];
const VISA_OPTIONS = [
  'US Citizen', 'Green Card', 'H1B', 'OPT', 'CPT',
  'Sponsorship Available', 'Not Required',
];
const PRODUCT_VENDORS = ['Oracle'];

// Oracle Product → Role mapping
const ORACLE_PRODUCTS: Record<string, string[]> = {
  'Oracle Fusion Cloud Financials': [
    'Functional Consultant', 'Technical Consultant', 'Solution Architect',
    'Implementation Lead', 'Business Analyst', 'Finance SME', 'Project Manager',
  ],
  'Oracle Fusion Cloud HCM': [
    'HCM Functional Consultant', 'HCM Technical Consultant', 'Payroll Consultant',
    'Benefits Consultant', 'Absence Management Consultant', 'Talent Management Consultant',
    'HCM Solution Architect', 'Implementation Lead', 'Business Analyst',
  ],
  'Oracle Fusion Cloud SCM': [
    'SCM Functional Consultant', 'SCM Technical Consultant', 'Procurement Consultant',
    'Inventory Management Consultant', 'Order Management Consultant', 'Manufacturing Consultant',
    'SCM Solution Architect', 'Implementation Lead',
  ],
  'Oracle Fusion Cloud PPM': [
    'PPM Functional Consultant', 'PPM Technical Consultant', 'Project Manager',
    'Grants Management Consultant', 'PPM Solution Architect',
  ],
  'Oracle Fusion Cloud CX': [
    'CX Functional Consultant', 'CX Technical Consultant', 'Sales Cloud Consultant',
    'Service Cloud Consultant', 'Marketing Cloud Consultant', 'CPQ Consultant',
    'CX Solution Architect',
  ],
  'Oracle Fusion Cloud ERP': [
    'ERP Functional Consultant', 'ERP Technical Consultant', 'ERP Solution Architect',
    'Implementation Lead', 'Business Analyst', 'Finance Consultant', 'Procurement Consultant',
  ],
  'Oracle Integration Cloud (OIC)': [
    'Integration Developer', 'Integration Architect', 'OIC Consultant',
    'Technical Lead', 'Middleware Consultant',
  ],
  'Oracle VBCS': [
    'VBCS Developer', 'UI/UX Developer', 'Frontend Consultant',
    'Application Developer', 'Technical Lead',
  ],
  'Oracle Analytics Cloud': [
    'Analytics Consultant', 'BI Developer', 'Data Analyst',
    'OTBI Developer', 'Analytics Architect', 'Reporting Specialist',
  ],
  'Oracle EPM Cloud': [
    'EPM Functional Consultant', 'EPM Technical Consultant', 'Planning Consultant',
    'PBCS Consultant', 'FCCS Consultant', 'ARCS Consultant', 'EPM Architect',
  ],
  'Oracle E-Business Suite (EBS)': [
    'EBS Functional Consultant', 'EBS Technical Consultant', 'EBS DBA',
    'Forms/Reports Developer', 'EBS Solution Architect', 'EBS Upgrade Specialist',
  ],
  'Oracle PeopleSoft': [
    'PeopleSoft Functional Consultant', 'PeopleSoft Technical Consultant',
    'PeopleSoft DBA', 'PeopleTools Developer', 'PeopleSoft Architect',
  ],
  'Oracle Database': [
    'Database Administrator', 'Database Developer', 'Performance Tuning Specialist',
    'RAC Specialist', 'Data Guard Specialist', 'Database Architect',
  ],
  'Oracle Autonomous Database': [
    'Cloud DBA', 'Autonomous DB Specialist', 'Database Architect',
    'Data Engineer', 'Migration Specialist',
  ],
  'Oracle Cloud Infrastructure (OCI)': [
    'Cloud Architect', 'Cloud Engineer', 'DevOps Engineer',
    'Infrastructure Consultant', 'Security Specialist', 'Network Engineer',
  ],
  'Oracle NetSuite': [
    'NetSuite Functional Consultant', 'NetSuite Technical Consultant',
    'SuiteScript Developer', 'NetSuite Administrator', 'NetSuite Architect',
  ],
  'Oracle Primavera': [
    'Primavera P6 Consultant', 'Primavera Administrator', 'Project Controls Specialist',
    'Scheduling Analyst', 'Primavera Architect',
  ],
  'Oracle APEX': [
    'APEX Developer', 'APEX Architect', 'Application Developer',
    'Low-Code Developer', 'Technical Lead',
  ],
};

const ORACLE_PRODUCT_LIST = Object.keys(ORACLE_PRODUCTS);

const EDUCATION_OPTIONS = [
  "Bachelor's Degree", "Master's Degree", "PhD", "Associate's Degree",
  "High School Diploma", "MBA", "Bootcamp Graduate", "Professional Certificate",
];

// ============ COMPONENT ============

const JobPostingBuilder: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [catalogs, setCatalogs] = useState<Catalogs>({ technical_skills: [], soft_skills: [], certifications: [] });
  const [formData, setFormData] = useState<JobPostingFormData>({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [showPreview, setShowPreview] = useState(true);

  // Skills state
  const [skillSearchTech, setSkillSearchTech] = useState('');
  const [skillSearchSoft, setSkillSearchSoft] = useState('');
  const [showTechDropdown, setShowTechDropdown] = useState(false);
  const [showSoftDropdown, setShowSoftDropdown] = useState(false);
  const [certSearch, setCertSearch] = useState('');
  const [showCertDropdown, setShowCertDropdown] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formRef = useRef<HTMLFormElement>(null);
  const savedFormRef = useRef<string>('');
  const techDropdownRef = useRef<HTMLDivElement>(null);
  const softDropdownRef = useRef<HTMLDivElement>(null);
  const certDropdownRef = useRef<HTMLDivElement>(null);

  // User info
  const userName = localStorage.getItem('full_name') || localStorage.getItem('email') || 'Recruiter';

  // ============ DATA FETCHING ============

  const fetchPostings = useCallback(async () => {
    try {
      const res = await apiClient.getJobPostings();
      setPostings(res.data);
    } catch (err) {
      console.error('Failed to fetch postings:', err);
    }
  }, []);

  const fetchCatalogs = useCallback(async () => {
    try {
      const res = await apiClient.getSkillCatalogs();
      setCatalogs(res.data);
    } catch (err) {
      console.error('Failed to fetch catalogs:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchPostings(), fetchCatalogs()]);
      setLoading(false);
    };
    init();
  }, [fetchPostings, fetchCatalogs]);

  // Click-outside for dropdowns
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (techDropdownRef.current && !techDropdownRef.current.contains(e.target as Node)) {
        setShowTechDropdown(false);
      }
      if (softDropdownRef.current && !softDropdownRef.current.contains(e.target as Node)) {
        setShowSoftDropdown(false);
      }
      if (certDropdownRef.current && !certDropdownRef.current.contains(e.target as Node)) {
        setShowCertDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Dirty tracking
  useEffect(() => {
    const currentStr = JSON.stringify(formData);
    setIsDirty(currentStr !== savedFormRef.current);
  }, [formData]);

  // ============ FORM HANDLERS ============

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'product_type') {
      // When product changes, reset the role
      setFormData(prev => ({ ...prev, product_type: value, job_role: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    // Clear field error
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  // Get roles for the currently selected Oracle product
  const availableRoles = useMemo(() => {
    if (!formData.product_type) return [];
    return ORACLE_PRODUCTS[formData.product_type] || [];
  }, [formData.product_type]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.job_title.trim()) errs.job_title = 'Job Title is required';
    if (!formData.product_type.trim()) errs.job_category = 'Product Type is required';
    if (!formData.job_role.trim()) errs.job_role = 'Role is required';
    if (!formData.worktype) errs.worktype = 'Work mode is required';
    if (!formData.job_description.trim()) errs.job_description = 'Job description is required';
    if (!formData.location.trim()) errs.location = 'Location is required';
    if (!formData.end_date) errs.end_date = 'End date is required';
    if (formData.end_date) {
      const endDate = new Date(formData.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (endDate < today) errs.end_date = 'End date cannot be in the past';
    }
    if (formData.salary_min && formData.salary_max) {
      if (parseFloat(formData.salary_min) > parseFloat(formData.salary_max)) {
        errs.salary_min = 'Min salary must be ≤ max salary';
      }
    }
    // Skills must have rating
    for (const skill of formData.skills) {
      if (!skill.rating || skill.rating < 1) {
        errs.skills = 'All skills must have a rating (1-10)';
        break;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      setToast({ message: 'Please fix the validation errors', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        job_title: formData.job_title,
        product_vendor: formData.product_vendor,
        product_type: formData.product_type,
        job_role: formData.job_role || formData.job_title,
        seniority_level: formData.seniority_level || 'Mid',
        worktype: formData.worktype,
        location: formData.location,
        employment_type: formData.employment_type,
        start_date: formData.start_date || new Date().toISOString().split('T')[0],
        salary_min: parseFloat(formData.salary_min) || 0,
        salary_max: parseFloat(formData.salary_max) || 0,
        salary_currency: formData.salary_currency,
        job_description: formData.job_description,
        end_date: formData.end_date || null,
        job_category: formData.job_category || null,
        travel_requirements: formData.travel_requirements || null,
        visa_info: formData.visa_info || null,
        education_qualifications: formData.education_qualifications || null,
        certifications_required: formData.certifications_required.length > 0
          ? JSON.stringify(formData.certifications_required)
          : null,
        pay_type: formData.pay_type || null,
        skills: formData.skills.map(s => ({
          skill_name: s.skill_name,
          skill_category: s.skill_category,
          rating: s.rating,
        })),
      };

      if (editingId) {
        await apiClient.updateJobPosting(editingId, payload);
        setToast({ message: 'Job posting updated successfully!', type: 'success' });
      } else {
        const res = await apiClient.createJobPosting(payload);
        setEditingId(res.data.job_id);
        setToast({ message: 'Job posting created successfully!', type: 'success' });
      }

      savedFormRef.current = JSON.stringify(formData);
      setIsDirty(false);
      await fetchPostings();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to save job posting';
      setToast({ message: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const loadPosting = (posting: JobPosting) => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Discard and load this posting?')) return;
    }
    const certs = posting.certifications_required
      ? (() => { try { return JSON.parse(posting.certifications_required); } catch { return []; } })()
      : [];
    const newForm: JobPostingFormData = {
      job_title: posting.job_title,
      product_vendor: posting.product_vendor,
      product_type: posting.product_type,
      job_role: posting.job_role,
      seniority_level: posting.seniority_level,
      worktype: posting.worktype,
      location: posting.location,
      employment_type: posting.employment_type,
      start_date: posting.start_date,
      end_date: posting.end_date || '',
      salary_min: posting.salary_min?.toString() || '',
      salary_max: posting.salary_max?.toString() || '',
      salary_currency: posting.salary_currency,
      pay_type: posting.pay_type || 'annually',
      job_description: posting.job_description,
      job_category: posting.job_category || '',
      travel_requirements: posting.travel_requirements || 'None',
      visa_info: posting.visa_info || '',
      education_qualifications: posting.education_qualifications || '',
      certifications_required: certs,
      skills: (posting.posting_skills || []).map(s => ({
        id: s.id,
        skill_name: s.skill_name,
        skill_category: s.skill_category as 'technical' | 'soft',
        rating: s.rating,
      })),
    };
    setFormData(newForm);
    savedFormRef.current = JSON.stringify(newForm);
    setEditingId(posting.id);
    setIsDirty(false);
    setErrors({});
  };

  const handleNewPosting = () => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Discard and start new?')) return;
    }
    setFormData({ ...EMPTY_FORM });
    savedFormRef.current = JSON.stringify(EMPTY_FORM);
    setEditingId(null);
    setIsDirty(false);
    setErrors({});
  };

  // ============ SKILLS HANDLERS ============

  const addSkill = (skillName: string, category: 'technical' | 'soft') => {
    if (formData.skills.find(s => s.skill_name === skillName)) return; // prevent dup
    setFormData(prev => ({
      ...prev,
      skills: [...prev.skills, { skill_name: skillName, skill_category: category, rating: 5 }],
    }));
    if (category === 'technical') { setSkillSearchTech(''); setShowTechDropdown(false); }
    else { setSkillSearchSoft(''); setShowSoftDropdown(false); }
  };

  const removeSkill = (skillName: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s.skill_name !== skillName),
    }));
  };

  const updateSkillRating = (skillName: string, rating: number) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.map(s => s.skill_name === skillName ? { ...s, rating } : s),
    }));
  };

  const addCertification = (cert: string) => {
    if (formData.certifications_required.includes(cert)) return;
    setFormData(prev => ({
      ...prev,
      certifications_required: [...prev.certifications_required, cert],
    }));
    setCertSearch('');
    setShowCertDropdown(false);
  };

  const removeCertification = (cert: string) => {
    setFormData(prev => ({
      ...prev,
      certifications_required: prev.certifications_required.filter(c => c !== cert),
    }));
  };

  // ============ FILTERED CATALOGS ============

  const filteredTechSkills = useMemo(() => {
    const selected = new Set(formData.skills.filter(s => s.skill_category === 'technical').map(s => s.skill_name));
    return catalogs.technical_skills
      .filter(s => !selected.has(s))
      .filter(s => s.toLowerCase().includes(skillSearchTech.toLowerCase()));
  }, [catalogs.technical_skills, formData.skills, skillSearchTech]);

  const filteredSoftSkills = useMemo(() => {
    const selected = new Set(formData.skills.filter(s => s.skill_category === 'soft').map(s => s.skill_name));
    return catalogs.soft_skills
      .filter(s => !selected.has(s))
      .filter(s => s.toLowerCase().includes(skillSearchSoft.toLowerCase()));
  }, [catalogs.soft_skills, formData.skills, skillSearchSoft]);

  const filteredCerts = useMemo(() => {
    const selected = new Set(formData.certifications_required);
    return catalogs.certifications
      .filter(c => !selected.has(c))
      .filter(c => c.toLowerCase().includes(certSearch.toLowerCase()));
  }, [catalogs.certifications, formData.certifications_required, certSearch]);

  const filteredPostings = useMemo(() => {
    if (!listSearch.trim()) return postings;
    const q = listSearch.toLowerCase();
    return postings.filter(p =>
      p.job_title.toLowerCase().includes(q) ||
      p.location?.toLowerCase().includes(q) ||
      p.product_vendor?.toLowerCase().includes(q)
    );
  }, [postings, listSearch]);

  // ============ FORMAT HELPERS ============

  const formatSalary = (min: string, max: string, currency: string, payType: string) => {
    const sym = currency === 'usd' ? '$' : currency === 'gbp' ? '£' : '€';
    const suffix = payType === 'hourly' ? '/hr' : '/yr';
    if (!min && !max) return 'Not specified';
    if (min && max) return `${sym}${Number(min).toLocaleString()} – ${sym}${Number(max).toLocaleString()}${suffix}`;
    if (min) return `From ${sym}${Number(min).toLocaleString()}${suffix}`;
    return `Up to ${sym}${Number(max).toLocaleString()}${suffix}`;
  };

  const empTypeLabel = (val: string) => EMPLOYMENT_TYPES.find(e => e.value === val)?.label || val;
  const worktypeLabel = (val: string) => val.charAt(0).toUpperCase() + val.slice(1);

  // ============ RENDER ============

  if (loading) {
    return (
      <div className="jpb-page">
        <div className="jpb-loading">
          <div className="jpb-loading-spinner" />
          <p>Loading Job Posting Builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="jpb-page">
      {/* Toast */}
      {toast && (
        <div className={`jpb-toast jpb-toast-${toast.type}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {toast.type === 'success'
              ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
              : <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>
            }
          </svg>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="jpb-topbar">
        <div className="jpb-topbar-left">
          <button 
            type="button"
            className="jpb-back-btn" 
            onClick={() => {
              console.log('[JPB NAV] Back button clicked — token:', !!localStorage.getItem('token'), '| role:', localStorage.getItem('role'));
              navigate(-1);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="jpb-topbar-title">
            <h1>Job Posting Builder</h1>
            <span className="jpb-topbar-sub">{postings.length} posting{postings.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="jpb-topbar-right">
          {isDirty && <span className="jpb-unsaved-badge">Unsaved changes</span>}
          <button className="jpb-btn jpb-btn-outline" onClick={handleNewPosting}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Posting
          </button>
          <button className="jpb-btn jpb-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <><div className="jpb-btn-spinner" /> Saving...</>
            ) : (
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> {editingId ? 'Update Posting' : 'Save Posting'}</>
            )}
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="jpb-layout">
        {/* LEFT: Postings List */}
        <aside className="jpb-sidebar">
          <div className="jpb-sidebar-header">
            <div className="jpb-search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search postings..."
                value={listSearch}
                onChange={e => setListSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="jpb-sidebar-list">
            {filteredPostings.length === 0 ? (
              <div className="jpb-empty-list">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
                <p>No job postings yet</p>
                <span>Create your first posting using the form</span>
              </div>
            ) : (
              filteredPostings.map(p => (
                <div
                  key={p.id}
                  className={`jpb-posting-card ${editingId === p.id ? 'active' : ''}`}
                  onClick={() => loadPosting(p)}
                >
                  <div className="jpb-posting-card-top">
                    <h4>{p.job_title}</h4>
                    <span className={`jpb-status-dot ${p.is_active ? 'active' : 'inactive'}`} />
                  </div>
                  <div className="jpb-posting-card-meta">
                    <span>{p.location || 'No location'}</span>
                    <span className="jpb-meta-dot">·</span>
                    <span>{worktypeLabel(p.worktype)}</span>
                    <span className="jpb-meta-dot">·</span>
                    <span>{empTypeLabel(p.employment_type)}</span>
                  </div>
                  <div className="jpb-posting-card-bottom">
                    <span className="jpb-posting-vendor">{p.product_vendor}</span>
                    {p.posting_skills?.length > 0 && (
                      <span className="jpb-skill-count">{p.posting_skills.length} skill{p.posting_skills.length > 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* RIGHT: Form + Preview */}
        <main className="jpb-main">
          <div className="jpb-main-tabs">
            <button
              className={`jpb-main-tab ${!showPreview ? 'active' : ''}`}
              onClick={() => setShowPreview(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit Form
            </button>
            <button
              className={`jpb-main-tab ${showPreview ? 'active' : ''}`}
              onClick={() => setShowPreview(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Live Preview
            </button>
          </div>

          <div className="jpb-main-content">
            {/* ======= FORM PANEL ======= */}
            <div className={`jpb-form-panel ${showPreview ? 'hidden-mobile' : ''}`}>
              <form ref={formRef} onSubmit={e => { e.preventDefault(); handleSave(); }}>

                {/* SECTION: Metadata */}
                <div className="jpb-form-section">
                  <div className="jpb-section-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <h3>Recruiter & Metadata</h3>
                  </div>
                  <div className="jpb-form-row">
                    <div className="jpb-field">
                      <label>Recruiter</label>
                      <div className="jpb-readonly-field">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                        {userName}
                      </div>
                    </div>
                    <div className="jpb-field">
                      <label>Posting End Date <span className="jpb-required">*</span></label>
                      <input
                        type="date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                        className={errors.end_date ? 'jpb-error-input' : ''}
                      />
                      {errors.end_date && <span className="jpb-error-text">{errors.end_date}</span>}
                    </div>
                  </div>
                </div>

                {/* SECTION: Job Details */}
                <div className="jpb-form-section">
                  <div className="jpb-section-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                    <h3>Job Details</h3>
                  </div>

                  {/* Row 1: Product Vendor (locked to Oracle) */}
                  <div className="jpb-field jpb-field-full">
                    <label>Product Vendor</label>
                    <select name="product_vendor" value={formData.product_vendor} onChange={handleInputChange}>
                      {PRODUCT_VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>

                  {/* Row 2: Product Type & Role (cascading) */}
                  <div className="jpb-form-row">
                    <div className="jpb-field">
                      <label>Product Type <span className="jpb-required">*</span></label>
                      <select
                        name="product_type"
                        value={formData.product_type}
                        onChange={handleInputChange}
                        className={errors.job_category ? 'jpb-error-input' : ''}
                      >
                        <option value="">Select Product</option>
                        {ORACLE_PRODUCT_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      {errors.job_category && <span className="jpb-error-text">{errors.job_category}</span>}
                    </div>
                    <div className="jpb-field">
                      <label>Role <span className="jpb-required">*</span></label>
                      <select
                        name="job_role"
                        value={formData.job_role}
                        onChange={handleInputChange}
                        disabled={availableRoles.length === 0}
                        className={errors.job_role ? 'jpb-error-input' : ''}
                      >
                        <option value="">{availableRoles.length === 0 ? 'Select a product first' : 'Select Role'}</option>
                        {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {errors.job_role && <span className="jpb-error-text">{errors.job_role}</span>}
                    </div>
                  </div>

                  {/* Row 3: Job Title */}
                  <div className="jpb-field jpb-field-full">
                    <label>Job Title <span className="jpb-required">*</span></label>
                    <input
                      type="text"
                      name="job_title"
                      value={formData.job_title}
                      onChange={handleInputChange}
                      placeholder="e.g., Senior Oracle Fusion Financials Consultant"
                      className={errors.job_title ? 'jpb-error-input' : ''}
                    />
                    {errors.job_title && <span className="jpb-error-text">{errors.job_title}</span>}
                  </div>

                  {/* Row 4: Job Description */}
                  <div className="jpb-field jpb-field-full">
                    <label>Job Description <span className="jpb-required">*</span></label>
                    <textarea
                      name="job_description"
                      value={formData.job_description}
                      onChange={handleInputChange}
                      placeholder="Describe the role, responsibilities, and requirements..."
                      rows={6}
                      className={errors.job_description ? 'jpb-error-input' : ''}
                    />
                    {errors.job_description && <span className="jpb-error-text">{errors.job_description}</span>}
                  </div>

                  {/* Row 5: Seniority Level & Type of Job */}
                  <div className="jpb-form-row">
                    <div className="jpb-field">
                      <label>Seniority Level</label>
                      <select name="seniority_level" value={formData.seniority_level} onChange={handleInputChange}>
                        <option value="">Select Level</option>
                        {SENIORITY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="jpb-field">
                      <label>Type of Job</label>
                      <select name="employment_type" value={formData.employment_type} onChange={handleInputChange}>
                        {EMPLOYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Row 6: Travel Requirements & Work Mode */}
                  <div className="jpb-form-row">
                    <div className="jpb-field">
                      <label>Travel Requirements</label>
                      <select name="travel_requirements" value={formData.travel_requirements} onChange={handleInputChange}>
                        {TRAVEL_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="jpb-field">
                      <label>Work Mode <span className="jpb-required">*</span></label>
                      <div className="jpb-radio-group">
                        {['remote', 'hybrid', 'onsite'].map(mode => (
                          <label key={mode} className={`jpb-radio-pill ${formData.worktype === mode ? 'selected' : ''}`}>
                            <input
                              type="radio"
                              name="worktype"
                              value={mode}
                              checked={formData.worktype === mode}
                              onChange={handleInputChange}
                            />
                            {worktypeLabel(mode)}
                          </label>
                        ))}
                      </div>
                      {errors.worktype && <span className="jpb-error-text">{errors.worktype}</span>}
                    </div>
                  </div>

                  {/* Row 7: Job Location */}
                  <div className="jpb-field jpb-field-full">
                    <label>Job Location <span className="jpb-required">*</span></label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="e.g., San Francisco, CA"
                      className={errors.location ? 'jpb-error-input' : ''}
                    />
                    {errors.location && <span className="jpb-error-text">{errors.location}</span>}
                  </div>
                </div>

                {/* SECTION: Requirements */}
                <div className="jpb-form-section">
                  <div className="jpb-section-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <h3>Candidate Requirements</h3>
                  </div>

                  <div className="jpb-form-row">
                    <div className="jpb-field">
                      <label>Education Qualifications</label>
                      <select
                        name="education_qualifications"
                        value={formData.education_qualifications}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Qualification</option>
                        {EDUCATION_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div className="jpb-field">
                      <label>Visa Information</label>
                      <select name="visa_info" value={formData.visa_info} onChange={handleInputChange}>
                        <option value="">Select Visa Requirement</option>
                        {VISA_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="jpb-form-row">
                    <div className="jpb-field">
                      <label>Product Type</label>
                      <input
                        type="text"
                        name="product_type"
                        value={formData.product_type}
                        onChange={handleInputChange}
                        placeholder="e.g., ERP, CRM, Cloud"
                      />
                    </div>
                  </div>

                  {/* Certifications multi-select */}
                  <div className="jpb-field jpb-field-full">
                    <label>Certifications</label>
                    <div className="jpb-multi-select" ref={certDropdownRef}>
                      <div className="jpb-multi-input-wrap">
                        {formData.certifications_required.map(cert => (
                          <span key={cert} className="jpb-multi-tag">
                            {cert}
                            <button type="button" onClick={() => removeCertification(cert)}>×</button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={certSearch}
                          onChange={e => { setCertSearch(e.target.value); setShowCertDropdown(true); }}
                          onFocus={() => setShowCertDropdown(true)}
                          placeholder={formData.certifications_required.length === 0 ? "Search certifications..." : "Add more..."}
                        />
                      </div>
                      {showCertDropdown && filteredCerts.length > 0 && (
                        <div className="jpb-dropdown-list">
                          {filteredCerts.slice(0, 10).map(cert => (
                            <div key={cert} className="jpb-dropdown-item" onClick={() => addCertification(cert)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                              </svg>
                              {cert}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION: Compensation */}
                <div className="jpb-form-section">
                  <div className="jpb-section-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    <h3>Compensation</h3>
                  </div>

                  <div className="jpb-form-row jpb-form-row-3">
                    <div className="jpb-field">
                      <label>Salary Min</label>
                      <input
                        type="number"
                        name="salary_min"
                        value={formData.salary_min}
                        onChange={handleInputChange}
                        placeholder="e.g., 120000"
                        className={errors.salary_min ? 'jpb-error-input' : ''}
                      />
                      {errors.salary_min && <span className="jpb-error-text">{errors.salary_min}</span>}
                    </div>
                    <div className="jpb-field">
                      <label>Salary Max</label>
                      <input
                        type="number"
                        name="salary_max"
                        value={formData.salary_max}
                        onChange={handleInputChange}
                        placeholder="e.g., 180000"
                      />
                    </div>
                    <div className="jpb-field">
                      <label>Currency</label>
                      <select name="salary_currency" value={formData.salary_currency} onChange={handleInputChange}>
                        <option value="usd">USD ($)</option>
                        <option value="gbp">GBP (£)</option>
                        <option value="eur">EUR (€)</option>
                      </select>
                    </div>
                  </div>

                  <div className="jpb-field">
                    <label>Pay Type</label>
                    <div className="jpb-radio-group">
                      {['annually', 'hourly'].map(pt => (
                        <label key={pt} className={`jpb-radio-pill ${formData.pay_type === pt ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="pay_type"
                            value={pt}
                            checked={formData.pay_type === pt}
                            onChange={handleInputChange}
                          />
                          {pt.charAt(0).toUpperCase() + pt.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SECTION: Skills */}
                <div className="jpb-form-section">
                  <div className="jpb-section-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <h3>Skills</h3>
                  </div>
                  {errors.skills && <span className="jpb-error-text jpb-error-block">{errors.skills}</span>}

                  {/* Technical Skills */}
                  <div className="jpb-skill-group">
                    <h4 className="jpb-skill-group-title">
                      <span className="jpb-skill-dot tech" />
                      Technical Skills
                    </h4>
                    <div className="jpb-multi-select" ref={techDropdownRef}>
                      <input
                        type="text"
                        value={skillSearchTech}
                        onChange={e => { setSkillSearchTech(e.target.value); setShowTechDropdown(true); }}
                        onFocus={() => setShowTechDropdown(true)}
                        placeholder="Search and add technical skills..."
                        className="jpb-skill-search-input"
                      />
                      {showTechDropdown && filteredTechSkills.length > 0 && (
                        <div className="jpb-dropdown-list">
                          {filteredTechSkills.slice(0, 12).map(s => (
                            <div key={s} className="jpb-dropdown-item" onClick={() => addSkill(s, 'technical')}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                              </svg>
                              {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Soft Skills */}
                  <div className="jpb-skill-group">
                    <h4 className="jpb-skill-group-title">
                      <span className="jpb-skill-dot soft" />
                      Soft Skills
                    </h4>
                    <div className="jpb-multi-select" ref={softDropdownRef}>
                      <input
                        type="text"
                        value={skillSearchSoft}
                        onChange={e => { setSkillSearchSoft(e.target.value); setShowSoftDropdown(true); }}
                        onFocus={() => setShowSoftDropdown(true)}
                        placeholder="Search and add soft skills..."
                        className="jpb-skill-search-input"
                      />
                      {showSoftDropdown && filteredSoftSkills.length > 0 && (
                        <div className="jpb-dropdown-list">
                          {filteredSoftSkills.slice(0, 12).map(s => (
                            <div key={s} className="jpb-dropdown-item" onClick={() => addSkill(s, 'soft')}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                              </svg>
                              {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Skills List */}
                  {formData.skills.length > 0 && (
                    <div className="jpb-skills-list">
                      <h4 className="jpb-skills-list-title">Selected Skills ({formData.skills.length})</h4>
                      {formData.skills.map(skill => (
                        <div key={skill.skill_name} className="jpb-skill-item">
                          <div className="jpb-skill-item-left">
                            <span className={`jpb-skill-dot ${skill.skill_category}`} />
                            <span className="jpb-skill-item-name">{skill.skill_name}</span>
                            <span className="jpb-skill-item-cat">{skill.skill_category}</span>
                          </div>
                          <div className="jpb-skill-item-right">
                            <div className="jpb-rating-control">
                              <button type="button" onClick={() => updateSkillRating(skill.skill_name, Math.max(1, skill.rating - 1))}>−</button>
                              <span className="jpb-rating-value">{skill.rating}</span>
                              <span className="jpb-rating-max">/10</span>
                              <button type="button" onClick={() => updateSkillRating(skill.skill_name, Math.min(10, skill.rating + 1))}>+</button>
                            </div>
                            <div className="jpb-rating-bar">
                              <div className="jpb-rating-fill" style={{ width: `${skill.rating * 10}%` }} />
                            </div>
                            <button type="button" className="jpb-skill-delete" onClick={() => removeSkill(skill.skill_name)} title="Remove skill">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </form>
            </div>

            {/* ======= PREVIEW PANEL ======= */}
            <div className={`jpb-preview-panel ${!showPreview ? 'hidden-mobile' : ''}`}>
              <div className="jpb-preview-card">
                <div className="jpb-preview-header">
                  <h2 className="jpb-preview-title">{formData.job_title || 'Untitled Position'}</h2>
                  <div className="jpb-preview-badges">
                    {formData.job_category && <span className="jpb-preview-badge category">{formData.job_category}</span>}
                    {formData.seniority_level && <span className="jpb-preview-badge seniority">{formData.seniority_level}</span>}
                    <span className="jpb-preview-badge workmode">{worktypeLabel(formData.worktype)}</span>
                    <span className="jpb-preview-badge emptype">{empTypeLabel(formData.employment_type)}</span>
                    {formData.product_vendor && formData.product_vendor !== 'Other' && (
                      <span className="jpb-preview-badge vendor">{formData.product_vendor}</span>
                    )}
                  </div>
                </div>

                <div className="jpb-preview-meta-row">
                  {formData.location && (
                    <div className="jpb-preview-meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      {formData.location}
                    </div>
                  )}
                  {formData.visa_info && (
                    <div className="jpb-preview-meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                      </svg>
                      {formData.visa_info}
                    </div>
                  )}
                  {formData.travel_requirements && formData.travel_requirements !== 'None' && (
                    <div className="jpb-preview-meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                      </svg>
                      Travel: {formData.travel_requirements}
                    </div>
                  )}
                </div>

                {/* Salary */}
                <div className="jpb-preview-salary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  <span>{formatSalary(formData.salary_min, formData.salary_max, formData.salary_currency, formData.pay_type)}</span>
                </div>

                {/* Description */}
                {formData.job_description && (
                  <div className="jpb-preview-section">
                    <h3>Job Description</h3>
                    <div className="jpb-preview-description">
                      {formData.job_description.split('\n').map((line, i) => (
                        <p key={i}>{line || '\u00A0'}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Requirements */}
                {(formData.education_qualifications || formData.visa_info) && (
                  <div className="jpb-preview-section">
                    <h3>Requirements</h3>
                    <div className="jpb-preview-req-grid">
                      {formData.education_qualifications && (
                        <div className="jpb-preview-req-item">
                          <span className="jpb-preview-req-label">Education</span>
                          <span className="jpb-preview-req-value">{formData.education_qualifications}</span>
                        </div>
                      )}
                      {formData.visa_info && (
                        <div className="jpb-preview-req-item">
                          <span className="jpb-preview-req-label">Visa</span>
                          <span className="jpb-preview-req-value">{formData.visa_info}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {formData.skills.length > 0 && (
                  <div className="jpb-preview-section">
                    <h3>Required Skills</h3>
                    {formData.skills.filter(s => s.skill_category === 'technical').length > 0 && (
                      <div className="jpb-preview-skill-group">
                        <h4>Technical Skills</h4>
                        <div className="jpb-preview-skills">
                          {formData.skills.filter(s => s.skill_category === 'technical').map(s => (
                            <div key={s.skill_name} className="jpb-preview-skill-chip">
                              <span className="jpb-preview-skill-name">{s.skill_name}</span>
                              <div className="jpb-preview-skill-rating">
                                {Array.from({ length: 10 }, (_, i) => (
                                  <span key={i} className={`jpb-preview-star ${i < s.rating ? 'filled' : ''}`}>●</span>
                                ))}
                              </div>
                              <span className="jpb-preview-skill-num">{s.rating}/10</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {formData.skills.filter(s => s.skill_category === 'soft').length > 0 && (
                      <div className="jpb-preview-skill-group">
                        <h4>Soft Skills</h4>
                        <div className="jpb-preview-skills">
                          {formData.skills.filter(s => s.skill_category === 'soft').map(s => (
                            <div key={s.skill_name} className="jpb-preview-skill-chip">
                              <span className="jpb-preview-skill-name">{s.skill_name}</span>
                              <div className="jpb-preview-skill-rating">
                                {Array.from({ length: 10 }, (_, i) => (
                                  <span key={i} className={`jpb-preview-star ${i < s.rating ? 'filled' : ''}`}>●</span>
                                ))}
                              </div>
                              <span className="jpb-preview-skill-num">{s.rating}/10</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Certifications */}
                {formData.certifications_required.length > 0 && (
                  <div className="jpb-preview-section">
                    <h3>Required Certifications</h3>
                    <div className="jpb-preview-certs">
                      {formData.certifications_required.map(c => (
                        <span key={c} className="jpb-preview-cert-tag">{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* End Date */}
                {formData.end_date && (
                  <div className="jpb-preview-footer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Applications close on {new Date(formData.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default JobPostingBuilder;
