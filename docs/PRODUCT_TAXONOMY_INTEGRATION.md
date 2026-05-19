# Product Taxonomy System - Frontend Integration Guide

## Overview

The Product Taxonomy system provides a shared, standardized way for both **recruiters** (job postings) and **candidates** (job preferences) to select:

```
Vendor → Product Type → Role
```

This ensures consistent matching and eliminates duplicate logic.

---

## Backend Summary

### Database Tables Created

- `product_vendor` - 21 vendors (Salesforce, SAP, AWS, Oracle, etc.)
- `product_type` - 99 product types (Sales Cloud, S/4HANA, Lambda, etc.)
- `product_role` - 272 roles (Salesforce Developer, SAP Consultant, Cloud Engineer, etc.)

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /product-taxonomy/vendors` | List all vendors (searchable) |
| `GET /product-taxonomy/vendors/{id}` | Get vendor with all product types |
| `GET /product-taxonomy/vendors/{id}/product-types` | Get product types for a vendor |
| `GET /product-taxonomy/product-types/{id}/roles` | Get roles for a product type |
| `GET /product-taxonomy/search?q={query}` | Global search across all taxonomy |
| `POST /product-taxonomy/vendors/custom` | Create custom vendor |
| `POST /product-taxonomy/product-types/custom` | Create custom product type |
| `POST /product-taxonomy/roles/custom` | Create custom role |

---

## Frontend Integration

### Recommended Architecture

Create **one reusable component**: `<ProductVendorRoleSelector />`

Use it in:
1. **Candidate Job Preferences Form**
2. **Recruiter Job Posting Builder**

### Component Behavior

```tsx
interface ProductVendorRoleSelectorProps {
  onSelect: (selection: {
    vendorId?: number;
    productTypeId?: number;
    roleId?: number;
    customVendor?: string;
    customProductType?: string;
    customRole?: string;
  }) => void;
  defaultValues?: {
    vendorId?: number;
    productTypeId?: number;
    roleId?: number;
  };
}
```

### UX Flow

1. **Vendor Selection**
   - Searchable async dropdown
   - Shows popular vendors first (by `usage_count`)
   - Option to add custom vendor if not found
   - Debounced search (300ms)

2. **Product Type Selection**
   - Disabled until vendor selected
   - Loads product types for selected vendor
   - Option to add custom product type

3. **Role Selection**
   - Disabled until product type selected
   - Loads roles for selected product type
   - Option to add custom role

### Example Implementation (React + TypeScript)

```tsx
import React, { useState, useEffect } from 'react';
import { AsyncSelect } from 'react-select';
import axios from 'axios';

interface TaxonomySelection {
  vendorId?: number;
  productTypeId?: number;
  roleId?: number;
  customVendor?: string;
  customProductType?: string;
  customRole?: string;
}

interface ProductVendorRoleSelectorProps {
  onSelect: (selection: TaxonomySelection) => void;
  defaultValues?: TaxonomySelection;
}

export const ProductVendorRoleSelector: React.FC<ProductVendorRoleSelectorProps> = ({
  onSelect,
  defaultValues
}) => {
  const [vendor, setVendor] = useState<any>(null);
  const [productType, setProductType] = useState<any>(null);
  const [role, setRole] = useState<any>(null);
  const [showCustomVendor, setShowCustomVendor] = useState(false);
  const [showCustomProductType, setShowCustomProductType] = useState(false);
  const [showCustomRole, setShowCustomRole] = useState(false);

  const API_BASE = 'http://localhost:8001';

  // Load vendors (with search)
  const loadVendors = async (inputValue: string) => {
    const response = await axios.get(
      `${API_BASE}/product-taxonomy/vendors`,
      { params: { search: inputValue, limit: 20 } }
    );
    return response.data.map((v: any) => ({
      value: v.id,
      label: v.name,
      data: v
    }));
  };

  // Load product types for selected vendor
  const loadProductTypes = async (inputValue: string) => {
    if (!vendor) return [];
    const response = await axios.get(
      `${API_BASE}/product-taxonomy/vendors/${vendor.value}/product-types`,
      { params: { search: inputValue } }
    );
    return response.data.map((pt: any) => ({
      value: pt.id,
      label: pt.name,
      data: pt
    }));
  };

  // Load roles for selected product type
  const loadRoles = async (inputValue: string) => {
    if (!productType) return [];
    const response = await axios.get(
      `${API_BASE}/product-taxonomy/product-types/${productType.value}/roles`,
      { params: { search: inputValue } }
    );
    return response.data.map((r: any) => ({
      value: r.id,
      label: r.name,
      data: r
    }));
  };

  // Handle vendor selection
  const handleVendorChange = (selected: any) => {
    setVendor(selected);
    setProductType(null); // Reset downstream
    setRole(null);
    
    if (selected) {
      onSelect({
        vendorId: selected.value,
        productTypeId: undefined,
        roleId: undefined
      });
    }
  };

  // Handle product type selection
  const handleProductTypeChange = (selected: any) => {
    setProductType(selected);
    setRole(null); // Reset downstream
    
    if (selected) {
      onSelect({
        vendorId: vendor?.value,
        productTypeId: selected.value,
        roleId: undefined
      });
    }
  };

  // Handle role selection
  const handleRoleChange = (selected: any) => {
    setRole(selected);
    
    if (selected) {
      onSelect({
        vendorId: vendor?.value,
        productTypeId: productType?.value,
        roleId: selected.value
      });
    }
  };

  // Create custom vendor
  const createCustomVendor = async (name: string) => {
    const response = await axios.post(
      `${API_BASE}/product-taxonomy/vendors/custom`,
      { name },
      { headers: { Authorization: `Bearer ${getAuthToken()}` } }
    );
    return {
      value: response.data.id,
      label: response.data.name,
      data: response.data
    };
  };

  return (
    <div className="product-taxonomy-selector">
      <div className="field-group">
        <label>Product Vendor *</label>
        <AsyncSelect
          cacheOptions
          defaultOptions
          loadOptions={loadVendors}
          value={vendor}
          onChange={handleVendorChange}
          placeholder="Search for vendor (e.g., Salesforce, AWS, SAP)..."
          isClearable
        />
        <button
          type="button"
          onClick={() => setShowCustomVendor(true)}
          className="add-custom-button"
        >
          + Add Custom Vendor
        </button>
      </div>

      <div className="field-group">
        <label>Product Type *</label>
        <AsyncSelect
          cacheOptions
          loadOptions={loadProductTypes}
          value={productType}
          onChange={handleProductTypeChange}
          placeholder="Select product type..."
          isDisabled={!vendor}
          isClearable
        />
        {vendor && (
          <button
            type="button"
            onClick={() => setShowCustomProductType(true)}
            className="add-custom-button"
          >
            + Add Custom Product Type
          </button>
        )}
      </div>

      <div className="field-group">
        <label>Role *</label>
        <AsyncSelect
          cacheOptions
          loadOptions={loadRoles}
          value={role}
          onChange={handleRoleChange}
          placeholder="Select role..."
          isDisabled={!productType}
          isClearable
        />
        {productType && (
          <button
            type="button"
            onClick={() => setShowCustomRole(true)}
            className="add-custom-button"
          >
            + Add Custom Role
          </button>
        )}
      </div>

      {/* Custom vendor/type/role modals would go here */}
    </div>
  );
};

// Helper to get auth token
function getAuthToken() {
  return localStorage.getItem('access_token');
}
```

---

## Database Integration

### For Job Postings (Recruiter)

Update `JobPosting` model to include taxonomy references:

```python
class JobPosting(SQLModel, table=True):
    # ... existing fields ...
    
    # Product Taxonomy (NEW)
    vendor_id: Optional[int] = Field(default=None, foreign_key="product_vendor.id")
    product_type_id: Optional[int] = Field(default=None, foreign_key="product_type.id")
    role_id: Optional[int] = Field(default=None, foreign_key="product_role.id")
    
    # Custom entries (if user-generated)
    custom_vendor: Optional[str] = None
    custom_product_type: Optional[str] = None
    custom_role: Optional[str] = None
    
    # Legacy fields (can be deprecated)
    # job_role: Optional[str] = None  # OLD
    # product_vendor: Optional[str] = None  # OLD
    # product_type: Optional[str] = None  # OLD
```

### For Job Profiles (Candidate)

Update `JobProfile` model similarly:

```python
class JobProfile(SQLModel, table=True):
    # ... existing fields ...
    
    # Product Taxonomy (NEW)
    vendor_id: Optional[int] = Field(default=None, foreign_key="product_vendor.id")
    product_type_id: Optional[int] = Field(default=None, foreign_key="product_type.id")
    role_id: Optional[int] = Field(default=None, foreign_key="product_role.id")
    
    # Custom entries
    custom_vendor: Optional[str] = None
    custom_product_type: Optional[str] = None
    custom_role: Optional[str] = None
    
    # Legacy fields
    # job_role: Optional[str] = None  # OLD
    # product_vendor: Optional[str] = None  # OLD
    # product_type: Optional[str] = None  # OLD
```

---

## Matching Algorithm Enhancement

With standardized taxonomy, matching becomes more precise:

```python
def calculate_taxonomy_match_score(candidate_profile: JobProfile, job_posting: JobPosting) -> float:
    """
    Calculate match score based on product taxonomy
    
    Returns: 0.0 to 1.0 score
    """
    score = 0.0
    
    # Vendor match (30%)
    if candidate_profile.vendor_id and job_posting.vendor_id:
        if candidate_profile.vendor_id == job_posting.vendor_id:
            score += 0.3
    
    # Product type match (30%)
    if candidate_profile.product_type_id and job_posting.product_type_id:
        if candidate_profile.product_type_id == job_posting.product_type_id:
            score += 0.3
    
    # Role match (40%) - most important
    if candidate_profile.role_id and job_posting.role_id:
        if candidate_profile.role_id == job_posting.role_id:
            score += 0.4
    
    return score
```

---

## Benefits

### ✅ Standardization
- Both sides use same taxonomy
- Eliminates typos and variations
- Enables precise matching

### ✅ Flexibility
- Supports custom entries for new vendors/roles
- Tracks usage to surface popular selections
- Soft delete (is_active) for deprecated entries

### ✅ Scalability
- Async search prevents slow page loads
- Usage counters prioritize popular items
- Extensible without code changes

### ✅ Analytics
- Track which vendors/roles are most popular
- Identify gaps in taxonomy
- Measure taxonomy coverage

---

## Testing

### API Testing (Postman/cURL)

```bash
# Get all vendors
curl http://localhost:8001/product-taxonomy/vendors

# Search vendors
curl "http://localhost:8001/product-taxonomy/vendors?search=sales"

# Get Salesforce product types
curl http://localhost:8001/product-taxonomy/vendors/1/product-types

# Global search
curl "http://localhost:8001/product-taxonomy/search?q=developer"

# Create custom vendor (requires auth)
curl -X POST http://localhost:8001/product-taxonomy/vendors/custom \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Custom Vendor", "description": "New vendor"}'
```

### Frontend Testing

1. Test vendor search with partial matches
2. Verify product types load after vendor selection
3. Verify roles load after product type selection
4. Test custom entry creation
5. Verify form validation (required fields)

---

## Migration Path

### Existing Data

If you have existing job postings/profiles with free-text fields:

```python
# Migration script to convert legacy data
def migrate_legacy_taxonomy():
    with Session(engine) as session:
        # Get all job postings with legacy fields
        postings = session.exec(select(JobPosting)).all()
        
        for posting in postings:
            if posting.product_vendor and not posting.vendor_id:
                # Try to match to existing vendor
                vendor = session.exec(
                    select(ProductVendor).where(
                        ProductVendor.name.ilike(posting.product_vendor)
                    )
                ).first()
                
                if vendor:
                    posting.vendor_id = vendor.id
                else:
                    # Store as custom
                    posting.custom_vendor = posting.product_vendor
                
                session.commit()
```

---

## Next Steps

1. **Add taxonomy fields to JobPosting model**
2. **Add taxonomy fields to JobProfile model**
3. **Create migration script for schema updates**
4. **Implement frontend `<ProductVendorRoleSelector />` component**
5. **Integrate component in recruiter job posting form**
6. **Integrate component in candidate job preferences form**
7. **Update matching algorithm to use taxonomy**
8. **Migrate existing data (if any)**

---

## Support

- **API Documentation**: http://localhost:8001/docs
- **Taxonomy Endpoints**: `/product-taxonomy/*`
- **Total Entries**: 21 vendors, 99 product types, 272 roles

The taxonomy is production-ready and includes all major enterprise ecosystems (CRM, ERP, Cloud, Data, AI, DevOps, etc.).
