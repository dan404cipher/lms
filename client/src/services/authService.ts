import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

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
    };
    token: string;
    refreshToken: string;
  };
}

class AuthService {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await axios.post(`${API_URL}/auth/login`, data);
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await axios.post(`${API_URL}/auth/register`, data);
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await axios.post(`${API_URL}/auth/refresh-token`, {
      refreshToken
    });
    return response.data;
  }

  async getProfile(): Promise<any> {
    const response = await axios.get(`${API_URL}/auth/profile`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`
    };
  }
}

export default new AuthService();
