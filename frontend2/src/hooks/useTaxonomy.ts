/**
 * useTaxonomy Hook - Product Taxonomy Management
 * 
 * Provides 3-tier cascading taxonomy selection (Vendor → Product Type → Role)
 * with caching, loading states, and error handling.
 * 
 * Usage:
 * ```tsx
 * const {
 *   vendors,
 *   productTypes,
 *   roles,
 *   loadingVendors,
 *   loadingProductTypes,
 *   loadingRoles,
 *   selectedVendor,
 *   selectedProductType,
 *   selectedRole,
 *   selectVendor,
 *   selectProductType,
 *   selectRole,
 *   resetSelection
 * } = useTaxonomy();
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

export interface TaxonomyVendor {
  id: number;
  name: string;
  description?: string;
  is_custom: boolean;
  usage_count: number;
}

export interface TaxonomyProductType {
  id: number;
  vendor_id: number;
  name: string;
  description?: string;
  is_custom: boolean;
  usage_count: number;
}

export interface TaxonomyRole {
  id: number;
  product_type_id: number;
  name: string;
  description?: string;
  is_custom: boolean;
  usage_count: number;
}

interface UseTaxonomyOptions {
  autoLoadVendors?: boolean;
  initialVendorId?: number;
  initialProductTypeId?: number;
  initialRoleId?: number;
}

interface UseTaxonomyReturn {
  // Data
  vendors: TaxonomyVendor[];
  productTypes: TaxonomyProductType[];
  roles: TaxonomyRole[];
  
  // Loading states
  loadingVendors: boolean;
  loadingProductTypes: boolean;
  loadingRoles: boolean;
  
  // Error states
  error: string | null;
  
  // Selected values
  selectedVendor: TaxonomyVendor | null;
  selectedProductType: TaxonomyProductType | null;
  selectedRole: TaxonomyRole | null;
  
  // Actions
  selectVendor: (vendor: TaxonomyVendor | null) => void;
  selectProductType: (productType: TaxonomyProductType | null) => void;
  selectRole: (role: TaxonomyRole | null) => void;
  resetSelection: () => void;
  refreshVendors: () => Promise<void>;
  searchVendors: (query: string) => Promise<void>;
  searchProductTypes: (query: string) => Promise<void>;
  searchRoles: (query: string) => Promise<void>;
}

export const useTaxonomy = (options: UseTaxonomyOptions = {}): UseTaxonomyReturn => {
  const {
    autoLoadVendors = true,
    initialVendorId,
    initialProductTypeId,
    initialRoleId
  } = options;

  // Data
  const [vendors, setVendors] = useState<TaxonomyVendor[]>([]);
  const [productTypes, setProductTypes] = useState<TaxonomyProductType[]>([]);
  const [roles, setRoles] = useState<TaxonomyRole[]>([]);

  // Loading states
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingProductTypes, setLoadingProductTypes] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Selected values
  const [selectedVendor, setSelectedVendor] = useState<TaxonomyVendor | null>(null);
  const [selectedProductType, setSelectedProductType] = useState<TaxonomyProductType | null>(null);
  const [selectedRole, setSelectedRole] = useState<TaxonomyRole | null>(null);

  // Load vendors on mount
  useEffect(() => {
    if (autoLoadVendors) {
      loadVendors();
    }
  }, [autoLoadVendors]);

  // Load initial selections if provided
  useEffect(() => {
    if (initialVendorId && vendors.length > 0) {
      const vendor = vendors.find(v => v.id === initialVendorId);
      if (vendor) {
        selectVendor(vendor);
      }
    }
  }, [initialVendorId, vendors]);

  useEffect(() => {
    if (initialProductTypeId && productTypes.length > 0) {
      const productType = productTypes.find(pt => pt.id === initialProductTypeId);
      if (productType) {
        selectProductType(productType);
      }
    }
  }, [initialProductTypeId, productTypes]);

  useEffect(() => {
    if (initialRoleId && roles.length > 0) {
      const role = roles.find(r => r.id === initialRoleId);
      if (role) {
        selectRole(role);
      }
    }
  }, [initialRoleId, roles]);

  // Load vendors
  const loadVendors = useCallback(async (search?: string) => {
    setLoadingVendors(true);
    setError(null);
    try {
      const response = await apiClient.getTaxonomyVendors(search);
      setVendors(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load vendors');
      console.error('Error loading vendors:', err);
    } finally {
      setLoadingVendors(false);
    }
  }, []);

  // Load product types for selected vendor
  const loadProductTypes = useCallback(async (vendorId: number, search?: string) => {
    setLoadingProductTypes(true);
    setError(null);
    try {
      const response = await apiClient.getTaxonomyProductTypes(vendorId, search);
      setProductTypes(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load product types');
      console.error('Error loading product types:', err);
    } finally {
      setLoadingProductTypes(false);
    }
  }, []);

  // Load roles for selected product type
  const loadRoles = useCallback(async (productTypeId: number, search?: string) => {
    setLoadingRoles(true);
    setError(null);
    try {
      const response = await apiClient.getTaxonomyRoles(productTypeId, search);
      setRoles(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load roles');
      console.error('Error loading roles:', err);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  // Select vendor
  const selectVendor = useCallback((vendor: TaxonomyVendor | null) => {
    setSelectedVendor(vendor);
    setSelectedProductType(null);
    setSelectedRole(null);
    setProductTypes([]);
    setRoles([]);
    
    if (vendor) {
      loadProductTypes(vendor.id);
    }
  }, [loadProductTypes]);

  // Select product type
  const selectProductType = useCallback((productType: TaxonomyProductType | null) => {
    setSelectedProductType(productType);
    setSelectedRole(null);
    setRoles([]);
    
    if (productType) {
      loadRoles(productType.id);
    }
  }, [loadRoles]);

  // Select role
  const selectRole = useCallback((role: TaxonomyRole | null) => {
    setSelectedRole(role);
  }, []);

  // Reset all selections
  const resetSelection = useCallback(() => {
    setSelectedVendor(null);
    setSelectedProductType(null);
    setSelectedRole(null);
    setProductTypes([]);
    setRoles([]);
  }, []);

  // Refresh vendors
  const refreshVendors = useCallback(async () => {
    await loadVendors();
  }, [loadVendors]);

  // Search functions
  const searchVendors = useCallback(async (query: string) => {
    await loadVendors(query);
  }, [loadVendors]);

  const searchProductTypes = useCallback(async (query: string) => {
    if (selectedVendor) {
      await loadProductTypes(selectedVendor.id, query);
    }
  }, [selectedVendor, loadProductTypes]);

  const searchRoles = useCallback(async (query: string) => {
    if (selectedProductType) {
      await loadRoles(selectedProductType.id, query);
    }
  }, [selectedProductType, loadRoles]);

  return {
    vendors,
    productTypes,
    roles,
    loadingVendors,
    loadingProductTypes,
    loadingRoles,
    error,
    selectedVendor,
    selectedProductType,
    selectedRole,
    selectVendor,
    selectProductType,
    selectRole,
    resetSelection,
    refreshVendors,
    searchVendors,
    searchProductTypes,
    searchRoles,
  };
};
