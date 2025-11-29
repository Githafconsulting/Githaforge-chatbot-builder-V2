import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';

interface SuperAdminAuthContextType {
  isSuperAdmin: boolean;
  superAdminToken: string | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextType | undefined>(undefined);

export const SuperAdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [superAdminToken, setSuperAdminToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to check and update auth state
  const checkAuthState = () => {
    const token = localStorage.getItem('super_admin_token');
    const isSuperAdminFlag = localStorage.getItem('is_super_admin') === 'true';

    if (token && isSuperAdminFlag) {
      setIsSuperAdmin(true);
      setSuperAdminToken(token);

      // Set the axios instance to use super admin token
      apiService.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      setIsSuperAdmin(false);
      setSuperAdminToken(null);
    }
  };

  useEffect(() => {
    // Check initial auth state
    checkAuthState();
    setLoading(false);

    // Listen for storage changes (login/logout in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'super_admin_token' || e.key === 'is_super_admin') {
        checkAuthState();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = (token: string) => {
    // Clear any regular user token to prevent conflicts
    // This ensures super admin session is completely isolated
    localStorage.removeItem('access_token');

    // Store super admin credentials
    localStorage.setItem('super_admin_token', token);
    localStorage.setItem('is_super_admin', 'true');

    // Update state immediately
    setIsSuperAdmin(true);
    setSuperAdminToken(token);

    // Set authorization header
    apiService.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = () => {
    // Clear super admin credentials
    localStorage.removeItem('super_admin_token');
    localStorage.removeItem('is_super_admin');

    // Remove authorization header
    delete apiService.api.defaults.headers.common['Authorization'];

    setIsSuperAdmin(false);
    setSuperAdminToken(null);
  };

  return (
    <SuperAdminAuthContext.Provider
      value={{
        isSuperAdmin,
        superAdminToken,
        loading,
        login,
        logout
      }}
    >
      {children}
    </SuperAdminAuthContext.Provider>
  );
};

export const useSuperAdminAuth = (): SuperAdminAuthContextType => {
  const context = useContext(SuperAdminAuthContext);
  if (context === undefined) {
    throw new Error('useSuperAdminAuth must be used within SuperAdminAuthProvider');
  }
  return context;
};
