import React from 'react';

const ProgressBar = ({ progress, label, status }) => {
  // Convertim progresul în procentaj pentru afișare
  const percentage = typeof progress === 'number' ? Math.round(progress) : 0;
  
  return (
    <div className="progress-container">
      {label && <div className="progress-label">{label}</div>}
      <div className="progress-bar-wrapper">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${percentage}%` }}
        >
          <span className="progress-percentage">{percentage}%</span>
        </div>
      </div>
      {status && <div className="progress-status">{status}</div>}
    </div>
  );
};

export default ProgressBar;