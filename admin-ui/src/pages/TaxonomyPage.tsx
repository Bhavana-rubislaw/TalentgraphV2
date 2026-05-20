import React, { useEffect, useState, useCallback } from 'react';
import {
  getVendors,
  getProductTypes,
  getRoles,
  createCustomVendor,
  createCustomProductType,
  createCustomRole,
} from '../api/client';
import { IconCheck, IconAlertTriangle, IconHierarchy, IconList, IconBriefcase } from '../components/Icons';

interface TaxItem { id: number; name: string; usage_count?: number; is_custom?: boolean; }

const TaxonomyPage: React.FC = () => {
  const [vendors, setVendors] = useState<TaxItem[]>([]);
  const [productTypes, setProductTypes] = useState<TaxItem[]>([]);
  const [roles, setRoles] = useState<TaxItem[]>([]);

  const [selectedVendor, setSelectedVendor] = useState<TaxItem | null>(null);
  const [selectedType, setSelectedType] = useState<TaxItem | null>(null);

  const [vendorSearch, setVendorSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newVendor, setNewVendor] = useState('');
  const [newType, setNewType] = useState('');
  const [newRole, setNewRole] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const loadVendors = useCallback(() => {
    setLoading(true);
    getVendors(vendorSearch || undefined)
      .then((res) => setVendors(res.data))
      .catch(() => setError('Failed to load vendors.'))
      .finally(() => setLoading(false));
  }, [vendorSearch]);

  useEffect(() => { loadVendors(); }, [loadVendors]);

  const selectVendor = (v: TaxItem) => {
    setSelectedVendor(v);
    setSelectedType(null);
    setRoles([]);
    getProductTypes(v.id)
      .then((res) => setProductTypes(res.data))
      .catch(() => setError('Failed to load product types.'));
  };

  const selectType = (t: TaxItem) => {
    setSelectedType(t);
    getRoles(t.id)
      .then((res) => setRoles(res.data))
      .catch(() => setError('Failed to load roles.'));
  };

  const handleAddVendor = async () => {
    if (!newVendor.trim()) return;
    setAddLoading(true);
    try {
      await createCustomVendor(newVendor.trim());
      flash(`Vendor "${newVendor}" added.`);
      setNewVendor('');
      loadVendors();
    } catch (err: any) { setError(err?.response?.data?.detail || 'Failed to add vendor.'); }
    finally { setAddLoading(false); }
  };

  const handleAddType = async () => {
    if (!newType.trim() || !selectedVendor) return;
    setAddLoading(true);
    try {
      await createCustomProductType(selectedVendor.id, newType.trim());
      flash(`Product type "${newType}" added.`);
      setNewType('');
      selectVendor(selectedVendor);
    } catch (err: any) { setError(err?.response?.data?.detail || 'Failed to add product type.'); }
    finally { setAddLoading(false); }
  };

  const handleAddRole = async () => {
    if (!newRole.trim() || !selectedType) return;
    setAddLoading(true);
    try {
      await createCustomRole(selectedType.id, newRole.trim());
      flash(`Role "${newRole}" added.`);
      setNewRole('');
      selectType(selectedType);
    } catch (err: any) { setError(err?.response?.data?.detail || 'Failed to add role.'); }
    finally { setAddLoading(false); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Taxonomy</h1>
          <p className="page-subtitle">Manage vendor → product type → role hierarchy used in job postings and preferences</p>
        </div>
      </div>

      {success && <div className="alert alert-success"><IconCheck size={15} color="currentColor" style={{ marginRight: 6 }} />{success}</div>}
      {error   && <div className="alert alert-error"><IconAlertTriangle size={15} color="currentColor" style={{ marginRight: 6 }} />{error}</div>}

      <div className="taxonomy-grid">
        {/* ── Column 1: Vendors ─────────────────────────── */}
        <div className="taxonomy-col">
          <div className="taxonomy-col-header">
            <div className="taxonomy-col-title"><IconHierarchy size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />Vendors ({vendors.length})</div>
          </div>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light)' }}>
            <input
              className="input"
              style={{ width: '100%', fontSize: '13px', padding: '6px 10px' }}
              placeholder="Search vendors…"
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
            />
          </div>
          <div className="taxonomy-list">
            {loading ? (
              <div className="loading-page"><span className="spinner" /></div>
            ) : vendors.map((v) => (
              <div
                key={v.id}
                className={`taxonomy-item${selectedVendor?.id === v.id ? ' selected' : ''}`}
                onClick={() => selectVendor(v)}
              >
                <span className="taxonomy-item-name">{v.name}</span>
                {v.usage_count !== undefined && (
                  <span className="taxonomy-item-count">{v.usage_count}</span>
                )}
                {v.is_custom && <span className="badge badge-purple" style={{ fontSize: '9px' }}>custom</span>}
              </div>
            ))}
          </div>
          <div className="taxonomy-add-form">
            <input
              className="input"
              placeholder="New vendor name…"
              value={newVendor}
              onChange={(e) => setNewVendor(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddVendor()}
            />
            <button className="btn btn-primary btn-sm" onClick={handleAddVendor} disabled={addLoading || !newVendor.trim()}>
              + Add
            </button>
          </div>
        </div>

        {/* ── Column 2: Product Types ───────────────────── */}
        <div className="taxonomy-col">
          <div className="taxonomy-col-header">
            <div className="taxonomy-col-title">
              <IconList size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />Product Types {selectedVendor ? `— ${selectedVendor.name}` : ''}
            </div>
          </div>
          <div className="taxonomy-list">
            {!selectedVendor ? (
              <div className="empty-state">
                <div className="empty-state-icon">←</div>
                <div className="empty-state-title">Select a vendor</div>
              </div>
            ) : productTypes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><IconList size={32} color="#c4c8d8" /></div>
                <div className="empty-state-title">No product types yet</div>
              </div>
            ) : productTypes.map((t) => (
              <div
                key={t.id}
                className={`taxonomy-item${selectedType?.id === t.id ? ' selected' : ''}`}
                onClick={() => selectType(t)}
              >
                <span className="taxonomy-item-name">{t.name}</span>
                {t.usage_count !== undefined && (
                  <span className="taxonomy-item-count">{t.usage_count}</span>
                )}
                {t.is_custom && <span className="badge badge-purple" style={{ fontSize: '9px' }}>custom</span>}
              </div>
            ))}
          </div>
          {selectedVendor && (
            <div className="taxonomy-add-form">
              <input
                className="input"
                placeholder="New product type…"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddType()}
              />
              <button className="btn btn-primary btn-sm" onClick={handleAddType} disabled={addLoading || !newType.trim()}>
                + Add
              </button>
            </div>
          )}
        </div>

        {/* ── Column 3: Roles ───────────────────────────── */}
        <div className="taxonomy-col">
          <div className="taxonomy-col-header">
            <div className="taxonomy-col-title">
              <IconBriefcase size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />Roles {selectedType ? `— ${selectedType.name}` : ''}
            </div>
          </div>
          <div className="taxonomy-list">
            {!selectedType ? (
              <div className="empty-state">
                <div className="empty-state-icon">←</div>
                <div className="empty-state-title">Select a product type</div>
              </div>
            ) : roles.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><IconBriefcase size={32} color="#c4c8d8" /></div>
                <div className="empty-state-title">No roles yet</div>
              </div>
            ) : roles.map((r) => (
              <div key={r.id} className="taxonomy-item">
                <span className="taxonomy-item-name">{r.name}</span>
                {r.usage_count !== undefined && (
                  <span className="taxonomy-item-count">{r.usage_count}</span>
                )}
                {r.is_custom && <span className="badge badge-purple" style={{ fontSize: '9px' }}>custom</span>}
              </div>
            ))}
          </div>
          {selectedType && (
            <div className="taxonomy-add-form">
              <input
                className="input"
                placeholder="New role name…"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
              />
              <button className="btn btn-primary btn-sm" onClick={handleAddRole} disabled={addLoading || !newRole.trim()}>
                + Add
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaxonomyPage;
