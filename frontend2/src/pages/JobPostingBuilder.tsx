import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import '../styles/JobPostingBuilder.css';
import type { JobPostingFormData, JobPosting, Catalogs } from '../types/jobPostingBuilderTypes';
import { EMPLOYMENT_TYPES } from '../constants/jobPostingBuilderConstants';
import JobPostingListView from '../components/jobPostingBuilder/JobPostingListView';
import JobPostingFormView from '../components/jobPostingBuilder/JobPostingFormView';

// ============ CONSTANTS ============
// NOTE: dropdown option lists (SENIORITY_LEVELS, TRAVEL_OPTIONS, VISA_OPTIONS,
// EDUCATION_OPTIONS) live in constants/jobPostingBuilder.ts and are only
// referenced by JobPostingFormView now. EMPLOYMENT_TYPES is imported above
// since empTypeLabel() below still needs it.

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

// NOTE: Product taxonomy (vendors, product types, roles) now loaded dynamically from database
// The hardcoded PRODUCT_VENDORS and ORACLE_PRODUCTS constants have been removed
// Use CascadingTaxonomySelect component for vendor/product/role selection


const JobPostingBuilder: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [catalogs, setCatalogs] = useState<Catalogs>({ technical_skills: [], soft_skills: [], certifications: [] });
  const [globalCatalogs, setGlobalCatalogs] = useState<Catalogs>({ technical_skills: [], soft_skills: [], certifications: [] });
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [formData, setFormData] = useState<JobPostingFormData>({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'frozen' | 'cancelled'>('all');
  const [showPreview, setShowPreview] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPostingId, setSelectedPostingId] = useState<number | null>(null);
  
  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const PAGE_SIZE_POSTINGS = 9;
  const [currentPostPage, setCurrentPostPage] = useState(1);
  const [cardMenuOpenId, setCardMenuOpenId] = useState<number | null>(null);

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
      setGlobalCatalogs(res.data);
    } catch (err) {
      console.error('Failed to fetch catalogs:', err);
    }
  }, []);

  // Fetch role-specific skills when selected role changes
  useEffect(() => {
    if (!selectedRoleId) {
      setCatalogs(globalCatalogs);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.getRoleSkills(selectedRoleId);
        if (cancelled) return;
        const roleSkills: Array<{ name: string; category: string }> = res.data.skills;
        if (roleSkills.length === 0) {
          // No role-specific skills — fall back to global catalog
          setCatalogs(globalCatalogs);
          return;
        }
        setCatalogs({
          technical_skills: roleSkills
            .filter(s => s.category === 'technical' || s.category === 'functional')
            .map(s => s.name),
          soft_skills: roleSkills
            .filter(s => s.category === 'soft')
            .map(s => s.name),
          certifications: globalCatalogs.certifications,
        });
      } catch {
        if (!cancelled) setCatalogs(globalCatalogs);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const [postRes] = await Promise.all([
        apiClient.getJobPostings(false),
        fetchCatalogs()
      ]);
      const fetchedPostings: JobPosting[] = postRes.data || [];
      setPostings(fetchedPostings);
      // Check for ?duplicate= URL param — pre-fill form as a copy
      const params = new URLSearchParams(window.location.search);
      const dupId = params.get('duplicate');
      if (dupId) {
        const source = fetchedPostings.find((p: JobPosting) => p.id === parseInt(dupId, 10));
        if (source) {
          handleDuplicatePosting(source);
          setShowForm(true);
        }
      }
      // Check for ?edit= URL param — load posting for editing
      const editId = params.get('edit');
      if (!dupId && editId) {
        const source = fetchedPostings.find((p: JobPosting) => p.id === parseInt(editId, 10));
        if (source) {
          loadPosting(source);
        }
      }
      setLoading(false);
    };
    init();
  }, [fetchCatalogs]);

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
    if (cardMenuOpenId === null) return;
    const handler = () => setCardMenuOpenId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [cardMenuOpenId]);

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
    // Resolve role ID from name so role-specific skills load automatically
    if (posting.job_role) {
      apiClient.searchTaxonomy(posting.job_role, 10).then(res => {
        const match = (res.data.roles as Array<{ id: number; name: string }>)
          .find(r => r.name === posting.job_role);
        if (match) setSelectedRoleId(match.id);
      }).catch(() => { /* fallback: global catalog */ });
    } else {
      setSelectedRoleId(null);
    }
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
    setFormData({ ...EMPTY_FORM });
    savedFormRef.current = JSON.stringify(EMPTY_FORM);
    setEditingId(null);
    setSelectedRoleId(null);
    setIsDirty(false);
    setErrors({});
    setShowForm(true);
  };

  const handleJobLifecycleAction = async (jobId: number, action: 'freeze' | 'reactivate', e: React.MouseEvent) => {
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



  if (!showForm) {
    return (
      <JobPostingListView
        toast={toast}
        listSearch={listSearch}
        setListSearch={setListSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        selectedPostingId={selectedPostingId}
        setSelectedPostingId={setSelectedPostingId}
        showCancelModal={showCancelModal}
        setShowCancelModal={setShowCancelModal}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        customReason={customReason}
        setCustomReason={setCustomReason}
        currentPostPage={currentPostPage}
        setCurrentPostPage={setCurrentPostPage}
        cardMenuOpenId={cardMenuOpenId}
        setCardMenuOpenId={setCardMenuOpenId}
        navigate={navigate}
        PAGE_SIZE_POSTINGS={PAGE_SIZE_POSTINGS}
        loadPosting={loadPosting}
        handleDuplicatePosting={handleDuplicatePosting}
        handleNewPosting={handleNewPosting}
        handleJobLifecycleAction={handleJobLifecycleAction}
        handleCancelJob={handleCancelJob}
        filteredPostings={filteredPostings}
        totalPostPages={totalPostPages}
        paginatedPostings={paginatedPostings}
        getPostPageNumbers={getPostPageNumbers}
        setShowForm={setShowForm}
      />
    );
  }

  return (
    <JobPostingFormView
      postings={postings}
      formData={formData}
      setFormData={setFormData}
      editingId={editingId}
      setEditingId={setEditingId}
      saving={saving}
      isDirty={isDirty}
      setIsDirty={setIsDirty}
      toast={toast}
      listSearch={listSearch}
      setListSearch={setListSearch}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      showPreview={showPreview}
      setShowPreview={setShowPreview}
      setShowForm={setShowForm}
      showCancelModal={showCancelModal}
      setShowCancelModal={setShowCancelModal}
      cancelReason={cancelReason}
      setCancelReason={setCancelReason}
      customReason={customReason}
      setCustomReason={setCustomReason}
      skillSearchTech={skillSearchTech}
      setSkillSearchTech={setSkillSearchTech}
      skillSearchSoft={skillSearchSoft}
      setSkillSearchSoft={setSkillSearchSoft}
      showTechDropdown={showTechDropdown}
      setShowTechDropdown={setShowTechDropdown}
      showSoftDropdown={showSoftDropdown}
      setShowSoftDropdown={setShowSoftDropdown}
      certSearch={certSearch}
      setCertSearch={setCertSearch}
      showCertDropdown={showCertDropdown}
      setShowCertDropdown={setShowCertDropdown}
      errors={errors}
      setSelectedRoleId={setSelectedRoleId}
      formRef={formRef}
      techDropdownRef={techDropdownRef}
      softDropdownRef={softDropdownRef}
      certDropdownRef={certDropdownRef}
      userName={userName}
      handleInputChange={handleInputChange}
      handleSave={handleSave}
      loadPosting={loadPosting}
      handleDuplicatePosting={handleDuplicatePosting}
      handleNewPosting={handleNewPosting}
      handleJobLifecycleAction={handleJobLifecycleAction}
      handleCancelJob={handleCancelJob}
      addSkill={addSkill}
      removeSkill={removeSkill}
      updateSkillRating={updateSkillRating}
      addCertification={addCertification}
      removeCertification={removeCertification}
      filteredTechSkills={filteredTechSkills}
      filteredSoftSkills={filteredSoftSkills}
      filteredCerts={filteredCerts}
      filteredPostings={filteredPostings}
      formatSalary={formatSalary}
      empTypeLabel={empTypeLabel}
      worktypeLabel={worktypeLabel}
    />
  );
};

export default JobPostingBuilder;
