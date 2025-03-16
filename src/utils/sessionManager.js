/**
 * Session Manager Utility
 * 
 * This utility manages user session timeouts and inactivity detection.
 * It will automatically log out users after a specified period of inactivity.
 */

// Default timeout in milliseconds (30 minutes)
const DEFAULT_TIMEOUT = 30 * 60 * 1000;

class SessionManager {
  constructor() {
    this.timeoutId = null;
    this.timeoutDuration = DEFAULT_TIMEOUT;
    this.listeners = [];
    this.isActive = true;
    this.initialized = false;
    this.boundHandleActivity = this.handleUserActivity.bind(this);
    this.boundHandleVisibility = this.handleVisibilityChange.bind(this);
  }

  /**
   * Initialize the session manager
   * @param {number} timeoutDuration - Timeout duration in milliseconds
   */
  init(timeoutDuration = DEFAULT_TIMEOUT) {
    // Prevent multiple initializations
    if (this.initialized) {
      this.resetTimer();
      return;
    }
    
    this.timeoutDuration = timeoutDuration;
    
    // Only set up listeners if we're in a browser environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.setupActivityListeners();
      this.resetTimer();
      this.initialized = true;
    }
  }

  /**
   * Set up event listeners to detect user activity
   */
  setupActivityListeners() {
    try {
      // List of events to track for user activity
      const events = [
        'mousedown', 'mousemove', 'keypress', 
        'scroll', 'touchstart', 'click', 'keydown'
      ];

      // Add event listeners
      events.forEach(event => {
        document.addEventListener(event, this.boundHandleActivity);
      });

      // Also track visibility changes
      document.addEventListener('visibilitychange', this.boundHandleVisibility);
    } catch (error) {
      console.error('Error setting up activity listeners:', error);
    }
  }

  /**
   * Handle user activity events
   */
  handleUserActivity() {
    if (!this.isActive) {
      // User became active again
      this.isActive = true;
    }
    this.resetTimer();
  }

  /**
   * Handle visibility change events (tab switching, etc.)
   */
  handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      // User returned to the tab
      this.resetTimer();
    }
  }

  /**
   * Reset the inactivity timer
   */
  resetTimer() {
    if (!this.initialized) return;
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    this.timeoutId = setTimeout(() => {
      this.handleInactivityTimeout();
    }, this.timeoutDuration);
  }

  /**
   * Handle inactivity timeout
   */
  async handleInactivityTimeout() {
    if (!this.initialized) return;
    
    this.isActive = false;
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in timeout listener:', error);
      }
    });
    
    // Log the user out
    try {
      // Instead of directly calling logout, redirect to logout URL
      window.location.href = '/logout';
    } catch (error) {
      console.error('Error logging out due to inactivity:', error);
    }
  }

  /**
   * Add a listener for inactivity timeout events
   * @param {Function} listener - Callback function
   * @returns {Function} - Function to remove the listener
   */
  addTimeoutListener(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
      
      // Return a function to remove this listener
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }
    return () => {}; // Return empty function if listener is invalid
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (!this.initialized) return;
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    try {
      // Remove event listeners
      const events = [
        'mousedown', 'mousemove', 'keypress', 
        'scroll', 'touchstart', 'click', 'keydown'
      ];
      
      events.forEach(event => {
        document.removeEventListener(event, this.boundHandleActivity);
      });
      
      document.removeEventListener('visibilitychange', this.boundHandleVisibility);
    } catch (error) {
      console.error('Error cleaning up session manager:', error);
    }
    
    this.initialized = false;
  }
}

// Create a singleton instance
const sessionManager = new SessionManager();

// Make it globally accessible
if (typeof window !== 'undefined') {
  window.sessionManager = sessionManager;
}

export default sessionManager; 