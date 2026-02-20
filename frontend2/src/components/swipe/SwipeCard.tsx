import React, { useState, useRef, useEffect } from 'react';

interface Card {
  id: number;
  name: string;
  title: string;
  matchPercent: number;
  experience: number;
  location: string;
  salary: string;
  skills: string[];
  worktype: string;
  availability: string;
  profile_summary: string;
}

interface SwipeCardProps {
  card: Card;
  onLike: () => void;
  onPass: () => void;
  onAsk?: () => void;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ card, onLike, onPass, onAsk }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState<'right' | 'left' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    
    // Calculate rotation based on horizontal drag
    const rotation = deltaX * 0.1;
    const scale = Math.max(0.9, 1 - Math.abs(deltaX) * 0.001);
    
    cardRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg) scale(${scale})`;
    
    // Add visual feedback for like/pass
    const opacity = Math.max(0.3, 1 - Math.abs(deltaX) * 0.002);
    cardRef.current.style.opacity = opacity.toString();
  };

  const handleMouseUp = () => {
    if (!isDragging || !cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const deltaX = rect.left + rect.width / 2 - window.innerWidth / 2;
    
    if (Math.abs(deltaX) > 100) {
      // Swipe detected
      if (deltaX > 0) {
        handleLikeAction();
      } else {
        handlePassAction();
      }
    } else {
      // Snap back
      cardRef.current.style.transform = 'translate(0px, 0px) rotate(0deg) scale(1)';
      cardRef.current.style.opacity = '1';
    }
    
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleLikeAction = async () => {
    setIsLoading(true);
    setIsExiting('right');
    
    if (cardRef.current) {
      cardRef.current.classList.add('exit-right');
    }
    
    // Wait for animation then call callback
    setTimeout(() => {
      onLike();
      setIsLoading(false);
      setIsExiting(null);
    }, 600);
  };

  const handlePassAction = async () => {
    setIsLoading(true);
    setIsExiting('left');
    
    if (cardRef.current) {
      cardRef.current.classList.add('exit-left');
    }
    
    // Wait for animation then call callback
    setTimeout(() => {
      onPass();
      setIsLoading(false);
      setIsExiting(null);
    }, 600);
  };

  const handleAskAction = async () => {
    if (onAsk) {
      setIsLoading(true);
      await onAsk();
      setIsLoading(false);
    }
  };

  return (
    <div 
      ref={cardRef}
      className={`swipe-card active ${isExiting ? `exit-${isExiting}` : ''}`}
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Match percentage badge */}
      <div className="match-badge">
        {card.matchPercent}% Match
      </div>

      {/* Card Header */}
      <div className="card-header">
        <div className="candidate-avatar">
          {card.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="candidate-basic">
          <h2 className="candidate-name">{card.name}</h2>
          <h3 className="candidate-title">{card.title}</h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="card-body">
        <div className="info-section">
          <div className="info-item">
            <span className="info-label">Experience:</span>
            <span className="info-value">{card.experience} years</span>
          </div>
          <div className="info-item">
            <span className="info-label">Location:</span>
            <span className="info-value">{card.location}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Salary:</span>
            <span className="info-value">{card.salary}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Work Type:</span>
            <span className="info-value">{card.worktype}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Availability:</span>
            <span className="info-value">{card.availability}</span>
          </div>
        </div>

        <div className="skills-section">
          <h4>Key Skills</h4>
          <div className="skills-list">
            {card.skills.map((skill, index) => (
              <span key={index} className="skill-tag">{skill}</span>
            ))}
          </div>
        </div>

        <div className="summary-section">
          <h4>Profile Summary</h4>
          <p className="profile-summary">{card.profile_summary}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="card-actions">
        <button 
          className="action-btn pass-btn" 
          onClick={handlePassAction}
          disabled={isLoading}
        >
          Pass
        </button>
        
        {onAsk && (
          <button 
            className="action-btn ask-btn" 
            onClick={handleAskAction}
            disabled={isLoading}
          >
            Ask
          </button>
        )}
        
        <button 
          className="action-btn like-btn" 
          onClick={handleLikeAction}
          disabled={isLoading}
        >
          Like
        </button>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
};

export default SwipeCard;