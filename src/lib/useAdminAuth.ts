'use client';

import { useState, useEffect } from 'react';

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedKey = typeof window !== 'undefined'
      ? (localStorage.getItem('admin_key') || localStorage.getItem('adminKey'))
      : null;

    if (storedKey) {
      setAdminKey(storedKey);
      setIsAuthenticated(true);
      setUserName(localStorage.getItem('admin_user_name') || '');
    }

    setLoading(false);
  }, []);

  const login = (key: string, name?: string) => {
    localStorage.setItem('admin_key', key);
    if (name) localStorage.setItem('admin_user_name', name);
    setAdminKey(key);
    setUserName(name || '');
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('admin_key');
    localStorage.removeItem('admin_user_name');
    setAdminKey('');
    setUserName('');
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    adminKey,
    userName,
    loading,
    login,
    logout,
  };
}
