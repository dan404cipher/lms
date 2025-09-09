import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance for auth requests
const authAxios = axios.create({
  baseURL: API_URL
});

// Add request interceptor to include auth token
authAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle token refresh
authAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Don't handle 401 errors for login requests - let them be handled by the login component
    if (error.response?.status === 401 && originalRequest.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh-token`, {
            refreshToken
          });
          
          if (response.data.success) {
            localStorage.setItem('token', response.data.data.token);
            localStorage.setItem('refreshToken', response.data.data.refreshToken);
            
            // Update the original request with new token
            originalRequest.headers.Authorization = `Bearer ${response.data.data.token}`;
            return authAxios(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: 'learner' | 'instructor';
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      credits: number;
      profile?: any;
    };
    token: string;
    refreshToken: string;
  };
}

class AuthService {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await authAxios.post('/auth/login', data);
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await authAxios.post('/auth/register', data);
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await authAxios.post('/auth/refresh-token', {
      refreshToken
    });
    return response.data;
  }

  async getProfile(): Promise<any> {
    const response = await authAxios.get('/auth/profile');
    return response.data;
  }

  async forgotPassword(email: string): Promise<any> {
    const response = await authAxios.post('/auth/forgot-password', { email });
    return response.data;
  }

  async validateResetToken(token: string): Promise<any> {
    const response = await authAxios.get(`/auth/reset-password/${token}`);
    return response.data;
  }

  async resetPassword(token: string, password: string): Promise<any> {
    const response = await authAxios.post(`/auth/reset-password/${token}`, { password });
    return response.data;
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<any> {
    const response = await authAxios.post('/auth/change-password', data);
    return response.data;
  }
}

export default new AuthService();
