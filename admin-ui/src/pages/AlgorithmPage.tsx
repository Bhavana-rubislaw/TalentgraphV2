/**
 * AlgorithmPage – Recommendation algorithm configuration and operational
 * health dashboard for TalentGraph Admin Portal.
 *
 * Sections:
 *   1. Health & feature flags banner
 *   2. Algorithm config version table with activate / archive actions
 *   3. Create new draft config form
 *   4. Recent run metrics table (backfill, incremental sync, shadow compare)
 *   5. Sync watermark status
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  getRecommenderHealth,
  getRecommenderFlags,
  listAlgorithmConfigs,
  createAlgorithmConfig,
  activateAlgorithmConfig,
  archiveAlgorithmConfig,
  getRecommenderMetrics,
  getRecommenderWatermarks,
  triggerRecommenderBackfill,
  AlgorithmConfig,
  RecommenderHealth,
  RunMetric,
  SyncWatermark,
} from '../api/client';

// ── Types ────────────────────────────────────────────────────

interface CreateConfigForm {
  version: string;
  description: string;
  weight_product_match: number;
  weight_skills_match: number;
  weight_experience_match: number;
  weight_salary_match: number;
  weight_location_match: number;
}

const DEFAULT_FORM: CreateConfigForm = {
  version: '',
  description: '',
  weight_product_match: 40,
  weight_skills_match: 30,
  weight_experience_match: 15,
  weight_salary_match: 10,
  weight_location_match: 5,
};

// ── Helpers ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: '#059669',
    draft: '#d97706',
    archived: '#6b7280',
  };
  return (
    <span style={{
      backgroundColor: colors[status] ?? '#6b7280',
      color: '#fff',
      borderRadius: 4,
      padding: '2px 8px',
      fontSize: 12,
      fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      {status}
    </span>
  );
}

function DbBadge({ value }: { value: string }) {
  const ok = value === 'ok';
  return (
    <span style={{
      color: ok ? '#059669' : '#dc2626',
      fontWeight: 600,
    }}>
      {ok ? '✓ Connected' : `✗ ${value}`}
    </span>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const colors: Record<string, string> = {
    local: '#4f46e5',
    standalone: '#7c3aed',
    shadow: '#d97706',
  };
  return (
    <span style={{
      backgroundColor: colors[mode] ?? '#6b7280',
      color: '#fff',
      borderRadius: 4,
      padding: '2px 10px',
      fontSize: 12,
      fontWeight: 600,
    }}>
      {mode}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function AlgorithmPage() {
  const [health, setHealth] = useState<RecommenderHealth | null>(null);
  const [configs, setConfigs] = useState<AlgorithmConfig[]>([]);
  const [metrics, setMetrics] = useState<RunMetric[]>([]);
  const [watermarks, setWatermarks] = useState<SyncWatermark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<CreateConfigForm>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, c, m, w] = await Promise.all([
        getRecommenderHealth(),
        listAlgorithmConfigs(),
        getRecommenderMetrics(20),
        getRecommenderWatermarks(),
      ]);
      setHealth(h.data);
      setConfigs(c.data.configs ?? []);
      setMetrics(m.data.metrics ?? []);
      setWatermarks(w.data.watermarks ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to load recommender data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleActivate = async (configId: number) => {
    try {
      await activateAlgorithmConfig(configId);
      setActionMsg('Config activated successfully');
      load();
    } catch (e: any) {
      setActionMsg(`Error: ${e?.response?.data?.detail ?? 'Activation failed'}`);
    }
  };

  const handleArchive = async (configId: number) => {
    if (!confirm('Archive this config?')) return;
    try {
      await archiveAlgorithmConfig(configId);
      setActionMsg('Config archived');
      load();
    } catch (e: any) {
      setActionMsg(`Error: ${e?.response?.data?.detail ?? 'Archive failed'}`);
    }
  };

  const handleBackfill = async () => {
    if (!confirm('Trigger a full backfill? This may take several minutes.')) return;
    try {
      await triggerRecommenderBackfill();
      setActionMsg('Backfill started — monitor progress in Run Metrics below.');
    } catch (e: any) {
      setActionMsg(`Error: ${e?.response?.data?.detail ?? 'Backfill trigger failed'}`);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAlgorithmConfig(form);
      setActionMsg(`Draft config v${form.version} created`);
      setShowCreateForm(false);
      setForm(DEFAULT_FORM);
      load();
    } catch (e: any) {
      setActionMsg(`Error: ${e?.response?.data?.detail ?? 'Create failed'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldChange = (key: keyof CreateConfigForm, value: string | number) =>
    setForm(f => ({ ...f, [key]: value }));

  // ── Render ──────────────────────────────────────────────────

  if (loading) return <div style={styles.loading}>Loading algorithm data…</div>;
  if (error)   return <div style={styles.error}>{error}</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Recommendation Algorithm</h1>
        <div style={styles.headerActions}>
          <button style={styles.btnSecondary} onClick={load}>Refresh</button>
          <button style={styles.btnWarning} onClick={handleBackfill}>
            Trigger Backfill
          </button>
          <button style={styles.btnPrimary} onClick={() => setShowCreateForm(v => !v)}>
            {showCreateForm ? 'Cancel' : '+ New Config'}
          </button>
        </div>
      </div>

      {actionMsg && (
        <div style={styles.actionMsg} onClick={() => setActionMsg(null)}>
          {actionMsg} <span style={{ opacity: 0.6 }}>(click to dismiss)</span>
        </div>
      )}

      {/* ── Health Banner ── */}
      {health && (
        <div style={styles.healthBanner}>
          <div style={styles.healthItem}>
            <span style={styles.healthLabel}>Gateway</span>
            <span style={{ fontWeight: 600 }}>{health.gateway_adapter}</span>
          </div>
          <div style={styles.healthItem}>
            <span style={styles.healthLabel}>Recommender DB</span>
            <DbBadge value={health.recommender_db} />
          </div>
          <div style={styles.healthItem}>
            <span style={styles.healthLabel}>Mode</span>
            <ModeBadge mode={health.feature_flags?.recommender_mode ?? 'local'} />
          </div>
          <div style={styles.healthItem}>
            <span style={styles.healthLabel}>Enabled</span>
            <span style={{ fontWeight: 600 }}>
              {health.feature_flags?.recommender_enabled ? 'Yes' : 'No'}
            </span>
          </div>
          <div style={styles.healthItem}>
            <span style={styles.healthLabel}>Shadow Compare</span>
            <span style={{ fontWeight: 600 }}>
              {health.feature_flags?.recommender_shadow_compare ? 'On' : 'Off'}
            </span>
          </div>
          <div style={styles.healthItem}>
            <span style={styles.healthLabel}>Min Score</span>
            <span style={{ fontWeight: 600 }}>
              {health.feature_flags?.recommender_min_score_threshold}
            </span>
          </div>
        </div>
      )}

      {/* ── Create Form ── */}
      {showCreateForm && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Create Draft Config</h3>
          <form onSubmit={handleCreate} style={styles.form}>
            <div style={styles.formRow}>
              <label style={styles.label}>Version *</label>
              <input
                style={styles.input}
                value={form.version}
                onChange={e => fieldChange('version', e.target.value)}
                placeholder="e.g. 1.1.0"
                required
              />
            </div>
            <div style={styles.formRow}>
              <label style={styles.label}>Description</label>
              <input
                style={styles.input}
                value={form.description}
                onChange={e => fieldChange('description', e.target.value)}
                placeholder="What changed?"
              />
            </div>
            {(
              [
                ['weight_product_match', 'Product Match Weight'],
                ['weight_skills_match', 'Skills Match Weight'],
                ['weight_experience_match', 'Experience Match Weight'],
                ['weight_salary_match', 'Salary Match Weight'],
                ['weight_location_match', 'Location Match Weight'],
              ] as [keyof CreateConfigForm, string][]
            ).map(([key, label]) => (
              <div style={styles.formRow} key={key}>
                <label style={styles.label}>{label}</label>
                <input
                  style={{ ...styles.input, width: 80 }}
                  type="number"
                  min={0}
                  max={100}
                  value={form[key] as number}
                  onChange={e => fieldChange(key, Number(e.target.value))}
                />
              </div>
            ))}
            <button type="submit" style={styles.btnPrimary} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Draft'}
            </button>
          </form>
        </div>
      )}

      {/* ── Algorithm Configs ── */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Algorithm Configs</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Version', 'Status', 'Product', 'Skills', 'Exp', 'Salary', 'Loc', 'Activated', 'Actions'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {configs.map(c => (
              <tr key={c.id} style={styles.tr}>
                <td style={styles.td}><strong>{c.version}</strong></td>
                <td style={styles.td}><StatusBadge status={c.status} /></td>
                <td style={styles.td}>{c.weight_product_match}%</td>
                <td style={styles.td}>{c.weight_skills_match}%</td>
                <td style={styles.td}>{c.weight_experience_match}%</td>
                <td style={styles.td}>{c.weight_salary_match}%</td>
                <td style={styles.td}>{c.weight_location_match}%</td>
                <td style={styles.td}>
                  {c.activated_at ? new Date(c.activated_at).toLocaleDateString() : '—'}
                </td>
                <td style={styles.td}>
                  {c.status !== 'active' && c.status !== 'archived' && (
                    <button
                      style={styles.btnSmallSuccess}
                      onClick={() => handleActivate(c.id)}
                    >
                      Activate
                    </button>
                  )}
                  {c.status === 'draft' && (
                    <button
                      style={{ ...styles.btnSmall, marginLeft: 4 }}
                      onClick={() => handleArchive(c.id)}
                    >
                      Archive
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Run Metrics ── */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Recent Run Metrics</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Type', 'Started', 'Duration', 'Processed', 'Updated', 'Failed', 'Error'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.id} style={styles.tr}>
                <td style={styles.td}><code>{m.run_type}</code></td>
                <td style={styles.td}>{new Date(m.started_at).toLocaleString()}</td>
                <td style={styles.td}>{m.duration_ms != null ? `${m.duration_ms}ms` : '—'}</td>
                <td style={styles.td}>{m.records_processed}</td>
                <td style={styles.td}>{m.records_updated}</td>
                <td style={{ ...styles.td, color: m.records_failed > 0 ? '#dc2626' : undefined }}>
                  {m.records_failed}
                </td>
                <td style={{ ...styles.td, fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.error_message ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Watermarks ── */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Sync Watermarks</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Entity Type', 'Last Synced At', 'Last Run At', 'Records Last Run'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {watermarks.map(w => (
              <tr key={w.entity_type} style={styles.tr}>
                <td style={styles.td}><code>{w.entity_type}</code></td>
                <td style={styles.td}>{new Date(w.last_synced_at).toLocaleString()}</td>
                <td style={styles.td}>{new Date(w.last_run_at).toLocaleString()}</td>
                <td style={styles.td}>{w.records_synced_last_run}</td>
              </tr>
            ))}
            {watermarks.length === 0 && (
              <tr><td colSpan={4} style={{ ...styles.td, textAlign: 'center', color: '#9ca3af' }}>
                No watermarks yet — run backfill first.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page:        { padding: '24px', maxWidth: 1200, margin: '0 auto' },
  loading:     { padding: 40, textAlign: 'center', color: '#6b7280' },
  error:       { padding: 40, textAlign: 'center', color: '#dc2626' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title:       { fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 },
  headerActions: { display: 'flex', gap: 8 },
  actionMsg:   { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '10px 16px', marginBottom: 16, color: '#166534', cursor: 'pointer' },
  healthBanner: { display: 'flex', gap: 24, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 20px', marginBottom: 20, flexWrap: 'wrap' },
  healthItem:  { display: 'flex', flexDirection: 'column', gap: 2 },
  healthLabel: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' },
  card:        { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, marginBottom: 20 },
  cardTitle:   { fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 0, marginBottom: 16 },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:          { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #e5e7eb', color: '#374151', fontWeight: 600, whiteSpace: 'nowrap' },
  td:          { padding: '8px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151', verticalAlign: 'middle' },
  tr:          {},
  form:        { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 },
  formRow:     { display: 'flex', alignItems: 'center', gap: 12 },
  label:       { width: 200, fontSize: 13, color: '#374151', flexShrink: 0 },
  input:       { flex: 1, border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', fontSize: 13 },
  btnPrimary:  { background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnSecondary:{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 },
  btnWarning:  { background: '#d97706', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnSmall:    { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontSize: 12 },
  btnSmallSuccess: { background: '#059669', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
};
