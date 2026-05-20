import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import '../styles/JobPostingBuilder.css';
import { StatusBadge, SectionCard, LifecycleActions, JobPreviewPanel, FormProgressBar } from '../components/JobPostingComponents';
import CascadingTaxonomySelect from '../components/CascadingTaxonomySelect';

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
  status?: string; // 'active', 'frozen', 'reposted', 'cancelled'
  frozen_at?: string;
  reposted_at?: string;
  last_reactivated_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
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

// NOTE: Product taxonomy (vendors, product types, roles) now loaded dynamically from database
// The hardcoded PRODUCT_VENDORS and ORACLE_PRODUCTS constants have been removed
// Use CascadingTaxonomySelect component for vendor/product/role selection

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'frozen' | 'reposted' | 'cancelled'>('all');
  const [showPreview, setShowPreview] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPostingId, setSelectedPostingId] = useState<number | null>(null);
  
  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const PAGE_SIZE_POSTINGS = 9;
  const [currentPostPage, setCurrentPostPage] = useState(1);

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
      const res = await apiClient.getJobPostings(false); // Get all postings including frozen
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

  // Reset pagination when filters change
  useEffect(() => { setCurrentPostPage(1); }, [listSearch, statusFilter]);

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
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field error
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

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
    setShowForm(true);
  };

  const handleDuplicatePosting = (posting: JobPosting) => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;

    const certs = posting.certifications_required
      ? (() => { try { return JSON.parse(posting.certifications_required); } catch { return []; } })()
      : [];
    const newForm: JobPostingFormData = {
      job_title: `${posting.job_title} (Copy)`,
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
        skill_name: s.skill_name,
        skill_category: s.skill_category as 'technical' | 'soft',
        rating: s.rating,
      })),
    };
    setFormData(newForm);
    setEditingId(null); // Critical: null = creates new on submit
    setIsDirty(true);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    setShowForm(true);
  };

  const handleJobLifecycleAction = async (jobId: number, action: 'freeze' | 'reactivate' | 'repost', e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    try {
      const response = await apiClient.updateJobPostingStatus(jobId, action);
      alert(`Job ${action}d successfully!`);
      // Refresh job listings
      await fetchPostings();
    } catch (error: any) {
      console.error('[LIFECYCLE ERROR]', error);
      alert(error.response?.data?.detail || `Failed to ${action} job`);
    }
  };

  const handleCancelJob = async () => {
    if (!showCancelModal) return;
    
    const reasonText = cancelReason === 'Other' ? customReason.trim() : cancelReason;
    
    if (!reasonText) {
      alert('Please provide a cancellation reason');
      return;
    }
    
    try {
      await apiClient.updateJobPostingStatus(showCancelModal, 'cancel', reasonText);
      alert('Job posting cancelled successfully');
      setShowCancelModal(null);
      setCancelReason('');
      setCustomReason('');
      await fetchPostings();
    } catch (error: any) {
      console.error('[CANCEL ERROR]', error);
      alert(error.response?.data?.detail || 'Failed to cancel job posting');
    }
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
    let filtered = postings;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => (p.status || '').toLowerCase() === statusFilter);
    }
    
    // Apply search filter
    if (!listSearch.trim()) return filtered;
    const q = listSearch.toLowerCase();
    return filtered.filter(p =>
      p.job_title.toLowerCase().includes(q) ||
      p.location?.toLowerCase().includes(q) ||
      p.product_vendor?.toLowerCase().includes(q)
    );
  }, [postings, listSearch, statusFilter]);

  // ============ PAGINATION ============

  const totalPostPages = Math.ceil(filteredPostings.length / PAGE_SIZE_POSTINGS);
  const paginatedPostings = filteredPostings.slice(
    (currentPostPage - 1) * PAGE_SIZE_POSTINGS,
    currentPostPage * PAGE_SIZE_POSTINGS
  );
  const getPostPageNumbers = (): (number | string)[] => {
    if (totalPostPages <= 7) return Array.from({ length: totalPostPages }, (_, i) => i + 1);
    const pages: (number | string)[] = [];
    if (currentPostPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPostPages);
    } else if (currentPostPage >= totalPostPages - 3) {
      pages.push(1, '...', totalPostPages - 4, totalPostPages - 3, totalPostPages - 2, totalPostPages - 1, totalPostPages);
    } else {
      pages.push(1, '...', currentPostPage - 1, currentPostPage, currentPostPage + 1, '...', totalPostPages);
    }
    return pages;
  };

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

  // ---- LIST VIEW ----
  if (!showForm) {
    const worktypeLabel = (wt: string) => ({ remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }[wt] || wt);
    const fmtSalary = (min: number, max: number, cur: string) => {
      const fmt = (v: number) => v >= 1000 ? `${Math.round(v/1000)}k` : v.toLocaleString();
      return `${(cur||'USD').toUpperCase()} ${fmt(min)} – ${fmt(max)}`;
    };

    return (
      <div className="cp-page">
        {/* Toast */}
        {toast && (
          <div className={`jpb-toast jpb-toast-${toast.type}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {toast.type === 'success' ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></> : <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>}
            </svg>
            <span>{toast.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="cp-list-header">
          <nav className="cp-breadcrumb">
            <a onClick={() => navigate('/recruiter-dashboard')} style={{ cursor: 'pointer' }}>Dashboard</a>
            <span className="cp-breadcrumb-sep">›</span>
            <span className="cp-breadcrumb-current">Job Postings</span>
          </nav>

          <div className="cp-page-title-block">
            <h1 className="cp-page-h1">Job Postings</h1>
            <button className="jpb-btn jpb-btn-primary" onClick={handleNewPosting}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Posting
            </button>
          </div>

          <div className="cp-filter-bar">
            <div className="cp-search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search postings..." value={listSearch} onChange={e => setListSearch(e.target.value)} />
            </div>
            <div className="cp-filter-chips">
              {(['all','active','frozen','reposted','cancelled'] as const).map(s => (
                <button key={s} className={`cp-filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable card grid */}
        <div className="cp-page-body">
          {filteredPostings.length === 0 ? (
            <div className="cp-empty-state">
              <svg className="cp-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
              <h3 className="cp-empty-title">No job postings yet</h3>
              <p className="cp-empty-text">Create your first job posting to start hiring.</p>
              <button className="jpb-btn jpb-btn-primary cp-btn-lg" onClick={handleNewPosting}>+ Create First Posting</button>
            </div>
          ) : (
            <div className="cp-main-grid">
              {paginatedPostings.map(p => {
                const nStatus = (p.status || '').toLowerCase();
                const skills = p.posting_skills || [];
                return (
                  <div key={p.id} className="cp-posting-card" onClick={() => setSelectedPostingId(selectedPostingId === p.id ? null : p.id)}>
                    <div className="cp-posting-card-top">
                      <div>
                        <div className="cp-posting-card-title">{p.job_title}</div>
                        <div className="cp-posting-card-dept">{p.product_vendor}{p.product_type ? ` · ${p.product_type}` : ''}</div>
                      </div>
                      <span className={`cp-posting-status ${nStatus}`}>{p.status || 'active'}</span>
                    </div>
                    {skills.length > 0 && (
                      <div className="cp-posting-card-skill-tags">
                        {skills.slice(0,4).map((s: any,i: number) => <span key={i} className="cp-posting-card-skill-tag">{s.skill_name}</span>)}
                        {skills.length > 4 && <span className="cp-posting-card-skill-tag">+{skills.length-4}</span>}
                      </div>
                    )}
                    <div className="cp-posting-card-meta">
                      {p.location && <span>📍 {p.location}</span>}
                      <span>🏠 {worktypeLabel(p.worktype)}</span>
                      {p.salary_min > 0 && <span>💰 {fmtSalary(p.salary_min, p.salary_max, p.salary_currency)}</span>}
                    </div>
                    <div className="cp-posting-card-footer">
                      <span className="cp-posting-card-apps">
                        {p.created_at && `Posted ${new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                      </span>
                      <div className="cp-posting-card-action-btns">
                        <button className="cp-posting-action-btn" onClick={(e) => { e.stopPropagation(); loadPosting(p); }}>Edit</button>
                        {nStatus !== 'cancelled' && nStatus !== 'frozen' && (
                          <button className="cp-posting-action-btn freeze" onClick={(e) => handleJobLifecycleAction(p.id, 'freeze', e)}>Freeze</button>
                        )}
                        {nStatus === 'frozen' && (
                          <>
                            <button className="cp-posting-action-btn unfreeze" onClick={(e) => handleJobLifecycleAction(p.id, 'reactivate', e)}>Unfreeze</button>
                            <button className="cp-posting-action-btn repost" onClick={(e) => handleJobLifecycleAction(p.id, 'repost', e)}>Repost</button>
                          </>
                        )}
                        {nStatus !== 'cancelled' && (
                          <button className="cp-posting-action-btn cancel" onClick={(e) => { e.stopPropagation(); setShowCancelModal(p.id); }}>Cancel</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination footer */}
        {totalPostPages > 1 && (
          <div className="cp-pagination-footer">
            <span className="cp-pagination-info">
              Showing {(currentPostPage - 1) * PAGE_SIZE_POSTINGS + 1}–{Math.min(currentPostPage * PAGE_SIZE_POSTINGS, filteredPostings.length)} of {filteredPostings.length}
            </span>
            <div className="cp-pagination-buttons">
              <button className="cp-pag-btn" onClick={() => setCurrentPostPage(p => p - 1)} disabled={currentPostPage === 1}>← Prev</button>
              {getPostPageNumbers().map((pn, i) =>
                pn === '...' ? (
                  <span key={`e${i}`} className="cp-pag-btn ellipsis">…</span>
                ) : (
                  <button key={pn} className={`cp-pag-btn${currentPostPage === pn ? ' active' : ''}`} onClick={() => setCurrentPostPage(pn as number)}>{pn}</button>
                )
              )}
              <button className="cp-pag-btn" onClick={() => setCurrentPostPage(p => p + 1)} disabled={currentPostPage === totalPostPages}>Next →</button>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowCancelModal(null)}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 420, width: '90%' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 12px' }}>Cancel Job Posting</h3>
              <select value={cancelReason} onChange={e => setCancelReason(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 12, fontSize: 14 }}>
                <option value="">Select reason...</option>
                <option value="position_filled">Position Filled</option>
                <option value="budget_cut">Budget Cut</option>
                <option value="requirements_changed">Requirements Changed</option>
                <option value="other">Other</option>
              </select>
              {cancelReason === 'other' && (
                <textarea value={customReason} onChange={e => setCustomReason(e.target.value)} placeholder="Enter reason..." style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 12, fontSize: 14, height: 80, resize: 'vertical', fontFamily: 'inherit' }} />
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="jpb-btn jpb-btn-outline" onClick={() => setShowCancelModal(null)}>Cancel</button>
                <button className="jpb-btn jpb-btn-danger" onClick={handleCancelJob} disabled={!cancelReason}>Confirm Cancel</button>
              </div>
            </div>
          </div>
        )}
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
              if (isDirty && !window.confirm('Discard unsaved changes?')) return;
              setShowForm(false);
              setEditingId(null);
              setIsDirty(false);
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                width: '100%',
                padding: '8px 12px',
                marginTop: '12px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="frozen">Frozen Only</option>
              <option value="reposted">Reposted Only</option>
              <option value="cancelled">Cancelled Only</option>
            </select>
          </div>
          <div className="jpb-sidebar-list">
            {filteredPostings.length === 0 ? (
              <div className="jpb-empty-list">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
                <p>No {statusFilter === 'all' ? 'job' : statusFilter} postings {statusFilter === 'all' ? 'yet' : 'found'}</p>
                <span>{statusFilter === 'all' ? 'Create your first posting' : 'Try adjusting your filters'}</span>
              </div>
            ) : (
              filteredPostings.map(p => {
                const normalizedStatus = (p.status || '').toLowerCase();
                return (
                  <div
                    key={p.id}
                    className={`jpb-posting-card ${editingId === p.id ? 'active' : ''}`}
                    onClick={() => loadPosting(p)}
                  >
                    <div className="jpb-posting-card-top">
                      <h4>{p.job_title}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {p.status && <StatusBadge status={p.status} size="sm" />}
                      </div>
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
                    {/* Lifecycle Control Buttons */}
                    <div className="jpb-posting-card-actions" style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid #e5e7eb',
                      display: 'flex',
                      gap: '6px',
                      flexWrap: 'wrap',
                    }}>
                      {/* Duplicate button - always available */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicatePosting(p);
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          border: '1px solid #3b82f6',
                          backgroundColor: '#eff6ff',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          minWidth: 'fit-content',
                        }}
                        title="Duplicate this posting"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2"/>
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                        Duplicate
                      </button>

                      {normalizedStatus === 'cancelled' ? (
                        <div style={{
                          padding: '6px 8px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          backgroundColor: '#f3f4f6',
                          color: '#6b7280',
                          textAlign: 'center',
                          flex: 1,
                        }}>
                          Cancelled: {p.cancellation_reason}
                        </div>
                      ) : (
                        <>
                          {(normalizedStatus === 'active' || normalizedStatus === 'reposted') ? (
                            <>
                              <button
                                onClick={(e) => handleJobLifecycleAction(p.id, 'freeze', e)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  border: '1px solid #e5e7eb',
                                  backgroundColor: '#f9fafb',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  flex: 1,
                                  color: '#374151',
                                }}
                                title="Freeze this job posting"
                              >
                                Freeze
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowCancelModal(p.id);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  border: '1px solid #ef4444',
                                  backgroundColor: '#fef2f2',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  flex: 1,
                                }}
                                title="Cancel this job posting"
                              >
                                Cancel
                              </button>
                            </>
                          ) : normalizedStatus === 'frozen' ? (
                            <>
                              <button
                                onClick={(e) => handleJobLifecycleAction(p.id, 'reactivate', e)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  border: '1px solid #10b981',
                                  backgroundColor: '#d1fae5',
                                  color: '#10b981',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  flex: 1,
                                }}
                                title="Unfreeze this job posting"
                              >
                                Unfreeze
                              </button>
                              <button
                                onClick={(e) => handleJobLifecycleAction(p.id, 'repost', e)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  border: '1px solid #8b5cf6',
                                  backgroundColor: '#ede9fe',
                                  color: '#8b5cf6',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  flex: 1,
                                }}
                                title="Repost this job posting"
                              >
                                Repost
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowCancelModal(p.id);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  border: '1px solid #ef4444',
                                  backgroundColor: '#fef2f2',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  flex: 1,
                                }}
                                title="Cancel this job posting"
                              >
                                Cancel
                              </button>
                            </>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
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

                {/* Duplicate Mode Banner */}
                {isDirty && !editingId && formData.job_title.includes('(Copy)') && (
                  <div style={{
                    background: '#fffbeb',
                    border: '1px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    color: '#92400e'
                  }}>
                    📋 You're creating a <strong>duplicate</strong> — this will save as a new job posting.
                  </div>
                )}

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

                  {/* Dynamic 3-Tier Taxonomy Selection */}
                  <div className="jpb-field jpb-field-full">
                    <CascadingTaxonomySelect
                      selectedVendor={formData.product_vendor}
                      selectedProductType={formData.product_type}
                      selectedRole={formData.job_role}
                      onVendorChange={(name) => setFormData(prev => ({ ...prev, product_vendor: name, product_type: '', job_role: '' }))}
                      onProductTypeChange={(name) => setFormData(prev => ({ ...prev, product_type: name, job_role: '' }))}
                      onRoleChange={(name) => setFormData(prev => ({ ...prev, job_role: name }))}
                      required={true}
                      errors={{
                        vendor: errors.product_vendor,
                        productType: errors.job_category || errors.product_type,
                        role: errors.job_role,
                      }}
                    />
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

      {/* Cancel Job Confirmation Modal */}
      {showCancelModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 600, color: '#111827' }}>
              Cancel Job Posting?
            </h2>
            <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '14px' }}>
              This action is <strong>permanent</strong> and cannot be undone. The job will no longer accept applications.
            </p>

            {/* Reason Dropdown */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                Reason for cancellation *
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                }}
              >
                <option value="">Select a reason...</option>
                <option value="Position Filled">Position Filled</option>
                <option value="Budget Cut">Budget Cut</option>
                <option value="Requirements Changed">Requirements Changed</option>
                <option value="Company Restructuring">Company Restructuring</option>
                <option value="Other">Other (please specify)</option>
              </select>
            </div>

            {/* Custom Reason Textarea */}
            {cancelReason === 'Other' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                  Please specify reason *
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Brief explanation..."
                  maxLength={500}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
                <small style={{ fontSize: '11px', color: '#6b7280' }}>
                  {customReason.length}/500 characters
                </small>
              </div>
            )}

            {/* Info Box */}
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>
                What you'll still have access to:
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#15803d' }}>
                <li>All candidate matches and recommendations</li>
                <li>All applications received</li>
                <li>All notes and communications</li>
                <li>Historical data and analytics</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCancelModal(null);
                  setCancelReason('');
                  setCustomReason('');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Go Back
              </button>
              <button
                onClick={handleCancelJob}
                disabled={!cancelReason || (cancelReason === 'Other' && !customReason.trim())}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: cancelReason && (cancelReason !== 'Other' || customReason.trim()) ? '#ef4444' : '#d1d5db',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: cancelReason && (cancelReason !== 'Other' || customReason.trim()) ? 'pointer' : 'not-allowed',
                }}
              >
                Yes, Cancel Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobPostingBuilder;
