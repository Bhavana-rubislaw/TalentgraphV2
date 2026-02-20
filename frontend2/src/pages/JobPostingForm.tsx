import React, { useState } from 'react';
import PageContainer from '../components/PageContainer';
import { apiClient } from '../api/client';
import '../styles/Form.css';

const JobPostingForm: React.FC = () => {
  const [formData, setFormData] = useState({
    job_title: '',
    product_vendor: 'Oracle',
    product_type: '',
    job_role: '',
    seniority_level: '',
    worktype: 'remote',
    location: '',
    employment_type: 'ft',
    start_date: '',
    salary_min: '',
    salary_max: '',
    salary_currency: 'usd',
    job_description: '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.createJobPosting({
        ...formData,
        salary_min: parseFloat(formData.salary_min),
        salary_max: parseFloat(formData.salary_max),
      });
      alert('Job posting created successfully!');
      window.location.href = '/recruiter-dashboard';
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create job posting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Create Job Posting" subtitle="Post a new opportunity">
      <div style={{
        maxWidth: '700px',
        margin: '0 auto',
        padding: '40px',
        background: 'white',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Job Title *
            </label>
            <input
              type="text"
              name="job_title"
              value={formData.job_title}
              onChange={handleInputChange}
              placeholder="e.g., Senior Software Engineer"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Product Vendor *
              </label>
              <select name="product_vendor" value={formData.product_vendor} onChange={handleInputChange}>
                <option>Oracle</option>
                <option>SAP</option>
                <option>Salesforce</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Product Type *
              </label>
              <input
                type="text"
                name="product_type"
                value={formData.product_type}
                onChange={handleInputChange}
                placeholder="e.g., ERP, CRM"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Job Role *
              </label>
              <input
                type="text"
                name="job_role"
                value={formData.job_role}
                onChange={handleInputChange}
                placeholder="e.g., Developer, Consultant"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Seniority Level *
              </label>
              <input
                type="text"
                name="seniority_level"
                value={formData.seniority_level}
                onChange={handleInputChange}
                placeholder="e.g., 2-3 years"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Work Type *
              </label>
              <select name="worktype" value={formData.worktype} onChange={handleInputChange}>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Employment Type *
              </label>
              <select name="employment_type" value={formData.employment_type} onChange={handleInputChange}>
                <option value="ft">Full-time</option>
                <option value="pt">Part-time</option>
                <option value="contract">Contract</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., San Francisco, CA"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Start Date *
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Salary Min *
              </label>
              <input
                type="number"
                name="salary_min"
                value={formData.salary_min}
                onChange={handleInputChange}
                placeholder="e.g., 120"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Salary Max *
              </label>
              <input
                type="number"
                name="salary_max"
                value={formData.salary_max}
                onChange={handleInputChange}
                placeholder="e.g., 180"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Currency *
              </label>
              <select name="salary_currency" value={formData.salary_currency} onChange={handleInputChange}>
                <option value="usd">USD</option>
                <option value="gbp">GBP</option>
                <option value="eur">EUR</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Job Description *
            </label>
            <textarea
              name="job_description"
              value={formData.job_description}
              onChange={handleInputChange}
              placeholder="Describe the job role, responsibilities, and requirements..."
              style={{ minHeight: '120px' }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '700',
              marginTop: '30px',
            }}
          >
            {loading ? 'Creating Job...' : 'Create Job Posting'}
          </button>
        </form>
      </div>
    </PageContainer>
  );
};

export default JobPostingForm;
