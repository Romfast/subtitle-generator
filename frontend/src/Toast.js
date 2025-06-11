import React, { useState, useEffect } from 'react';
import './Toast.css';

// UX FIX #5: Toast notification component for mobile feedback
const Toast = ({ message, type = 'info', duration = 3000, onClose, icon }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        onClose && onClose();
      }, 300); // Animation duration
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    if (icon) return icon;
    
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`toast toast-${type} ${isExiting ? 'toast-exit' : 'toast-enter'}`}>
      <span className="toast-icon">{getIcon()}</span>
      <span className="toast-message">{message}</span>
    </div>
  );
};

// UX FIX #5: Toast manager component
const ToastManager = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          icon={toast.icon}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

// UX FIX #5: Custom hook for toast management
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 3000, icon = null) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration, icon };
    
    setToasts(prev => [...prev, toast]);
    
    // UX FIX #5: Haptic feedback for toast notifications
    if (navigator.vibrate) {
      switch (type) {
        case 'success':
          navigator.vibrate([50, 50, 50]); // Triple short vibration
          break;
        case 'error':
          navigator.vibrate([100, 50, 100]); // Long-short-long pattern
          break;
        case 'warning':
          navigator.vibrate([75, 25, 75]); // Medium pattern
          break;
        default:
          navigator.vibrate(30); // Single short vibration
      }
    }
    
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    ToastManager: (props) => <ToastManager {...props} toasts={toasts} removeToast={removeToast} />
  };
};

export default Toast;