import React, { createContext, useContext, useState, useEffect } from 'react';
import authService, { setGlobalErrorHandler } from '../services/authService';

interface AuthContextType {
  user: any;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
  handleApiError: (error: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authService.getProfile()
        .then(response => {
          if (response.success) {
            setUser(response.data.user);
            // Check if user status is not active and logout if so
            if (response.data.user && response.data.user.status !== 'active') {
              console.log('User status is not active:', response.data.user.status);
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
              setUser(null);
            }
          } else {
            // Invalid response format, clear tokens
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            setUser(null);
          }
        })
        .catch((error) => {
          console.log('Profile fetch failed:', error.response?.status);
          console.log('Profile fetch error:', error);
          
          // Check if error is due to inactive/suspended status
          if (error.response?.status === 401 && error.response?.data?.status) {
            console.log('User account is inactive or suspended:', error.response.data.status);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            setUser(null);
          } else {
            // Let the service layer handle other authentication errors
            setUser(null);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      setUser(response.data.user);
    } catch (error) {
      // Re-throw the error so the Login component can handle it
      throw error;
    }
  };

  const register = async (data: any) => {
    const response = await authService.register(data);
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    setUser(response.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  // Function to check user status periodically
  const checkUserStatus = async () => {
    if (!user) return;
    
    try {
      const response = await authService.getProfile();
      if (response.success && response.data.user) {
        // If user status changed to inactive/suspended, logout
        if (response.data.user.status !== 'active') {
          console.log('User status changed to:', response.data.user.status, '- logging out');
          alert(`Your account has been ${response.data.user.status}. You have been logged out.`);
          logout();
        }
      }
    } catch (error) {
      // If profile fetch fails due to status change, logout
      if (error.response?.status === 401 && error.response?.data?.status) {
        console.log('User account status changed:', error.response.data.status, '- logging out');
        alert(`Your account has been ${error.response.data.status}. You have been logged out.`);
        logout();
      }
    }
  };

  // Function to handle API errors that might indicate status change
  const handleApiError = (error: any) => {
    if (error.response?.status === 401 && error.response?.data?.status) {
      console.log('API error indicates user status change:', error.response.data.status, '- logging out');
      alert(`Your account has been ${error.response.data.status}. You have been logged out.`);
      logout();
    }
  };

  // Register the error handler with the auth service
  useEffect(() => {
    setGlobalErrorHandler(handleApiError);
  }, []);

  // Set up periodic status check every 30 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(checkUserStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  // Check user status when page becomes visible (user switches back to tab)
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkUserStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, handleApiError }}>
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
