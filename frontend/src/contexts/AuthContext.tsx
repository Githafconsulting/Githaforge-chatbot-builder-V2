import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { getUserInfoFromToken, isTokenExpired, shouldRefreshToken } from '../utils/jwt';
import type { LoginCredentials, UnifiedSignupRequest } from '../types';

interface UserInfo {
  userId: string;
  companyId: string | null;
  role: string;
  isSuperAdmin: boolean;
  companyName?: string; // Display name for company or user
  fullName?: string; // User's full name
}

interface AuthContextType {
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: UnifiedSignupRequest) => Promise<void>;
  logout: () => void;
  refreshUserInfo: () => Promise<void>;
  loading: boolean;
  setAuthenticated: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Logout function - defined early so it can be used in effects
  const performLogout = useCallback(() => {
    localStorage.removeItem('access_token');
    setIsAuthenticated(false);
    setUserInfo(null);
  }, []);

  // Listen for auth:logout events from API interceptor
  useEffect(() => {
    const handleLogoutEvent = () => {
      console.warn('Received auth:logout event');
      performLogout();
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => window.removeEventListener('auth:logout', handleLogoutEvent);
  }, [performLogout]);

  // Proactive token refresh - refresh before expiration
  const refreshTokenIfNeeded = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Check if token is expired first
    if (isTokenExpired(token)) {
      console.warn('Token expired, logging out...');
      performLogout();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return;
    }

    // Check if token should be refreshed (within 5 minutes of expiry)
    if (shouldRefreshToken(token)) {
      try {
        console.log('Token expiring soon, refreshing...');
        await apiService.refreshToken();
        console.log('Token refreshed successfully');
      } catch (error) {
        console.error('Failed to refresh token:', error);
        // If refresh fails, let the token expire naturally
        // The next check will log out the user
      }
    }
  }, [performLogout]);

  // Periodically check token expiration and refresh if needed (every 30 seconds)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Check immediately on mount
    refreshTokenIfNeeded();

    const interval = setInterval(() => {
      refreshTokenIfNeeded();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshTokenIfNeeded]);

  useEffect(() => {
    // Check if token exists and decode it on mount
    const token = localStorage.getItem('access_token');
    if (token) {
      // Check if token is expired first
      if (isTokenExpired(token)) {
        console.warn('Token expired on mount, clearing...');
        localStorage.removeItem('access_token');
        setLoading(false);
        return;
      }

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
          // If we get a 401 here, token might be invalid/expired
          if ((err as any)?.response?.status === 401) {
            performLogout();
            setLoading(false);
            return;
          }
        }

        if (info.userId && info.companyId) {
          setUserInfo({
            userId: info.userId,
            companyId: info.companyId,
            role: info.role || 'member',
            isSuperAdmin: info.isSuperAdmin,
            companyName,
            fullName: info.fullName || undefined,
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
            fullName: info.fullName || undefined,
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
  }, [performLogout]);

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
          fullName: info.fullName || undefined,
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
          fullName: info.fullName || undefined,
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

  const refreshUserInfo = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      // Check if token is expired
      if (isTokenExpired(token)) {
        performLogout();
        return;
      }

      // Fetch current user data from database (to get latest name changes)
      const currentUser = await apiService.getCurrentUser();

      // Get token info for company/super admin status
      const tokenInfo = getUserInfoFromToken(token);

      // Fetch company name
      let companyName = 'Workspace';
      try {
        if (tokenInfo.isSuperAdmin) {
          companyName = 'Super Admin';
        } else {
          const company = await apiService.getCompanySettings();

          if (company.is_personal) {
            const email = currentUser.email || '';
            companyName = email.split('@')[0] || 'Personal Workspace';
          } else {
            companyName = company.name || 'Company';
          }
        }
      } catch (err) {
        console.error('Failed to fetch company name during refresh:', err);
      }

      // Update user info with fresh data from database
      if (currentUser.id && currentUser.company_id) {
        setUserInfo({
          userId: currentUser.id,
          companyId: currentUser.company_id,
          role: currentUser.role || 'member',
          isSuperAdmin: tokenInfo.isSuperAdmin,
          companyName,
          fullName: currentUser.full_name || undefined,
        });
      } else if (currentUser.id && tokenInfo.isSuperAdmin) {
        setUserInfo({
          userId: currentUser.id,
          companyId: null,
          role: currentUser.role || 'super_admin',
          isSuperAdmin: true,
          companyName,
          fullName: currentUser.full_name || undefined,
        });
      }
    } catch (error) {
      console.error('Failed to refresh user info:', error);
    }
  };

  const setAuthenticated = (value: boolean) => {
    setIsAuthenticated(value);
    if (!value) {
      setUserInfo(null);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userInfo, login, signup, logout, refreshUserInfo, loading, setAuthenticated }}>
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
