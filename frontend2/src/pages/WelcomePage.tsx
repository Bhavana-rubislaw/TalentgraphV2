import React from 'react';
import PageContainer from '../components/PageContainer';
import { useNavigate } from 'react-router-dom';
import '../styles/Form.css';

const WelcomePage: React.FC = () => {
  console.log('[COMPONENT MOUNT] WelcomePage loaded');
  const navigate = useNavigate();
  const fullName = localStorage.getItem('full_name') || 'User';
  console.log('[USER INFO] Welcome page for:', fullName);

  return (
    <PageContainer title={`Welcome, ${fullName}!`} subtitle="Let's get you started">
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center',
          padding: '60px 40px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h2 style={{ marginBottom: '20px' }}>Ready to find your next opportunity?</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '40px' }}>
          Set up your profile to get matched with amazing job opportunities.
        </p>

        <button
          onClick={() => { console.log('[NAVIGATION] To Profile Setup'); navigate('/candidate/profile'); }}
          className="btn btn-primary"
          style={{ padding: '14px 40px', fontSize: '16px', marginRight: '10px' }}
        >
          Set Up Your Profile
        </button>
        
        <button
          onClick={() => { console.log('[NAVIGATION] To Dashboard'); navigate('/candidate-dashboard'); }}
          className="btn btn-secondary"
          style={{ padding: '14px 40px', fontSize: '16px' }}
        >
          Go to Dashboard
        </button>
      </div>
    </PageContainer>
  );
};

export default WelcomePage;
