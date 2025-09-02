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
            if(response.data.user && response.data.user.status!=="active"){
              localStorage.removeItem('access_token');
              localStorage.removeItem('token')
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
          // Let the service layer handle authentication errors
          // The service will automatically redirect to login if needed
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
