'use client';

import { useState, useEffect } from 'react';

function getInitialAuthState() {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, adminKey: '', userName: '', loading: true };
  }
  const storedKey = localStorage.getItem('admin_key') || localStorage.getItem('adminKey');
  if (storedKey) {
    document.cookie = 'admin_verified=1; path=/; max-age=86400; SameSite=Lax';
    return {
      isAuthenticated: true,
      adminKey: storedKey,
      userName: localStorage.getItem('admin_user_name') || '',
      loading: false,
    };
  }
  return { isAuthenticated: false, adminKey: '', userName: '', loading: false };
}

export function useAdminAuth() {
  const [state, setState] = useState(getInitialAuthState);

  const login = (key: string, name?: string) => {
    localStorage.setItem('admin_key', key);
    if (name) localStorage.setItem('admin_user_name', name);
    document.cookie = 'admin_verified=1; path=/; max-age=86400; SameSite=Lax';
    setState({ isAuthenticated: true, adminKey: key, userName: name || '', loading: false });
  };

  const logout = () => {
    localStorage.removeItem('admin_key');
    localStorage.removeItem('admin_user_name');
    document.cookie = 'admin_verified=; path=/; max-age=0';
    setState({ isAuthenticated: false, adminKey: '', userName: '', loading: false });
  };

  return {
    isAuthenticated: state.isAuthenticated,
    adminKey: state.adminKey,
    userName: state.userName,
    loading: state.loading,
    login,
    logout,
  };
}
