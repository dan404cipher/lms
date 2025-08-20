import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

interface AuthContextType {
  user: any;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
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
          } else {
            // Invalid response format, clear tokens
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            setUser(null);
          }
        })
        .catch(async (error) => {
          console.log('Profile fetch failed:', error.response?.status);
          
          // If token is expired, try to refresh
          if (error.response?.status === 401) {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              try {
                const refreshResponse = await authService.refreshToken(refreshToken);
                if (refreshResponse.success) {
                  localStorage.setItem('token', refreshResponse.data.token);
                  localStorage.setItem('refreshToken', refreshResponse.data.refreshToken);
                  setUser(refreshResponse.data.user);
                  return;
                }
              } catch (refreshError) {
                console.log('Token refresh failed:', refreshError);
              }
            }
          }
          
          // Clear invalid tokens
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    setUser(response.data.user);
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

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
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
