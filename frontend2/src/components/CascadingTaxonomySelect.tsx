/**
 * CascadingTaxonomySelect Component
 * 
 * A 3-tier cascading dropdown for Product Taxonomy selection:
 * Vendor → Product Type → Role
 * 
 * Features:
 * - Auto-loads dependent dropdowns as selections are made
 * - Search/filter support for each tier
 * - Loading states
 * - Error handling
 * - Validation support
 * 
 * Usage:
 * ```tsx
 * <CascadingTaxonomySelect
 *   selectedVendor={formData.product_vendor}
 *   selectedProductType={formData.product_type}
 *   selectedRole={formData.job_role}
 *   onVendorChange={(vendor) => setFormData({...formData, product_vendor: vendor})}
 *   onProductTypeChange={(type) => setFormData({...formData, product_type: type})}
 *   onRoleChange={(role) => setFormData({...formData, job_role: role})}
 *   required={true}
 *   errors={{
 *     vendor: formErrors.vendor,
 *     productType: formErrors.productType,
 *     role: formErrors.role
 *   }}
 * />
 * ```
 */

import React, { useEffect, useState } from 'react';
import { useTaxonomy, TaxonomyVendor, TaxonomyProductType, TaxonomyRole } from '../hooks/useTaxonomy';
import './CascadingTaxonomySelect.css';

export interface CascadingTaxonomySelectProps {
  // Current selections (can be name strings or IDs)
  selectedVendor?: string | number | null;
  selectedProductType?: string | number | null;
  selectedRole?: string | number | null;
  
  // Change handlers - return name strings for form compatibility
  onVendorChange: (vendorName: string, vendorId: number) => void;
  onProductTypeChange: (productTypeName: string, productTypeId: number) => void;
  onRoleChange: (roleName: string, roleId: number) => void;
  
  // Validation
  required?: boolean;
  errors?: {
    vendor?: string;
    productType?: string;
    role?: string;
  };
  
  // Labels
  vendorLabel?: string;
  productTypeLabel?: string;
  roleLabel?: string;
  
  // Disabled states
  disabled?: boolean;
  
  // CSS classes
  className?: string;
  
  // Show descriptions
  showDescriptions?: boolean;
}

export const CascadingTaxonomySelect: React.FC<CascadingTaxonomySelectProps> = ({
  selectedVendor,
  selectedProductType,
  selectedRole,
  onVendorChange,
  onProductTypeChange,
  onRoleChange,
  required = false,
  errors = {},
  vendorLabel = 'Product Vendor',
  productTypeLabel = 'Product Type',
  roleLabel = 'Job Role',
  disabled = false,
  className = '',
  showDescriptions = false,
}) => {
  const {
    vendors,
    productTypes,
    roles,
    loadingVendors,
    loadingProductTypes,
    loadingRoles,
    error,
    selectVendor: selectVendorInternal,
    selectProductType: selectProductTypeInternal,
    selectRole: selectRoleInternal,
  } = useTaxonomy({ autoLoadVendors: true });

  // Local state for tracking current selections by ID
  const [currentVendorId, setCurrentVendorId] = useState<number | null>(null);
  const [currentProductTypeId, setCurrentProductTypeId] = useState<number | null>(null);
  const [currentRoleId, setCurrentRoleId] = useState<number | null>(null);

  // Initialize selections when data loads
  useEffect(() => {
    if (!vendors.length || disabled) return;

    // Find vendor by name or ID
    let vendor: TaxonomyVendor | undefined;
    if (typeof selectedVendor === 'number') {
      vendor = vendors.find(v => v.id === selectedVendor);
    } else if (typeof selectedVendor === 'string') {
      vendor = vendors.find(v => v.name === selectedVendor);
    }

    if (vendor && vendor.id !== currentVendorId) {
      setCurrentVendorId(vendor.id);
      selectVendorInternal(vendor);
    }
  }, [selectedVendor, vendors, disabled]);

  useEffect(() => {
    if (!productTypes.length || disabled) return;

    // Find product type by name or ID
    let productType: TaxonomyProductType | undefined;
    if (typeof selectedProductType === 'number') {
      productType = productTypes.find(pt => pt.id === selectedProductType);
    } else if (typeof selectedProductType === 'string') {
      productType = productTypes.find(pt => pt.name === selectedProductType);
    }

    if (productType && productType.id !== currentProductTypeId) {
      setCurrentProductTypeId(productType.id);
      selectProductTypeInternal(productType);
    }
  }, [selectedProductType, productTypes, disabled]);

  useEffect(() => {
    if (!roles.length || disabled) return;

    // Find role by name or ID
    let role: TaxonomyRole | undefined;
    if (typeof selectedRole === 'number') {
      role = roles.find(r => r.id === selectedRole);
    } else if (typeof selectedRole === 'string') {
      role = roles.find(r => r.name === selectedRole);
    }

    if (role && role.id !== currentRoleId) {
      setCurrentRoleId(role.id);
      selectRoleInternal(role);
    }
  }, [selectedRole, roles, disabled]);

  // Handle vendor selection
  const handleVendorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vendorId = parseInt(e.target.value);
    const vendor = vendors.find(v => v.id === vendorId);
    
    if (vendor) {
      setCurrentVendorId(vendor.id);
      setCurrentProductTypeId(null);
      setCurrentRoleId(null);
      selectVendorInternal(vendor);
      onVendorChange(vendor.name, vendor.id);
      onProductTypeChange('', 0); // Reset downstream
      onRoleChange('', 0);
    } else {
      setCurrentVendorId(null);
      setCurrentProductTypeId(null);
      setCurrentRoleId(null);
      selectVendorInternal(null);
      onVendorChange('', 0);
      onProductTypeChange('', 0);
      onRoleChange('', 0);
    }
  };

  // Handle product type selection
  const handleProductTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productTypeId = parseInt(e.target.value);
    const productType = productTypes.find(pt => pt.id === productTypeId);
    
    if (productType) {
      setCurrentProductTypeId(productType.id);
      setCurrentRoleId(null);
      selectProductTypeInternal(productType);
      onProductTypeChange(productType.name, productType.id);
      onRoleChange('', 0); // Reset downstream
    } else {
      setCurrentProductTypeId(null);
      setCurrentRoleId(null);
      selectProductTypeInternal(null);
      onProductTypeChange('', 0);
      onRoleChange('', 0);
    }
  };

  // Handle role selection
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleId = parseInt(e.target.value);
    const role = roles.find(r => r.id === roleId);
    
    if (role) {
      setCurrentRoleId(role.id);
      selectRoleInternal(role);
      onRoleChange(role.name, role.id);
    } else {
      setCurrentRoleId(null);
      selectRoleInternal(null);
      onRoleChange('', 0);
    }
  };

  return (
    <div className={`cascading-taxonomy-select ${className}`}>
      {/* Vendor Selection */}
      <div className="taxonomy-field">
        <label>
          {vendorLabel} {required && <span className="required">*</span>}
        </label>
        <select
          value={currentVendorId || ''}
          onChange={handleVendorChange}
          disabled={disabled || loadingVendors}
          className={errors.vendor ? 'error' : ''}
        >
          <option value="">
            {loadingVendors ? 'Loading vendors...' : `Select ${vendorLabel}`}
          </option>
          {vendors.map(vendor => (
            <option key={vendor.id} value={vendor.id} title={vendor.description}>
              {vendor.name} {vendor.is_custom && '(Custom)'}
            </option>
          ))}
        </select>
        {errors.vendor && <span className="error-message">{errors.vendor}</span>}
        {showDescriptions && currentVendorId && (
          <div className="description">
            {vendors.find(v => v.id === currentVendorId)?.description}
          </div>
        )}
      </div>

      {/* Product Type Selection */}
      <div className="taxonomy-field">
        <label>
          {productTypeLabel} {required && <span className="required">*</span>}
        </label>
        <select
          value={currentProductTypeId || ''}
          onChange={handleProductTypeChange}
          disabled={disabled || !currentVendorId || loadingProductTypes}
          className={errors.productType ? 'error' : ''}
        >
          <option value="">
            {!currentVendorId
              ? `Select ${vendorLabel} first`
              : loadingProductTypes
              ? 'Loading product types...'
              : `Select ${productTypeLabel}`}
          </option>
          {productTypes.map(productType => (
            <option key={productType.id} value={productType.id} title={productType.description}>
              {productType.name} {productType.is_custom && '(Custom)'}
            </option>
          ))}
        </select>
        {errors.productType && <span className="error-message">{errors.productType}</span>}
        {showDescriptions && currentProductTypeId && (
          <div className="description">
            {productTypes.find(pt => pt.id === currentProductTypeId)?.description}
          </div>
        )}
      </div>

      {/* Role Selection */}
      <div className="taxonomy-field">
        <label>
          {roleLabel} {required && <span className="required">*</span>}
        </label>
        <select
          value={currentRoleId || ''}
          onChange={handleRoleChange}
          disabled={disabled || !currentProductTypeId || loadingRoles}
          className={errors.role ? 'error' : ''}
        >
          <option value="">
            {!currentProductTypeId
              ? `Select ${productTypeLabel} first`
              : loadingRoles
              ? 'Loading roles...'
              : `Select ${roleLabel}`}
          </option>
          {roles.map(role => (
            <option key={role.id} value={role.id} title={role.description}>
              {role.name} {role.is_custom && '(Custom)'}
            </option>
          ))}
        </select>
        {errors.role && <span className="error-message">{errors.role}</span>}
        {showDescriptions && currentRoleId && (
          <div className="description">
            {roles.find(r => r.id === currentRoleId)?.description}
          </div>
        )}
      </div>

      {/* Global error */}
      {error && (
        <div className="taxonomy-error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default CascadingTaxonomySelect;
