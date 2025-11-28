import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { getUserInfoFromToken } from '../utils/jwt';
import type { LoginCredentials, UnifiedSignupRequest } from '../types';

interface UserInfo {
  userId: string;
  companyId: string | null;
  role: string;
  isSuperAdmin: boolean;
  companyName?: string; // Display name for company or user
}

interface AuthContextType {
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: UnifiedSignupRequest) => Promise<void>;
  logout: () => void;
  loading: boolean;
  setAuthenticated: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token exists and decode it on mount
    const token = localStorage.getItem('access_token');
    if (token) {
      const info = getUserInfoFromToken(token);

      const fetchCompanyNameOnMount = async () => {
        let companyName = 'Workspace';
        try {
          if (info.isSuperAdmin) {
            companyName = 'Super Admin';
          } else {
            const company = await apiService.getCompanySettings();

            if (company.is_personal) {
              const email = info.email || '';
              companyName = email.split('@')[0] || 'Personal Workspace';
            } else {
              companyName = company.name || 'Company';
            }
          }
        } catch (err) {
          console.error('Failed to fetch company name on mount:', err);
        }

        if (info.userId && info.companyId) {
          setUserInfo({
            userId: info.userId,
            companyId: info.companyId,
            role: info.role || 'member',
            isSuperAdmin: info.isSuperAdmin,
            companyName,
          });
          setIsAuthenticated(true);
        } else if (info.userId && info.isSuperAdmin) {
          // Super admin user (no company_id)
          setUserInfo({
            userId: info.userId,
            companyId: null,
            role: info.role || 'super_admin',
            isSuperAdmin: true,
            companyName,
          });
          setIsAuthenticated(true);
        } else {
          // Invalid token
          localStorage.removeItem('access_token');
          setIsAuthenticated(false);
        }
        setLoading(false);
      };

      fetchCompanyNameOnMount();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await apiService.login(credentials);
      // Token is now stored in apiService.login() method

      // Decode token to get user info
      const token = localStorage.getItem('access_token');
      if (token) {
        const info = getUserInfoFromToken(token);

        // Fetch company name
        let companyName = 'Workspace';
        try {
          if (info.isSuperAdmin) {
            companyName = 'Super Admin';
          } else {
            const company = await apiService.getCompanySettings();

            // Check if personal account
            if (company.is_personal) {
              // Try to get user's full name from token email
              const email = info.email || '';
              companyName = email.split('@')[0] || 'Personal Workspace';
            } else {
              companyName = company.name || 'Company';
            }
          }
        } catch (err) {
          console.error('Failed to fetch company name:', err);
        }

        setUserInfo({
          userId: info.userId!,
          companyId: info.companyId,
          role: info.role || 'member',
          isSuperAdmin: info.isSuperAdmin,
          companyName,
        });
      }

      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    }
  };

  const signup = async (data: UnifiedSignupRequest) => {
    try {
      const response = await apiService.signup(data);
      // Token is stored in apiService.signup() method

      // Decode token to get user info
      const token = localStorage.getItem('access_token');
      if (token) {
        const info = getUserInfoFromToken(token);

        // Fetch company name
        let companyName = 'Workspace';
        try {
          const company = await apiService.getCompanySettings();

          // Check if personal account
          if (company.is_personal) {
            const email = info.email || '';
            companyName = email.split('@')[0] || 'Personal Workspace';
          } else {
            companyName = company.name || 'Company';
          }
        } catch (err) {
          console.error('Failed to fetch company name:', err);
        }

        setUserInfo({
          userId: info.userId!,
          companyId: info.companyId,
          role: info.role || 'owner',
          isSuperAdmin: info.isSuperAdmin,
          companyName,
        });
      }

      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setIsAuthenticated(false);
    setUserInfo(null);
  };

  const setAuthenticated = (value: boolean) => {
    setIsAuthenticated(value);
    if (!value) {
      setUserInfo(null);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userInfo, login, signup, logout, loading, setAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
