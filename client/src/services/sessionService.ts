import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance with auth interceptor
const sessionAxios = axios.create({ baseURL: API_BASE_URL });

sessionAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

sessionAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken
          });
          if (refreshResponse.data.success) {
            localStorage.setItem('token', refreshResponse.data.data.token);
            localStorage.setItem('refreshToken', refreshResponse.data.data.refreshToken);
            error.config.headers.Authorization = `Bearer ${refreshResponse.data.data.token}`;
            return sessionAxios(error.config);
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

export interface SessionData {
  courseId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number; // in minutes
  type?: 'live-class' | 'office-hours' | 'review' | 'quiz' | 'assignment' | 'discussion' | 'residency';
  maxParticipants?: number;
}

export interface Session {
  _id: string;
  courseId: string;
  instructorId: string;
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  endTime: string;
  type: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  zoomMeetingId?: string;
  joinUrl?: string;
  recordingUrl?: string;
  hasRecording: boolean;
  maxParticipants?: number;
  isLive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Recording {
  _id: string;
  sessionId: string;
  title: string;
  recordingUrl: string;
  duration: number;
  recordedAt: string;
  viewCount: number;
  isPublic: boolean;
}

class SessionService {
  // Session Management
  async createSession(sessionData: SessionData): Promise<{ success: boolean; data: { session: Session } }> {
    const response = await sessionAxios.post('/sessions', sessionData);
    return response.data;
  }

  async getSessions(courseId?: string): Promise<{ success: boolean; data: { sessions: Session[] } }> {
    const params = courseId ? { courseId } : {};
    const response = await sessionAxios.get('/sessions', { params });
    return response.data;
  }

  async getSession(sessionId: string): Promise<{ success: boolean; data: { session: Session } }> {
    const response = await sessionAxios.get(`/sessions/${sessionId}`);
    return response.data;
  }

  async updateSession(sessionId: string, updateData: Partial<SessionData>): Promise<{ success: boolean; data: { session: Session } }> {
    const response = await sessionAxios.put(`/sessions/${sessionId}`, updateData);
    return response.data;
  }

  async deleteSession(sessionId: string): Promise<{ success: boolean }> {
    const response = await sessionAxios.delete(`/sessions/${sessionId}`);
    return response.data;
  }

  async startSession(sessionId: string): Promise<{ success: boolean; data: { joinUrl: string } }> {
    const response = await sessionAxios.post(`/sessions/${sessionId}/start`, {});
    return response.data;
  }

  async endSession(sessionId: string): Promise<{ success: boolean }> {
    const response = await sessionAxios.post(`/sessions/${sessionId}/end`, {});
    return response.data;
  }

  async joinSession(sessionId: string): Promise<{ success: boolean; data: { joinUrl: string } }> {
    const response = await sessionAxios.post(`/sessions/${sessionId}/join`, {});
    return response.data;
  }

  async leaveSession(sessionId: string): Promise<{ success: boolean }> {
    const response = await sessionAxios.post(`/sessions/${sessionId}/leave`, {});
    return response.data;
  }

  // Recording Management
  async getRecordings(courseId?: string): Promise<{ success: boolean; data: { recordings: Recording[] } }> {
    const params = courseId ? { courseId } : {};
    const response = await sessionAxios.get('/sessions/recordings', { params });
    return response.data;
  }

  async getSessionRecordings(sessionId: string): Promise<{ success: boolean; data: { recordings: Recording[] } }> {
    const response = await sessionAxios.get(`/sessions/${sessionId}/recordings`);
    return response.data;
  }

  async syncRecordings(): Promise<{ success: boolean; data: any }> {
    const response = await sessionAxios.post('/sessions/sync-recordings');
    return response.data;
  }

  async downloadRecordingManually(sessionId: string): Promise<{ success: boolean; data: any }> {
    const response = await sessionAxios.post(`/sessions/${sessionId}/download-recording`);
    return response.data;
  }

  async downloadRecording(recordingId: string): Promise<Blob> {
    const response = await sessionAxios.get(`/sessions/recordings/${recordingId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async downloadRecordingToServer(sessionId: string): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await sessionAxios.post(`/sessions/${sessionId}/download-recording`, {});
    return response.data;
  }

  async checkForRecordings(sessionId: string): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await sessionAxios.post(`/sessions/${sessionId}/check-recordings`, {});
    return response.data;
  }

  async uploadRecording(sessionId: string, file: File): Promise<{ success: boolean; message: string; data?: any }> {
    const formData = new FormData();
    formData.append('recording', file);
    formData.append('title', `${file.name} - Recording`);
    
    const response = await sessionAxios.post(`/recordings/upload/${sessionId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async updateRecording(recordingId: string, updateData: { title?: string; isPublic?: boolean }): Promise<{ success: boolean }> {
    const response = await sessionAxios.put(`/sessions/recordings/${recordingId}`, updateData);
    return response.data;
  }

  async deleteRecording(recordingId: string): Promise<{ success: boolean }> {
    const response = await sessionAxios.delete(`/sessions/recordings/${recordingId}`);
    return response.data;
  }

  // Attendance Management
  async getSessionAttendance(sessionId: string): Promise<{ success: boolean; data: { attendance: any[] } }> {
    const response = await sessionAxios.get(`/sessions/${sessionId}/attendance`);
    return response.data;
  }

  async markAttendance(sessionId: string): Promise<{ success: boolean }> {
    const response = await sessionAxios.post(`/sessions/${sessionId}/attendance`, {});
    return response.data;
  }

  // Zoom Integration
  async createZoomMeeting(sessionData: {
    topic: string;
    start_time: string;
    duration: number;
    timezone?: string;
  }): Promise<{ success: boolean; data: { meetingId: string; joinUrl: string; password?: string } }> {
    const response = await sessionAxios.post('/sessions/zoom/create', sessionData);
    return response.data;
  }

  async updateZoomMeeting(meetingId: string, updateData: any): Promise<{ success: boolean }> {
    const response = await sessionAxios.put(`/sessions/zoom/${meetingId}`, updateData);
    return response.data;
  }

  async deleteZoomMeeting(meetingId: string): Promise<{ success: boolean }> {
    const response = await sessionAxios.delete(`/sessions/zoom/${meetingId}`);
    return response.data;
  }

  async getZoomRecordings(meetingId: string): Promise<{ success: boolean; data: { recordings: any[] } }> {
    const response = await sessionAxios.get(`/sessions/zoom/${meetingId}/recordings`);
    return response.data;
  }



  // Helper method to format session time
  formatSessionTime(scheduledAt: string, duration: number): { startTime: string; endTime: string } {
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + duration * 60000);
    
    return {
      startTime: start.toLocaleString(),
      endTime: end.toLocaleString()
    };
  }

  // Helper method to check if session is live
  isSessionLive(scheduledAt: string, duration: number): boolean {
    const now = new Date();
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + duration * 60000);
    
    return now >= start && now <= end;
  }

  // Helper method to get session status
  getSessionStatus(scheduledAt: string, duration: number, status: string): 'upcoming' | 'live' | 'ended' | 'cancelled' {
    if (status === 'cancelled') return 'cancelled';
    
    const now = new Date();
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + duration * 60000);
    
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'live';
    return 'ended';
  }
}

export default new SessionService();
