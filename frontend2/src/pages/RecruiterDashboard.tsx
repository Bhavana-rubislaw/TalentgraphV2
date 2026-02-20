import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import { apiClient } from '../api/client';
import '../styles/Dashboard.css';

const RecruiterDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'recommendations' | 'matches'>('overview');
  const [jobs, setJobs] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [activeTab]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'jobs' || activeTab === 'overview') {
        const response = await apiClient.getJobPostings();
        setJobs(response.data);
      }
      
      if (activeTab === 'recommendations' || activeTab === 'overview') {
        const response = await apiClient.getRecommendationsDashboard();
        setRecommendations(response.data);
      }
      
      if (activeTab === 'matches') {
        const response = await apiClient.getMutualMatches();
        setMatches(response.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Recruiter Dashboard" subtitle="Manage jobs and find candidates">
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', backgroundColor: 'white', padding: '12px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
        <button
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('overview')}
          style={{ padding: '10px 16px', fontSize: '14px' }}
        >
          Overview
        </button>
        <button
          className={`btn ${activeTab === 'jobs' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('jobs')}
          style={{ padding: '10px 16px', fontSize: '14px' }}
        >
          Jobs ({jobs.length})
        </button>
        <button
          className={`btn ${activeTab === 'recommendations' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('recommendations')}
          style={{ padding: '10px 16px', fontSize: '14px' }}
        >
          Recommendations
        </button>
        <button
          className={`btn ${activeTab === 'matches' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('matches')}
          style={{ padding: '10px 16px', fontSize: '14px' }}
        >
          Matches ({matches.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px'
            }}>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>Total Jobs</h3>
                <p style={{ fontSize: '32px', fontWeight: '700', margin: 0, color: 'var(--primary)' }}>
                  {jobs.length}
                </p>
              </div>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>Total Matches</h3>
                <p style={{ fontSize: '32px', fontWeight: '700', margin: 0, color: 'var(--primary)' }}>
                  {matches.length}
                </p>
              </div>
              {recommendations && (
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>Recommendations</h3>
                  <p style={{ fontSize: '32px', fontWeight: '700', margin: 0, color: 'var(--primary)' }}>
                    {recommendations.total_jobs}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'jobs' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <a href="/recruiter/job-posting" className="btn btn-primary">
                + Create New Job
              </a>
              {jobs.map((job: any) => (
                <div key={job.id} style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0' }}>{job.job_title}</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                      {job.product_vendor} • {job.product_type}
                    </p>
                    <p style={{ margin: '8px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                      {job.location} • {job.salary_currency}{job.salary_min}k - {job.salary_max}k
                    </p>
                  </div>
                  <div>
                    <button className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                      Edit
                    </button>
                  </div>
                </div>
              ))}
              {jobs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No jobs posted yet
                </div>
              )}
            </div>
          )}

          {activeTab === 'recommendations' && recommendations && (
            <div style={{ display: 'grid', gap: '24px' }}>
              {recommendations.jobs.map((jobRec: any) => (
                <div key={jobRec.job_id} style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0' }}>{jobRec.job_title}</h3>
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>
                      Top Candidates: {jobRec.top_candidates.length}
                    </p>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {jobRec.top_candidates.map((cand: any) => (
                        <div key={cand.candidate_id} style={{
                          padding: '12px',
                          background: 'var(--bg-lighter)',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}>
                          <span>{cand.name}</span>
                          <span style={{ color: 'var(--primary)', fontWeight: '600' }}>
                            {cand.match_percent}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'matches' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              {matches.map((match: any) => (
                <div key={match.id} style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Match % {match.match_percentage}</h3>
                      <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                        Candidate ID: {match.candidate_id}
                      </p>
                    </div>
                    <button className="btn btn-primary" style={{ padding: '8px 16px' }}>
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
              {matches.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No matches yet
                </div>
              )}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
};

export default RecruiterDashboard;
