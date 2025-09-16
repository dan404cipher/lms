import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Create axios instance with auth interceptor
const activityAxios = axios.create({ baseURL: API_URL });

activityAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

activityAxios.interceptors.response.use(
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
            return activityAxios(error.config);
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

class ActivityService {
  async getMyActivities(params?: {
    page?: number;
    limit?: number;
    type?: string;
    courseId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const response = await activityAxios.get('/activities/my-activities', { params });
    return response.data;
  }

  async getActivityStats() {
    const response = await activityAxios.get('/activities/stats');
    return response.data;
  }

  async getActivityTypes() {
    const response = await activityAxios.get('/activities/types');
    return response.data;
  }

  async exportActivities(params?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    courseId?: string;
    search?: string;
  }) {
    const response = await activityAxios.get('/activities/export', { params });
    return response.data;
  }

  async deleteActivity(activityId: string) {
    const response = await activityAxios.delete(`/activities/${activityId}`);
    return response.data;
  }
}

export default new ActivityService();
