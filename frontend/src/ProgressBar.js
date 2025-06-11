import React, { useState, useEffect } from 'react';

const ProgressBar = ({ progress, label, status, showTime = false }) => {
  // UX FIX #4: Enhanced state management
  const percentage = typeof progress === 'number' ? Math.round(progress) : 0;
  const [startTime, setStartTime] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // UX FIX #4: Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // UX FIX #4: Time estimation
  useEffect(() => {
    if (percentage > 0 && !startTime) {
      setStartTime(Date.now());
    }
    
    if (startTime && percentage > 5 && percentage < 100) {
      const elapsed = Date.now() - startTime;
      const rate = percentage / elapsed;
      const remaining = (100 - percentage) / rate;
      setEstimatedTime(Math.round(remaining / 1000)); // in seconds
    }
  }, [percentage, startTime]);
  
  // UX FIX #4: Format time for display
  const formatTime = (seconds) => {
    if (!seconds || seconds < 0) return '';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  // UX FIX #4: Progress stage determination
  const getProgressStage = () => {
    if (percentage === 0) return 'starting';
    if (percentage < 25) return 'early';
    if (percentage < 75) return 'middle';
    if (percentage < 100) return 'late';
    return 'complete';
  };
  
  const progressStage = getProgressStage();
  
  return (
    <div className={`progress-container ${isMobile ? 'mobile' : ''} ${progressStage}`}>
      <div className="progress-header">
        <div className="progress-info">
          {label && <div className="progress-label">{label}</div>}
          <div className="progress-details">
            <span className="progress-percentage-header">{percentage}%</span>
            {showTime && estimatedTime && percentage > 5 && percentage < 95 && (
              <span className="progress-eta">~{formatTime(estimatedTime)} rămas</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="progress-bar-wrapper">
        <div 
          className="progress-bar-track"
        >
          <div 
            className="progress-bar-fill" 
            style={{ 
              width: `${percentage}%`,
              transition: 'width 0.3s ease-out'
            }}
          >
            {/* UX FIX #4: Animated shimmer effect */}
            <div className="progress-shimmer"></div>
          </div>
          
          {/* UX FIX #4: Progress markers */}
          {!isMobile && (
            <div className="progress-markers">
              {[25, 50, 75].map(mark => (
                <div 
                  key={mark}
                  className={`progress-marker ${percentage >= mark ? 'passed' : ''}`}
                  style={{ left: `${mark}%` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {status && (
        <div className="progress-status">
          {/* UX FIX #4: Status with icon */}
          <span className="status-icon">
            {percentage === 100 ? '✅' : percentage > 0 ? '⚡' : '⏳'}
          </span>
          <span className="status-text">{status}</span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;