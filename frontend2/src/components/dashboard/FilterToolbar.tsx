import React from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  type: 'search' | 'select' | 'location';
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options?: FilterOption[];
}

interface FilterToolbarProps {
  title: string;
  subtitle: string;
  filters: FilterConfig[];
  resultCount: number;
  totalCount: number;
  activeFiltersCount: number;
  onClearFilters: () => void;
  showResultsCount?: boolean;
}

const FilterToolbar: React.FC<FilterToolbarProps> = ({
  title,
  subtitle,
  filters,
  resultCount,
  totalCount,
  activeFiltersCount,
  onClearFilters,
  showResultsCount = true
}) => {
  return (
    <>
      {/* Page Header Section */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary, #1e293b)', marginBottom: '8px' }}>
          {title}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
          {subtitle}
        </p>
      </div>

      {/* Enhanced Filter Toolbar */}
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '20px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)', 
        marginBottom: '24px',
        border: '1px solid var(--border-color, #e2e8f0)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          {filters.map((filter) => (
            <div key={filter.id} style={{ flex: getFilterFlex(filter.type), minWidth: getFilterMinWidth(filter.type) }}>
              <label 
                htmlFor={filter.id} 
                style={{ 
                  display: 'block', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: 'var(--text-secondary, #64748b)', 
                  marginBottom: '6px', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px' 
                }}
              >
                {filter.label}
              </label>
              
              {filter.type === 'search' && (
                <div style={{ position: 'relative' }}>
                  <svg 
                    style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      width: '16px', 
                      height: '16px', 
                      color: 'var(--text-muted, #94a3b8)', 
                      pointerEvents: 'none' 
                    }} 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    id={filter.id}
                    className="job-select-modern"
                    style={{ 
                      width: '100%', 
                      paddingLeft: '38px', 
                      paddingRight: '12px', 
                      height: '40px', 
                      fontSize: '14px', 
                      borderRadius: '8px' 
                    }}
                    placeholder={filter.placeholder}
                    value={filter.value}
                    onChange={(e) => filter.onChange(e.target.value)}
                  />
                </div>
              )}
              
              {filter.type === 'select' && (
                <select
                  id={filter.id}
                  className="job-select-modern"
                  style={{ 
                    width: '100%', 
                    height: '40px', 
                    fontSize: '14px', 
                    borderRadius: '8px', 
                    padding: '0 12px', 
                    paddingRight: '32px' 
                  }}
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                >
                  <option value="">{filter.placeholder || `All ${filter.label}s`}</option>
                  {filter.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              
              {filter.type === 'location' && (
                <input
                  type="text"
                  id={filter.id}
                  className="job-select-modern"
                  style={{ 
                    width: '100%', 
                    height: '40px', 
                    fontSize: '14px', 
                    borderRadius: '8px', 
                    padding: '0 12px' 
                  }}
                  placeholder={filter.placeholder || "City or State"}
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                />
              )}
            </div>
          ))}

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="action-btn secondary"
                style={{ 
                  height: '40px', 
                  padding: '0 16px', 
                  fontSize: '13px', 
                  fontWeight: 500, 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px' 
                }}
                onClick={onClearFilters}
              >
                <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        {showResultsCount && (
          <div style={{ 
            marginTop: '16px', 
            paddingTop: '16px', 
            borderTop: '1px solid var(--border-color, #e2e8f0)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary, #64748b)' }}>
              {activeFiltersCount > 0 
                ? `Showing ${resultCount} of ${totalCount} results`
                : `Showing ${totalCount} results`
              }
            </span>
            {activeFiltersCount > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                {activeFiltersCount} {activeFiltersCount === 1 ? 'filter' : 'filters'} active
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// Helper functions for filter sizing
const getFilterFlex = (type: string): string => {
  switch (type) {
    case 'search': return '1 1 280px';
    case 'select': return '0 1 200px';
    case 'location': return '0 1 180px';
    default: return '0 1 auto';
  }
};

const getFilterMinWidth = (type: string): string => {
  switch (type) {
    case 'search': return '280px';
    case 'select': return '180px';
    case 'location': return '160px';
    default: return 'auto';
  }
};

export default FilterToolbar;