import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Create axios instance with auth interceptor
const userSettingsAxios = axios.create({ baseURL: API_URL });

userSettingsAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

userSettingsAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshResponse = await axios.post(`${API_URL}/auth/refresh-token`, {
            refreshToken
          });
          if (refreshResponse.data.success) {
            localStorage.setItem('token', refreshResponse.data.data.token);
            localStorage.setItem('refreshToken', refreshResponse.data.data.refreshToken);
            error.config.headers.Authorization = `Bearer ${refreshResponse.data.data.token}`;
            return userSettingsAxios(error.config);
          }
        } catch (refreshError) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  language: string;
  timezone: string;
  compactMode: boolean;
  twoFactorAuth: boolean;
  profileVisibility: boolean;
}

export interface SystemSettings {
  siteName: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  maxFileSize: number;
  allowedFileTypes: string[];
  emailNotifications: boolean;
  maxUsers: number;
  maxCourses: number;
  sessionTimeout: number;
  backupFrequency: string;
}

class UserSettingsService {
  // User Settings
  async getUserSettings(): Promise<{ success: boolean; data: { settings: UserSettings } }> {
    const response = await userSettingsAxios.get('/users/settings');
    return response.data;
  }

  async updateUserSettings(settings: Partial<UserSettings>): Promise<{ success: boolean; data: { settings: UserSettings }; message: string }> {
    const response = await userSettingsAxios.put('/users/settings', settings);
    return response.data;
  }

  // System Settings (Admin only)
  async getSystemSettings(): Promise<{ success: boolean; data: { settings: SystemSettings } }> {
    const response = await userSettingsAxios.get('/admin/settings');
    return response.data;
  }

  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<{ success: boolean; data: { settings: SystemSettings }; message: string }> {
    const response = await userSettingsAxios.put('/admin/settings', settings);
    return response.data;
  }
}

export default new UserSettingsService();
