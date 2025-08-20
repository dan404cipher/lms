import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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
    const response = await axios.post(`${API_BASE_URL}/sessions`, sessionData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getSessions(courseId?: string): Promise<{ success: boolean; data: { sessions: Session[] } }> {
    const params = courseId ? { courseId } : {};
    const response = await axios.get(`${API_BASE_URL}/sessions`, {
      params,
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getSession(sessionId: string): Promise<{ success: boolean; data: { session: Session } }> {
    const response = await axios.get(`${API_BASE_URL}/sessions/${sessionId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async updateSession(sessionId: string, updateData: Partial<SessionData>): Promise<{ success: boolean; data: { session: Session } }> {
    const response = await axios.put(`${API_BASE_URL}/sessions/${sessionId}`, updateData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async deleteSession(sessionId: string): Promise<{ success: boolean }> {
    const response = await axios.delete(`${API_BASE_URL}/sessions/${sessionId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async startSession(sessionId: string): Promise<{ success: boolean; data: { joinUrl: string } }> {
    const response = await axios.post(`${API_BASE_URL}/sessions/${sessionId}/start`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async endSession(sessionId: string): Promise<{ success: boolean }> {
    const response = await axios.post(`${API_BASE_URL}/sessions/${sessionId}/end`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async joinSession(sessionId: string): Promise<{ success: boolean; data: { joinUrl: string } }> {
    const response = await axios.post(`${API_BASE_URL}/sessions/${sessionId}/join`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Recording Management
  async getRecordings(courseId?: string): Promise<{ success: boolean; data: { recordings: Recording[] } }> {
    const params = courseId ? { courseId } : {};
    const response = await axios.get(`${API_BASE_URL}/sessions/recordings`, {
      params,
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getSessionRecordings(sessionId: string): Promise<{ success: boolean; data: { recordings: Recording[] } }> {
    const response = await axios.get(`${API_BASE_URL}/sessions/${sessionId}/recordings`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async downloadRecording(recordingId: string): Promise<Blob> {
    const response = await axios.get(`${API_BASE_URL}/sessions/recordings/${recordingId}/download`, {
      headers: this.getAuthHeaders(),
      responseType: 'blob'
    });
    return response.data;
  }

  async downloadRecordingToServer(sessionId: string): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await axios.post(`${API_BASE_URL}/sessions/${sessionId}/download-recording`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async checkForRecordings(sessionId: string): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await axios.post(`${API_BASE_URL}/sessions/${sessionId}/check-recordings`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async uploadRecording(sessionId: string, file: File): Promise<{ success: boolean; message: string; data?: any }> {
    const formData = new FormData();
    formData.append('recording', file);
    formData.append('title', `${file.name} - Recording`);
    
    const response = await axios.post(`${API_BASE_URL}/recordings/upload/${sessionId}`, formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async updateRecording(recordingId: string, updateData: { title?: string; isPublic?: boolean }): Promise<{ success: boolean }> {
    const response = await axios.put(`${API_BASE_URL}/sessions/recordings/${recordingId}`, updateData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async deleteRecording(recordingId: string): Promise<{ success: boolean }> {
    const response = await axios.delete(`${API_BASE_URL}/sessions/recordings/${recordingId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Attendance Management
  async getSessionAttendance(sessionId: string): Promise<{ success: boolean; data: { attendance: any[] } }> {
    const response = await axios.get(`${API_BASE_URL}/sessions/${sessionId}/attendance`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async markAttendance(sessionId: string): Promise<{ success: boolean }> {
    const response = await axios.post(`${API_BASE_URL}/sessions/${sessionId}/attendance`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Zoom Integration
  async createZoomMeeting(sessionData: {
    topic: string;
    start_time: string;
    duration: number;
    timezone?: string;
  }): Promise<{ success: boolean; data: { meetingId: string; joinUrl: string; password?: string } }> {
    const response = await axios.post(`${API_BASE_URL}/sessions/zoom/create`, sessionData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async updateZoomMeeting(meetingId: string, updateData: any): Promise<{ success: boolean }> {
    const response = await axios.put(`${API_BASE_URL}/sessions/zoom/${meetingId}`, updateData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async deleteZoomMeeting(meetingId: string): Promise<{ success: boolean }> {
    const response = await axios.delete(`${API_BASE_URL}/sessions/zoom/${meetingId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getZoomRecordings(meetingId: string): Promise<{ success: boolean; data: { recordings: any[] } }> {
    const response = await axios.get(`${API_BASE_URL}/sessions/zoom/${meetingId}/recordings`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  // Utility Methods
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
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
