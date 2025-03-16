import { useState, useEffect } from 'react';
import { onAuthStateChange, logout } from '../firebase/auth';

/**
 * Custom hook to handle Firebase authentication
 * @returns {Object} Authentication state and methods
 */
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((authUser) => {
      setUser(authUser);
      setAuthChecked(true);
      setLoading(false);
    }, (error) => {
      setError(error);
      setLoading(false);
      setAuthChecked(true);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      setUser(null);
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    setUser,
    authChecked,
    loading,
    error,
    logout: handleLogout
  };
};

export default useAuth; 