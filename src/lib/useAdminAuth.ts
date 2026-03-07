'use client';

import { useState, useEffect } from 'react';

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if admin key is stored in localStorage
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem('adminKey') : null;

    if (storedKey) {
      setAdminKey(storedKey);
      setIsAuthenticated(true);
    }

    setLoading(false);
  }, []);

  const login = (key: string) => {
    localStorage.setItem('adminKey', key);
    setAdminKey(key);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('adminKey');
    setAdminKey('');
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    adminKey,
    loading,
    login,
    logout,
  };
}
