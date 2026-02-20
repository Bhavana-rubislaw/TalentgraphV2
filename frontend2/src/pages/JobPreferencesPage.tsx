import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import SkillsPicker, { SelectedSkill } from '../components/SkillsPicker';
import ResumeSelector, { ResumeOption } from '../components/ResumeSelector';
import CertificationsSelector, { CertOption } from '../components/CertificationsSelector';
import LivePreview from '../components/LivePreview';
import '../styles/CandidatePages.css';

/* ── SVG Icons ── */
const I = {
  briefcase: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  layout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  moreV: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  chevDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  chevUp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  mapPin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  dollar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  monitor: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  building: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  code: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  file: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  award: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  graduation: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  plane: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>,
  linkedin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>,
  github: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  twitter: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
};

/* ── Helpers ── */
const WORK_LABELS: Record<string, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' };
const EMP_LABELS: Record<string, string> = { ft: 'Full-Time', pt: 'Part-Time', contract: 'Contract', c2c: 'C2C', w2: 'W2' };
const VISA_LABELS: Record<string, string> = { us_citizen: 'US Citizen', us_green_card: 'Green Card', us_visa: 'US Visa', eu_citizen: 'EU Citizen', uk_citizen: 'UK Citizen', work_visa: 'Work Visa' };
const fmtSalary = (min: number, max: number, c: string) => { const u = (c||'usd').toUpperCase(); const f = (v: number) => v >= 1000 ? `${Math.round(v/1000)}k` : v.toLocaleString(); return `${u} ${f(min)} – ${f(max)}`; };

/* ── Interfaces ── */
interface LocationPref { city: string; state: string; country?: string; }

interface FormState {
  profile_name: string; product_vendor: string; product_type: string; job_role: string;
  years_of_experience: number; worktype: string; employment_type: string;
  salary_min: number; salary_max: number; salary_currency: string;
  resume_id: number | null; certification_ids: string; visa_status: string;
  ethnicity: string; availability_date: string; profile_summary: string;
  preferred_job_titles: string; job_category: string; seniority_level: string;
  travel_willingness: string; shift_preference: string;
  remote_acceptance: string; relocation_willingness: string;
  pay_type: string; negotiability: string;
  core_strengths: string; relevant_experience: number | null;
  notice_period: string; start_date_preference: string;
  security_clearance: string; highest_education: string;
  primary_resume_id: number | null; attached_resume_ids: string;
  linkedin_url: string; github_url: string; portfolio_url: string;
  twitter_url: string; website_url: string;
  skills: SelectedSkill[]; location_preferences: LocationPref[];
}

const EMPTY: FormState = {
  profile_name: '', product_vendor: 'Oracle', product_type: '', job_role: '',
  years_of_experience: 0, worktype: 'remote', employment_type: 'ft',
  salary_min: 0, salary_max: 0, salary_currency: 'usd',
  resume_id: null, certification_ids: '[]', visa_status: 'us_citizen',
  ethnicity: '', availability_date: '', profile_summary: '',
  preferred_job_titles: '[]', job_category: '[]', seniority_level: '',
  travel_willingness: 'none', shift_preference: 'flexible',
  remote_acceptance: 'fully_remote', relocation_willingness: 'depends',
  pay_type: 'annually', negotiability: 'negotiable',
  core_strengths: '[]', relevant_experience: null,
  notice_period: '', start_date_preference: '',
  security_clearance: 'none', highest_education: '',
  primary_resume_id: null, attached_resume_ids: '[]',
  linkedin_url: '', github_url: '', portfolio_url: '',
  twitter_url: '', website_url: '',
  skills: [], location_preferences: [],
};

/* ================================================================ */
const JobPreferencesPage: React.FC = () => {
  const navigate = useNavigate();

  /* ── state ── */
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [certifications, setCertifications] = useState<CertOption[]>([]);
  const [techCatalog, setTechCatalog] = useState<string[]>([]);
  const [softCatalog, setSoftCatalog] = useState<string[]>([]);

  // Accordion
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['role', 'work', 'location', 'comp', 'skills', 'exp', 'auth', 'edu', 'resume', 'socials']));
  // List view
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWork, setFilterWork] = useState<string | null>(null);
  const [expandedSkills, setExpandedSkills] = useState<Set<number>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Tag inputs
  const [titleInput, setTitleInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [strengthInput, setStrengthInput] = useState('');
  const [locInput, setLocInput] = useState<LocationPref>({ city: '', state: '', country: '' });

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastRef = useRef<any>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ message, type });
    toastRef.current = setTimeout(() => setToast(null), 3500);
  };

  /* ── fetch ── */
  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [profRes, resRes, certRes, catRes] = await Promise.all([
        apiClient.getJobProfiles(),
        apiClient.getResumes(),
        apiClient.getCertifications(),
        apiClient.getCandidateSkillCatalogs(),
      ]);
      setProfiles(profRes.data);
      setResumes(resRes.data);
      setCertifications(certRes.data);
      setTechCatalog(catRes.data.technical_skills || []);
      setSoftCatalog(catRes.data.soft_skills || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ── form helpers ── */
  const inp = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const numInp = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value === '' ? 0 : Number(value) }));
  };

  const jsonArr = (key: string): string[] => {
    try { return JSON.parse((form as any)[key] || '[]'); } catch { return []; }
  };

  const setJsonArr = (key: string, arr: string[]) => {
    setForm(prev => ({ ...prev, [key]: JSON.stringify(arr) }));
  };

  const addTag = (key: string, val: string, maxLen: number = 10) => {
    const arr = jsonArr(key);
    if (arr.length >= maxLen || arr.includes(val) || !val.trim()) return;
    setJsonArr(key, [...arr, val.trim()]);
  };

  const removeTag = (key: string, index: number) => {
    const arr = jsonArr(key);
    setJsonArr(key, arr.filter((_: string, i: number) => i !== index));
  };

  // Split skills into tech/soft
  const techSkills = form.skills.filter(s => s.skill_category === 'technical');
  const softSkills = form.skills.filter(s => s.skill_category === 'soft');
  const setTechSkills = (skills: SelectedSkill[]) => setForm(prev => ({ ...prev, skills: [...skills, ...prev.skills.filter(s => s.skill_category !== 'technical')] }));
  const setSoftSkills = (skills: SelectedSkill[]) => setForm(prev => ({ ...prev, skills: [...prev.skills.filter(s => s.skill_category !== 'soft'), ...skills] }));

  // Resume/cert IDs
  const certIds: number[] = (() => { try { return JSON.parse(form.certification_ids || '[]'); } catch { return []; } })();
  const setCertIds = (ids: number[]) => setForm(prev => ({ ...prev, certification_ids: JSON.stringify(ids) }));
  const attachedIds: number[] = (() => { try { return JSON.parse(form.attached_resume_ids || '[]'); } catch { return []; } })();
  const setAttachedIds = (ids: number[]) => setForm(prev => ({ ...prev, attached_resume_ids: JSON.stringify(ids) }));

  const addLocation = () => {
    if (!locInput.city.trim() || !locInput.state.trim()) return;
    if (form.location_preferences.length >= 5) return;
    setForm(prev => ({ ...prev, location_preferences: [...prev.location_preferences, { ...locInput }] }));
    setLocInput({ city: '', state: '', country: '' });
  };

  const removeLocation = (i: number) => {
    setForm(prev => ({ ...prev, location_preferences: prev.location_preferences.filter((_, j) => j !== i) }));
  };

  /* ── CRUD ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Merge primary_resume_id into resume_id for backward compat
    const payload = { ...form, resume_id: form.primary_resume_id };
    try {
      if (editingId) {
        await apiClient.updateJobProfile(editingId, payload);
        showToast('Preference updated');
      } else {
        await apiClient.createJobProfile(payload);
        showToast('Preference created');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...EMPTY });
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to save', 'error');
    }
  };

  const handleSaveAsNew = async () => {
    const payload = { ...form, resume_id: form.primary_resume_id };
    try {
      await apiClient.createJobProfile(payload);
      showToast('Saved as new preference');
      setShowForm(false);
      setEditingId(null);
      setForm({ ...EMPTY });
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to save', 'error');
    }
  };

  const startEdit = (p: any) => {
    const allSkills = (p.skills || []).map((s: any) => ({
      skill_name: s.skill_name, skill_category: s.skill_category, proficiency_level: s.proficiency_level
    }));
    setForm({
      ...EMPTY,
      ...p,
      skills: allSkills,
      location_preferences: (p.location_preferences || []).map((l: any) => ({ city: l.city, state: l.state, country: l.country })),
      certification_ids: p.certification_ids || '[]',
      preferred_job_titles: p.preferred_job_titles || '[]',
      job_category: p.job_category || '[]',
      core_strengths: p.core_strengths || '[]',
      attached_resume_ids: p.attached_resume_ids || '[]',
      primary_resume_id: p.primary_resume_id || p.resume_id || null,
    });
    setEditingId(p.id);
    setShowForm(true);
    setOpenMenuId(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await apiClient.deleteJobProfile(deleteTarget.id);
      showToast('Preference deleted');
      fetchAll();
    } catch {
      showToast('Delete failed', 'error');
    }
    setDeleteTarget(null);
  };

  const openNew = () => { setForm({ ...EMPTY }); setEditingId(null); setShowForm(true); };

  /* ── filter ── */
  const filtered = profiles.filter(p => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (![p.profile_name, p.job_role, p.product_vendor, p.product_type].some((v: string) => v?.toLowerCase().includes(q))) return false;
    }
    if (filterWork && p.worktype !== filterWork) return false;
    return true;
  });

  /* ── accordion toggle ── */
  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  /* ── Proficiency Dots ── */
  const Dots = ({ level }: { level: number }) => (
    <span className="cp-level">{[1,2,3,4,5].map(i => <span key={i} className={`cp-level-dot ${i <= level ? 'filled' : ''}`}/>)}</span>
  );

  /* ================================================================
     RENDER — CARD (LIST VIEW)
     ================================================================ */
  const renderCard = (p: any) => {
    const expanded = expandedSkills.has(p.id);
    const sk = p.skills || [];
    const locs = p.location_preferences || [];
    const vis = sk.length > 4 && !expanded ? sk.slice(0, 4) : sk;
    return (
      <div key={p.id} className="cp-card">
        <div className="cp-card-header">
          <div className="cp-card-header-left">
            <h3 className="cp-card-title">{p.profile_name}</h3>
            <p className="cp-card-subtitle">{p.product_vendor} · {p.product_type}{p.seniority_level ? ` · ${p.seniority_level}` : ''}</p>
          </div>
          <div className="cp-card-header-right">
            {p.updated_at && <span className="cp-card-date">Updated {new Date(p.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
            <div className="cp-kebab">
              <button className="cp-kebab-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === p.id ? null : p.id); }} aria-label="Actions">{I.moreV}</button>
              {openMenuId === p.id && (
                <div className="cp-kebab-menu" onClick={(e) => e.stopPropagation()}>
                  <button className="cp-kebab-item" onClick={() => startEdit(p)}>{I.edit} Edit</button>
                  <button className="cp-kebab-item" onClick={() => { setForm({ ...EMPTY, ...p, skills: (p.skills||[]).map((s:any)=>({skill_name:s.skill_name,skill_category:s.skill_category,proficiency_level:s.proficiency_level})), location_preferences: (p.location_preferences||[]).map((l:any)=>({city:l.city,state:l.state,country:l.country})) }); setEditingId(null); setShowForm(true); setOpenMenuId(null); }}>{I.copy} Duplicate</button>
                  <button className="cp-kebab-item danger" onClick={() => { setDeleteTarget(p); setOpenMenuId(null); }}>{I.trash} Delete</button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="cp-card-body">
          <div className="cp-meta-grid">
            <div className="cp-meta-group"><span className="cp-meta-label">Role</span><span className="cp-meta-value">{p.job_role}</span></div>
            <div className="cp-meta-group"><span className="cp-meta-label">Experience</span><span className="cp-meta-value">{p.years_of_experience} yrs{p.relevant_experience ? ` (${p.relevant_experience} relevant)` : ''}</span></div>
            <div className="cp-meta-group"><span className="cp-meta-label">Work Type</span>
              <div className="cp-chips">
                <span className="cp-chip cp-chip-accent">{WORK_LABELS[p.worktype] || p.worktype}</span>
                <span className="cp-chip cp-chip-default">{EMP_LABELS[p.employment_type] || p.employment_type}</span>
              </div>
            </div>
            <div className="cp-meta-group"><span className="cp-meta-label">Compensation</span><span className="cp-meta-value">{fmtSalary(p.salary_min, p.salary_max, p.salary_currency)}{p.pay_type ? ` (${p.pay_type})` : ''}</span></div>
            {locs.length > 0 && (
              <div className="cp-meta-group" style={{ gridColumn: '1 / -1' }}><span className="cp-meta-label">Location</span>
                <div className="cp-chips">{locs.map((l: any, i: number) => <span key={i} className="cp-chip cp-chip-green">{l.city}, {l.state}</span>)}</div>
              </div>
            )}
            <div className="cp-meta-group"><span className="cp-meta-label">Visa</span><span className="cp-meta-value">{VISA_LABELS[p.visa_status] || p.visa_status}</span></div>
            {(p.linkedin_url || p.github_url || p.portfolio_url || p.twitter_url || p.website_url) && (
              <div className="cp-meta-group" style={{ gridColumn: '1 / -1' }}><span className="cp-meta-label">Socials</span>
                <div className="cp-social-links">
                  {p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer" className="cp-social-link linkedin" title="LinkedIn">{I.linkedin}</a>}
                  {p.github_url && <a href={p.github_url} target="_blank" rel="noopener noreferrer" className="cp-social-link github" title="GitHub">{I.github}</a>}
                  {p.portfolio_url && <a href={p.portfolio_url} target="_blank" rel="noopener noreferrer" className="cp-social-link portfolio" title="Portfolio">{I.globe}</a>}
                  {p.twitter_url && <a href={p.twitter_url} target="_blank" rel="noopener noreferrer" className="cp-social-link twitter" title="Twitter / X">{I.twitter}</a>}
                  {p.website_url && <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="cp-social-link website" title="Website">{I.globe}</a>}
                </div>
              </div>
            )}
          </div>
        </div>
        {sk.length > 0 && (
          <div className="cp-skills-row">
            <div className="cp-skills-label">Skills ({sk.length})</div>
            <div className="cp-chips">{vis.map((s: any, i: number) => <span key={i} className="cp-chip cp-chip-default">{s.skill_name} <Dots level={s.proficiency_level} /></span>)}</div>
            {sk.length > 4 && <button className="cp-show-toggle" onClick={() => { const n = new Set(expandedSkills); expanded ? n.delete(p.id) : n.add(p.id); setExpandedSkills(n); }}>{expanded ? <>Show less {I.chevUp}</> : <>+{sk.length-4} more {I.chevDown}</>}</button>}
          </div>
        )}
        <div className="cp-card-footer">
          <button className="cp-btn cp-btn-outline cp-btn-sm" onClick={() => startEdit(p)}>{I.edit} Edit</button>
          <button className="cp-btn cp-btn-danger-outline cp-btn-sm" onClick={() => setDeleteTarget(p)}>{I.trash} Delete</button>
        </div>
      </div>
    );
  };

  /* ================================================================
     ACCORDION SECTION WRAPPER
     ================================================================ */
  const Section = ({ id, icon, title, children }: { id: string; icon: JSX.Element; title: string; children: React.ReactNode }) => {
    const isOpen = openSections.has(id);
    return (
      <div className={`cp-accordion-section ${isOpen ? 'open' : ''}`}>
        <button type="button" className="cp-accordion-header" onClick={() => toggleSection(id)}>
          <span className="cp-accordion-icon">{icon}</span>
          <span className="cp-accordion-title">{title}</span>
          <span className="cp-accordion-chevron">{isOpen ? I.chevUp : I.chevDown}</span>
        </button>
        {isOpen && <div className="cp-accordion-body">{children}</div>}
      </div>
    );
  };

  /* ================================================================
     RENDER — FORM
     ================================================================ */
  const renderForm = () => (
    <div className="cp-split-layout">
      {/* LEFT: Form */}
      <div className="cp-split-form">
        <form onSubmit={handleSubmit}>
          <div className="cp-form-container" style={{ marginBottom: 0 }}>

            {/* S1: Role & Domain */}
            <Section id="role" icon={I.briefcase} title="Role & Domain Preferences">
              <div className="cp-form-group">
                <label className="required">Profile Name</label>
                <input type="text" name="profile_name" value={form.profile_name} onChange={inp} placeholder="e.g., Oracle Cloud Senior Developer" required />
                <span className="cp-helper-text">A unique name for this preference</span>
              </div>
              <div className="cp-form-grid-2">
                <div className="cp-form-group">
                  <label className="required">Product Vendor</label>
                  <select name="product_vendor" value={form.product_vendor} onChange={inp} required>
                    <option value="Oracle">Oracle</option><option value="SAP">SAP</option><option value="Salesforce">Salesforce</option><option value="Microsoft">Microsoft</option>
                  </select>
                </div>
                <div className="cp-form-group">
                  <label className="required">Product Type</label>
                  <input type="text" name="product_type" value={form.product_type} onChange={inp} placeholder="e.g., ERP Cloud, HCM" required />
                </div>
              </div>
              <div className="cp-form-grid-2">
                <div className="cp-form-group">
                  <label className="required">Job Role</label>
                  <input type="text" name="job_role" value={form.job_role} onChange={inp} placeholder="e.g., Senior Developer" required />
                </div>
                <div className="cp-form-group">
                  <label>Seniority Level</label>
                  <select name="seniority_level" value={form.seniority_level} onChange={inp}>
                    <option value="">Select...</option>
                    {['entry','junior','mid','senior','lead','manager'].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              {/* Preferred Job Titles — tag input */}
              <div className="cp-form-group">
                <label>Preferred Job Titles</label>
                <div className="cp-tag-input-wrap">
                  <input type="text" value={titleInput} onChange={(e) => setTitleInput(e.target.value)} placeholder="Type title + Enter" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag('preferred_job_titles', titleInput); setTitleInput(''); } }} />
                </div>
                <div className="cp-tag-list">{jsonArr('preferred_job_titles').map((t, i) => <span key={i} className="cp-chip cp-chip-accent">{t}<button type="button" onClick={() => removeTag('preferred_job_titles', i)}>{I.x}</button></span>)}</div>
              </div>
              {/* Job Category — tag input */}
              <div className="cp-form-group">
                <label>Job Category / Domain</label>
                <div className="cp-tag-input-wrap">
                  <input type="text" value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)} placeholder="Type category + Enter" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag('job_category', categoryInput); setCategoryInput(''); } }} />
                </div>
                <div className="cp-tag-list">{jsonArr('job_category').map((c, i) => <span key={i} className="cp-chip cp-chip-default">{c}<button type="button" onClick={() => removeTag('job_category', i)}>{I.x}</button></span>)}</div>
              </div>
            </Section>

            {/* S2: Employment & Work Style */}
            <Section id="work" icon={I.monitor} title="Employment Type & Work Style">
              <div className="cp-form-group">
                <label className="required">Work Mode</label>
                <div className="cp-radio-grid">
                  {([['remote','Remote',I.home],['hybrid','Hybrid',I.monitor],['onsite','On-site',I.building]] as [string,string,JSX.Element][]).map(([v,l,ic]) => (
                    <div key={v} className="cp-radio-card"><input type="radio" id={`wt-${v}`} name="worktype" value={v} checked={form.worktype===v} onChange={inp} /><label htmlFor={`wt-${v}`}>{ic} {l}</label></div>
                  ))}
                </div>
              </div>
              <div className="cp-form-group">
                <label className="required">Employment Type</label>
                <div className="cp-radio-grid">
                  {([['ft','Full-Time'],['pt','Part-Time'],['contract','Contract'],['c2c','C2C'],['w2','W2']] as [string,string][]).map(([v,l]) => (
                    <div key={v} className="cp-radio-card"><input type="radio" id={`et-${v}`} name="employment_type" value={v} checked={form.employment_type===v} onChange={inp} /><label htmlFor={`et-${v}`}>{I.clock} {l}</label></div>
                  ))}
                </div>
              </div>
              <div className="cp-form-grid-2">
                <div className="cp-form-group">
                  <label>Travel Willingness</label>
                  <select name="travel_willingness" value={form.travel_willingness} onChange={inp}>
                    <option value="none">None</option><option value="occasional">Occasional</option><option value="frequent">Frequent</option>
                  </select>
                </div>
                <div className="cp-form-group">
                  <label>Shift Preference</label>
                  <select name="shift_preference" value={form.shift_preference} onChange={inp}>
                    <option value="day">Day</option><option value="night">Night</option><option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>
            </Section>

            {/* S3: Location */}
            <Section id="location" icon={I.mapPin} title="Location Preferences">
              <div className="cp-form-grid-2">
                <div className="cp-form-group">
                  <label>Remote Acceptance</label>
                  <select name="remote_acceptance" value={form.remote_acceptance} onChange={inp}>
                    <option value="fully_remote">Fully Remote</option>
                    <option value="remote_country">Remote within Country</option>
                    <option value="remote_anywhere">Remote Anywhere</option>
                  </select>
                </div>
                <div className="cp-form-group">
                  <label>Relocation Willingness</label>
                  <select name="relocation_willingness" value={form.relocation_willingness} onChange={inp}>
                    <option value="yes">Yes</option><option value="no">No</option><option value="depends">Depends on Offer</option>
                  </select>
                </div>
              </div>
              <div className="cp-form-group">
                <label>Preferred Locations <span className="cp-count-badge">{form.location_preferences.length}/5</span></label>
                <div className="cp-form-grid-3">
                  <input type="text" value={locInput.city} onChange={e => setLocInput(p => ({ ...p, city: e.target.value }))} placeholder="City" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLocation(); } }} />
                  <input type="text" value={locInput.state} onChange={e => setLocInput(p => ({ ...p, state: e.target.value }))} placeholder="State" />
                  <input type="text" value={locInput.country || ''} onChange={e => setLocInput(p => ({ ...p, country: e.target.value }))} placeholder="Country (opt)" />
                </div>
                <button type="button" className="cp-btn cp-btn-outline cp-btn-sm" style={{ marginTop: 8 }} onClick={addLocation} disabled={form.location_preferences.length >= 5}>{I.plus} Add Location</button>
              </div>
              {form.location_preferences.length > 0 && (
                <div className="cp-location-tags">{form.location_preferences.map((l, i) => (
                  <span key={i} className="cp-location-tag">{I.mapPin} {l.city}, {l.state}{l.country ? `, ${l.country}` : ''}<button type="button" onClick={() => removeLocation(i)}>{I.x}</button></span>
                ))}</div>
              )}
            </Section>

            {/* S4: Compensation */}
            <Section id="comp" icon={I.dollar} title="Compensation Expectations">
              <div className="cp-form-grid-3">
                <div className="cp-form-group">
                  <label className="required">Currency</label>
                  <select name="salary_currency" value={form.salary_currency} onChange={inp} required>
                    <option value="usd">USD</option><option value="gbp">GBP</option><option value="eur">EUR</option>
                  </select>
                </div>
                <div className="cp-form-group">
                  <label className="required">Minimum</label>
                  <input type="number" name="salary_min" value={form.salary_min || ''} onChange={e => numInp('salary_min', e.target.value)} min="0" placeholder="80000" required />
                </div>
                <div className="cp-form-group">
                  <label className="required">Maximum</label>
                  <input type="number" name="salary_max" value={form.salary_max || ''} onChange={e => numInp('salary_max', e.target.value)} min="0" placeholder="140000" required />
                </div>
              </div>
              <div className="cp-form-grid-2">
                <div className="cp-form-group">
                  <label>Pay Type</label>
                  <div className="cp-radio-grid">
                    {(['hourly','annually'] as const).map(v => (
                      <div key={v} className="cp-radio-card"><input type="radio" id={`pt-${v}`} name="pay_type" value={v} checked={form.pay_type===v} onChange={inp} /><label htmlFor={`pt-${v}`}>{v.charAt(0).toUpperCase()+v.slice(1)}</label></div>
                    ))}
                  </div>
                </div>
                <div className="cp-form-group">
                  <label>Negotiability</label>
                  <select name="negotiability" value={form.negotiability} onChange={inp}>
                    <option value="fixed">Fixed</option><option value="negotiable">Negotiable</option><option value="depends">Depends on Role</option>
                  </select>
                </div>
              </div>
            </Section>

            {/* S5: Skills */}
            <Section id="skills" icon={I.code} title="Skills & Expertise">
              <SkillsPicker catalog={techCatalog} category="technical" selected={techSkills} onChange={setTechSkills} label="Technical Skills" />
              <div style={{ height: 20 }} />
              <SkillsPicker catalog={softCatalog} category="soft" selected={softSkills} onChange={setSoftSkills} label="Soft Skills" />
              <div style={{ height: 20 }} />
              <div className="cp-form-group">
                <label>Core Strengths (2-5)</label>
                <div className="cp-tag-input-wrap">
                  <input type="text" value={strengthInput} onChange={e => setStrengthInput(e.target.value)} placeholder="Type strength + Enter" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('core_strengths', strengthInput, 5); setStrengthInput(''); } }} />
                </div>
                <div className="cp-tag-list">{jsonArr('core_strengths').map((s, i) => <span key={i} className="cp-chip cp-chip-accent">{s}<button type="button" onClick={() => removeTag('core_strengths', i)}>{I.x}</button></span>)}</div>
              </div>
            </Section>

            {/* S6: Experience & Availability */}
            <Section id="exp" icon={I.calendar} title="Experience & Availability">
              <div className="cp-form-grid-2">
                <div className="cp-form-group">
                  <label className="required">Total Years of Experience</label>
                  <input type="number" name="years_of_experience" value={form.years_of_experience || ''} onChange={e => numInp('years_of_experience', e.target.value)} min="0" required />
                </div>
                <div className="cp-form-group">
                  <label>Relevant Experience</label>
                  <input type="number" value={form.relevant_experience || ''} onChange={e => setForm(prev => ({ ...prev, relevant_experience: e.target.value ? Number(e.target.value) : null }))} min="0" />
                </div>
              </div>
              <div className="cp-form-grid-2">
                <div className="cp-form-group">
                  <label>Notice Period</label>
                  <select name="notice_period" value={form.notice_period} onChange={inp}>
                    <option value="">Select...</option>
                    <option value="immediate">Immediate</option><option value="2weeks">2 Weeks</option><option value="1month">1 Month</option><option value="2months">2 Months</option><option value="3months">3 Months</option>
                  </select>
                </div>
                <div className="cp-form-group">
                  <label>Start Date Preference</label>
                  <input type="date" name="start_date_preference" value={form.start_date_preference} onChange={inp} />
                </div>
              </div>
              <div className="cp-form-group">
                <label>Availability Date</label>
                <input type="date" name="availability_date" value={form.availability_date} onChange={inp} />
              </div>
            </Section>

            {/* S7: Authorization */}
            <Section id="auth" icon={I.shield} title="Authorization & Compliance">
              <div className="cp-form-grid-2">
                <div className="cp-form-group">
                  <label className="required">Visa / Work Authorization</label>
                  <select name="visa_status" value={form.visa_status} onChange={inp} required>
                    <option value="us_citizen">US Citizen</option><option value="us_green_card">Green Card</option><option value="us_visa">US Visa (H1B/OPT/CPT)</option><option value="eu_citizen">EU Citizen</option><option value="uk_citizen">UK Citizen</option><option value="work_visa">Work Visa / Sponsorship Required</option>
                  </select>
                </div>
                <div className="cp-form-group">
                  <label>Security Clearance</label>
                  <select name="security_clearance" value={form.security_clearance} onChange={inp}>
                    <option value="none">None</option><option value="eligible">Eligible</option><option value="active">Active</option>
                  </select>
                </div>
              </div>
              <div className="cp-form-group">
                <label>Ethnicity (Optional)</label>
                <input type="text" name="ethnicity" value={form.ethnicity} onChange={inp} placeholder="Optional" />
              </div>
            </Section>

            {/* S8: Education & Credentials */}
            <Section id="edu" icon={I.graduation} title="Education & Credentials">
              <div className="cp-form-group">
                <label>Highest Education Level</label>
                <select name="highest_education" value={form.highest_education} onChange={inp}>
                  <option value="">Select...</option>
                  <option value="high_school">High School</option><option value="associate">Associate Degree</option><option value="bachelor">Bachelor's Degree</option><option value="master">Master's Degree</option><option value="doctorate">Doctorate</option>
                </select>
              </div>
              <div className="cp-form-group">
                <label>Certifications from Profile</label>
                <CertificationsSelector certifications={certifications} selectedIds={certIds} onChange={setCertIds} />
              </div>
            </Section>

            {/* S9: Resume */}
            <Section id="resume" icon={I.file} title="Resume Attachment">
              <ResumeSelector
                resumes={resumes}
                primaryResumeId={form.primary_resume_id}
                attachedResumeIds={attachedIds}
                onPrimaryChange={(id) => setForm(prev => ({ ...prev, primary_resume_id: id }))}
                onAttachedChange={setAttachedIds}
              />
            </Section>

            {/* S10: Socials / Hyperlinks */}
            <Section id="socials" icon={I.link} title="Social & Web Links">
              <div className="cp-form-grid-2">
                <div className="cp-form-group">
                  <label><span className="cp-social-icon">{I.linkedin}</span> LinkedIn</label>
                  <input type="url" name="linkedin_url" value={form.linkedin_url} onChange={inp} placeholder="https://linkedin.com/in/your-profile" />
                </div>
                <div className="cp-form-group">
                  <label><span className="cp-social-icon">{I.github}</span> GitHub</label>
                  <input type="url" name="github_url" value={form.github_url} onChange={inp} placeholder="https://github.com/username" />
                </div>
              </div>
              <div className="cp-form-grid-2">
                <div className="cp-form-group">
                  <label><span className="cp-social-icon">{I.globe}</span> Portfolio</label>
                  <input type="url" name="portfolio_url" value={form.portfolio_url} onChange={inp} placeholder="https://your-portfolio.com" />
                </div>
                <div className="cp-form-group">
                  <label><span className="cp-social-icon">{I.twitter}</span> Twitter / X</label>
                  <input type="url" name="twitter_url" value={form.twitter_url} onChange={inp} placeholder="https://x.com/handle" />
                </div>
              </div>
              <div className="cp-form-group">
                <label><span className="cp-social-icon">{I.globe}</span> Personal Website</label>
                <input type="url" name="website_url" value={form.website_url} onChange={inp} placeholder="https://your-website.com" />
              </div>
              <span className="cp-helper-text">Add social links to help recruiters learn more about you. Links will appear as clickable icons on your preference card.</span>
            </Section>

            {/* Summary */}
            <div className="cp-form-section">
              <div className="cp-form-group">
                <label>Profile Summary</label>
                <textarea name="profile_summary" value={form.profile_summary} onChange={inp} rows={4} placeholder="Describe what makes you a great fit..." />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="cp-form-footer" style={{ borderRadius: '0 0 var(--cp-radius-lg) var(--cp-radius-lg)' }}>
            <button type="button" className="cp-btn cp-btn-outline" onClick={() => { setShowForm(false); setEditingId(null); setForm({ ...EMPTY }); }}>Cancel</button>
            {editingId && <button type="button" className="cp-btn cp-btn-outline" onClick={handleSaveAsNew}>{I.copy} Save as New</button>}
            <button type="submit" className="cp-btn cp-btn-primary cp-btn-lg">{editingId ? 'Update Preference' : 'Save Preference'}</button>
          </div>
        </form>
      </div>

      {/* RIGHT: Live Preview */}
      <div className="cp-split-preview">
        <LivePreview
          formData={form}
          technicalSkills={techSkills}
          softSkills={softSkills}
          resumes={resumes}
          certifications={certifications}
          selectedCertIds={certIds}
          primaryResumeId={form.primary_resume_id}
          attachedResumeIds={attachedIds}
        />
      </div>
    </div>
  );

  /* ================================================================
     SKELETONS
     ================================================================ */
  const renderSkeletons = () => (
    <div className="cp-card-list">{[1,2,3].map(i => (
      <div key={i} className="cp-skeleton-card">
        <div className="cp-skeleton-line h20 w60" /><div className="cp-skeleton-line w40" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <div><div className="cp-skeleton-line w30" /><div className="cp-skeleton-line w60" /></div>
          <div><div className="cp-skeleton-line w30" /><div className="cp-skeleton-line w60" /></div>
        </div>
        <div className="cp-skeleton-chips"><div className="cp-skeleton-chip" /><div className="cp-skeleton-chip" /><div className="cp-skeleton-chip" /></div>
      </div>
    ))}</div>
  );

  /* ================================================================
     MAIN RENDER
     ================================================================ */
  return (
    <div className="cp-page">
      <div className="cp-header">
        <div className="cp-header-inner">
          <div className="cp-header-left">
            <h1 className="cp-header-title">Job Preferences</h1>
            <p className="cp-header-subtitle">{showForm ? (editingId ? 'Edit your job preference' : 'Create a new job preference') : 'Manage your job preference profiles'}</p>
          </div>
          <div className="cp-header-actions">
            <button className="cp-btn cp-btn-outline" onClick={() => navigate('/candidate/profile')}>{I.user} Profile</button>
            <button className="cp-btn cp-btn-outline" onClick={() => navigate('/candidate-dashboard')}>{I.layout} Dashboard</button>
            {!showForm && <button className="cp-btn cp-btn-primary" onClick={openNew}>{I.plus} Add Preference</button>}
          </div>
        </div>
      </div>

      <div className="cp-content">
        {showForm ? renderForm() : (
          <>
            {profiles.length > 0 && (
              <div className="cp-filter-bar">
                <div className="cp-search-box">{I.search}<input type="text" placeholder="Search by title, role, vendor..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                <div className="cp-filter-chips">
                  {['remote','hybrid','onsite'].map(w => <button key={w} className={`cp-filter-chip ${filterWork===w?'active':''}`} onClick={() => setFilterWork(filterWork===w?null:w)}>{WORK_LABELS[w]}</button>)}
                </div>
              </div>
            )}
            {loading ? renderSkeletons()
            : filtered.length === 0 && profiles.length === 0 ? (
              <div className="cp-empty-state">
                <svg className="cp-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
                <h3 className="cp-empty-title">No job preferences yet</h3>
                <p className="cp-empty-text">Create your first job preference to start matching with relevant opportunities.</p>
                <button className="cp-btn cp-btn-primary cp-btn-lg" onClick={openNew}>{I.plus} Create First Preference</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="cp-empty-state">
                <h3 className="cp-empty-title">No matching preferences</h3>
                <p className="cp-empty-text">Try adjusting your search or filters.</p>
                <button className="cp-btn cp-btn-outline" onClick={() => { setSearchQuery(''); setFilterWork(null); }}>Clear Filters</button>
              </div>
            ) : (
              <div className="cp-card-list">{filtered.map(renderCard)}</div>
            )}
          </>
        )}
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="cp-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-icon">{I.alert}</div>
            <h3>Delete this preference?</h3>
            <p>This action cannot be undone.</p>
            <div className="cp-modal-preview">{deleteTarget.profile_name}</div>
            <div className="cp-modal-actions">
              <button className="cp-btn cp-btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="cp-btn cp-btn-danger" onClick={confirmDelete}>{I.trash} Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`cp-toast ${toast.type}`}>{toast.type === 'success' ? I.check : I.alert}{toast.message}</div>}
    </div>
  );
};

export default JobPreferencesPage;
