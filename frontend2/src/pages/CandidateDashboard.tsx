import React, { useState, useEffect } from 'react';
import SwipeCard from '../components/swipe/SwipeCard';
import PageContainer from '../components/PageContainer';
import { apiClient } from '../api/client';
import '../styles/SwipeCard.css';

// Mock data for demo
const MOCK_CARDS = [
  {
    id: 1,
    name: 'Sarah Chen',
    title: 'Senior Software Engineer',
    matchPercent: 92,
    experience: 6,
    location: 'San Francisco, CA',
    salary: '$150k - $200k',
    skills: ['Python', 'React', 'AWS', 'Kubernetes'],
    worktype: 'Remote',
    availability: 'Immediate',
    profile_summary: 'Passionate full-stack developer with 6+ years of experience in building scalable web applications.',
  },
  {
    id: 2,
    name: 'Marcus Rodriguez',
    title: 'Product Manager',
    matchPercent: 85,
    experience: 5,
    location: 'Austin, TX',
    salary: '$120k - $160k',
    skills: ['Product Strategy', 'Analytics', 'Agile', 'Leadership'],
    worktype: 'Hybrid',
    availability: '2 weeks notice',
    profile_summary: 'Results-driven PM with track record of launching successful products. Strong technical background.',
  },
  {
    id: 3,
    name: 'Elena Kowalski',
    title: 'Data Scientist',
    matchPercent: 78,
    experience: 4,
    location: 'New York, NY',
    salary: '$130k - $180k',
    skills: ['Python', 'ML', 'TensorFlow', 'SQL'],
    worktype: 'On-site',
    availability: '1 month notice',
    profile_summary: 'Experienced data scientist specialized in building predictive models for e-commerce platforms.',
  },
];

const CandidateDashboard: React.FC = () => {
  const [cards, setCards] = useState(MOCK_CARDS);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleLike = async () => {
    console.log('Liked:', cards[currentIndex].name);
    setCurrentIndex(currentIndex + 1);
  };

  const handlePass = async () => {
    console.log('Passed:', cards[currentIndex].name);
    setCurrentIndex(currentIndex + 1);
  };

  const handleAsk = async () => {
    console.log('Asked to apply:', cards[currentIndex].name);
    setCurrentIndex(currentIndex + 1);
  };

  if (currentIndex >= cards.length) {
    return (
      <PageContainer title="All Out!" subtitle="No more profiles to review">
        <div
          style={{
            maxWidth: '450px',
            margin: '0 auto',
            textAlign: 'center',
            padding: '60px 40px',
            background: 'white',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            You've reviewed all available profiles. Check back later for more matches!
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setCurrentIndex(0)}
          >
            Start Over
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Find Your Match" subtitle="Swipe through opportunities">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 300px)',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '450px',
            height: '600px',
          }}
        >
          <SwipeCard
            card={cards[currentIndex]}
            onLike={handleLike}
            onPass={handlePass}
            onAsk={handleAsk}
          />
        </div>

        {/* Progress */}
        <div
          style={{
            marginTop: '20px',
            color: 'var(--text-muted)',
            fontSize: '14px',
          }}
        >
          {currentIndex + 1} of {cards.length}
        </div>
      </div>
    </PageContainer>
  );
};

export default CandidateDashboard;
