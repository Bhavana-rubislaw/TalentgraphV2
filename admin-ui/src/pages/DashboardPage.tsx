import React, { useEffect, useState } from 'react';
import { getOverview } from '../api/client';
import {
  IconUsers, IconUser, IconUserPlus, IconBriefcase, IconBriefcasePlus,
  IconCheckCircle, IconCalendar, IconMail, IconShield, IconBuilding,
  IconTarget, IconPieChart, IconTrendingUp, IconAlertTriangle,
} from '../components/Icons';

interface Stats {
  total_users: number;
  total_candidates: number;
  total_recruiters: number;
  total_hr: number;
  total_admins: number;
  active_users: number;
  inactive_users: number;
  total_job_postings: number;
  active_job_postings: number;
  total_applications: number;
  total_meetings: number;
  new_users_last_7d: number;
  new_jobs_last_7d: number;
}

/* Plain metric card */
const MetricCard: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number | string;
  sub?: string;
}> = ({ icon, iconBg, label, value, sub }) => (
  <div style={{
    background: '#fff',
    border: '1px solid #e8eaed',
    borderRadius: 16,
    padding: '20px 22px',
    boxShadow: '0 1px 4px rgba(0,0,0,.06)',
    transition: 'box-shadow .15s',
  }}
    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.10)')}
    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.06)')}
  >
    <div style={{
      width: 38, height: 38, borderRadius: 10, background: iconBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: 14,
    }}>{icon}</div>
    <div style={{ fontSize: 30, fontWeight: 800, color: '#1a1d2b', letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 12, fontWeight: 600, color: '#9599a8', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 6 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: '#b0b4c4', marginTop: 4 }}>{sub}</div>}
  </div>
);

/* Highlighted purple gradient card */
const AccentCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
}> = ({ icon, label, value, sub }) => (
  <div style={{
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 16,
    padding: '20px 22px',
    color: '#fff',
    boxShadow: '0 4px 20px rgba(118,75,162,.30)',
    position: 'relative',
    overflow: 'hidden',
  }}>
    <div style={{
      position: 'absolute', top: -12, right: -12,
      width: 80, height: 80, borderRadius: '50%',
      background: 'rgba(255,255,255,.08)',
    }} />
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: 'rgba(255,255,255,.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <IconTrendingUp size={18} color="rgba(255,255,255,0.9)" />
    </div>
    <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 6, opacity: 0.85 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>{sub}</div>}
  </div>
);

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getOverview()
      .then((res) => setStats(res.data))
      .catch((err) => {
        const msg = err?.response?.data?.detail || 'Failed to load stats.';
        setError(String(msg));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="loading-page">
        <span className="spinner" /> Loading platform stats…
      </div>
    );

  if (error) return <div className="alert alert-error"><IconAlertTriangle size={16} color="currentColor" /> {error}</div>;
  if (!stats) return null;

  const roleData = [
    { label: 'Candidate', count: stats.total_candidates, color: '#6366f1' },
    { label: 'Recruiter', count: stats.total_recruiters, color: '#764ba2' },
    { label: 'HR',        count: stats.total_hr,         color: '#f59e0b' },
    { label: 'Admin',     count: stats.total_admins,     color: '#d1d5db' },
  ];

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1a1d2b', letterSpacing: '-0.5px', marginBottom: 4 }}>
          Platform Overview
        </h2>
        <p style={{ fontSize: 13, color: '#9599a8' }}>Real-time insights across users, jobs, and platform activity.</p>
      </div>

      {/* ── USERS section ─────────────────────────── */}
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9599a8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#667eea', display: 'inline-block' }} />
        Users
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        <MetricCard icon={<IconUsers size={20} color="#6366f1" />}        iconBg="#f0f0ff" label="Total Users"   value={stats.total_users}      sub={`${stats.active_users} active`} />
        <MetricCard icon={<IconTarget size={20} color="#3b82f6" />}        iconBg="#eff6ff" label="Candidates"    value={stats.total_candidates} />
        <MetricCard icon={<IconBuilding size={20} color="#764ba2" />}      iconBg="#f3f0ff" label="Recruiters"    value={stats.total_recruiters} />
        <MetricCard icon={<IconBriefcase size={20} color="#f59e0b" />}     iconBg="#fffbeb" label="HR Managers"   value={stats.total_hr}         />
        <MetricCard icon={<IconShield size={20} color="#ef4444" />}        iconBg="#fef2f2" label="Admins"        value={stats.total_admins}     />
        <AccentCard icon={<IconUserPlus size={20} color="#fff" />}  label="New This Week" value={stats.new_users_last_7d} sub="registered in last 7 days" />
      </div>

      {/* ── JOBS section ──────────────────────────── */}
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9599a8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#667eea', display: 'inline-block' }} />
        Jobs &amp; Activity
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        <MetricCard icon={<IconBriefcase size={20} color="#3b82f6" />}     iconBg="#eff6ff" label="Total Postings" value={stats.total_job_postings}  sub={`${stats.active_job_postings} active`} />
        <MetricCard icon={<IconCheckCircle size={20} color="#22c55e" />}   iconBg="#f0fdf4" label="Active Jobs"    value={stats.active_job_postings} />
        <MetricCard icon={<IconMail size={20} color="#764ba2" />}          iconBg="#f3f0ff" label="Applications"   value={stats.total_applications}  />
        <MetricCard icon={<IconCalendar size={20} color="#f59e0b" />}      iconBg="#fffbeb" label="Meetings"       value={stats.total_meetings}      />
        <AccentCard icon={<IconBriefcasePlus size={20} color="#fff" />} label="New Jobs This Week" value={stats.new_jobs_last_7d} sub="posted in last 7 days" />
      </div>

      {/* ── Role Distribution ───────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 16, padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconPieChart size={20} color="#667eea" />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1d2b' }}>User Role Distribution</span>
          </div>
          <span style={{ fontSize: 12, color: '#9599a8' }}>{stats.total_users} total users</span>
        </div>

        {/* Stacked bar */}
        <div style={{ height: 10, borderRadius: 999, overflow: 'hidden', display: 'flex', marginBottom: 20 }}>
          {stats.total_users > 0 && roleData.map((r) => (
            <div
              key={r.label}
              style={{
                width: `${(r.count / stats.total_users) * 100}%`,
                background: r.color,
                transition: 'width 0.6s ease',
              }}
            />
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {roleData.map((r) => {
            const pct = stats.total_users ? ((r.count / stats.total_users) * 100).toFixed(1) : '0.0';
            return (
              <div key={r.label} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#4b5268' }}>{r.label}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1d2b', letterSpacing: '-0.5px' }}>{pct}%</div>
                <div style={{ fontSize: 11, color: '#9599a8' }}>· {r.count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
