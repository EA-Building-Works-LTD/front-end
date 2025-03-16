/**
 * useSessionTimeout Hook
 * 
 * A React hook that integrates with the session manager to handle
 * session timeouts and inactivity detection.
 */

import { useEffect, useState, useCallback } from 'react';
import sessionManager from '../utils/sessionManager';

/**
 * Hook for session timeout management
 * @param {number} timeoutDuration - Timeout duration in milliseconds
 * @returns {Object} - Session timeout state and controls
 */
const useSessionTimeout = (timeoutDuration) => {
  const [isActive, setIsActive] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  
  // Function to manually reset the timer
  const resetTimer = useCallback(() => {
    try {
      if (sessionManager && typeof sessionManager.resetTimer === 'function') {
        sessionManager.resetTimer();
        setIsActive(true);
        setShowWarning(false);
      }
    } catch (error) {
      console.error('Error resetting session timer:', error);
    }
  }, []);
  
  // Initialize session manager on component mount
  useEffect(() => {
    try {
      // Initialize the session manager
      if (sessionManager && typeof sessionManager.init === 'function') {
        sessionManager.init(timeoutDuration);
      }
      
      // Add listener for timeout events
      let removeListener = () => {};
      if (sessionManager && typeof sessionManager.addTimeoutListener === 'function') {
        removeListener = sessionManager.addTimeoutListener(() => {
          setIsActive(false);
        });
      }
      
      // Clean up on unmount
      return () => {
        try {
          if (typeof removeListener === 'function') {
            removeListener();
          }
        } catch (error) {
          console.error('Error removing session timeout listener:', error);
        }
      };
    } catch (error) {
      console.error('Error in useSessionTimeout hook:', error);
      return () => {}; // Return empty cleanup function
    }
  }, [timeoutDuration]);
  
  return {
    isActive,
    showWarning,
    setShowWarning,
    resetTimer
  };
};

export default useSessionTimeout; 