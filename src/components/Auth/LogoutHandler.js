/**
 * Logout Handler Component
 * 
 * A simple component that handles logout redirects.
 * It automatically logs the user out and redirects to the login page.
 */

import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { logout } from '../../firebase/auth';

const LogoutHandler = () => {
  useEffect(() => {
    const performLogout = async () => {
      try {
        // Clean up session manager
        if (window.sessionManager && typeof window.sessionManager.cleanup === 'function') {
          try {
            window.sessionManager.cleanup();
          } catch (error) {
            console.error('Error cleaning up session manager:', error);
          }
        }
        
        // Perform logout
        await logout();
      } catch (error) {
        console.error('Error during logout:', error);
      }
    };
    
    performLogout();
  }, []);
  
  return <Navigate to="/login" replace />;
};

export default LogoutHandler; 