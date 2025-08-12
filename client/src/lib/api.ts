import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance with auth token
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Connection management
  async getMyConnections() {
    const response = await apiClient.get('/connections');
    return response.data;
  },

  async sendConnectionRequest(userId: string) {
    const response = await apiClient.post('/connections', { recipientId: userId });
    return response.data;
  },

  async acceptConnection(connectionId: string) {
    const response = await apiClient.put(`/connections/${connectionId}/accept`);
    return response.data;
  },

  async rejectConnection(connectionId: string) {
    const response = await apiClient.put(`/connections/${connectionId}/reject`);
    return response.data;
  },

  // Messaging
  async sendMessage(receiverId: string, text: string, replyTo?: string, files?: File[]) {
    const formData = new FormData();
    formData.append('receiverId', receiverId);
    if (text) formData.append('text', text);
    if (replyTo) formData.append('replyTo', replyTo);
    
    if (files) {
      files.forEach(file => {
        formData.append('files', file);
      });
    }

    const response = await apiClient.post('/chat/send', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getChat(userId: string) {
    const response = await apiClient.get(`/chat/${userId}`);
    return response.data;
  },

  async markMessagesAsRead(userId: string) {
    const response = await apiClient.put(`/chat/${userId}/read`);
    return response.data;
  },

  async getUnreadMessageCount() {
    const response = await apiClient.get('/chat/unread-count');
    return response.data;
  },

  // User search
  async searchUsers(query: string) {
    const response = await apiClient.get(`/users/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  // Message management
  async editMessage(messageId: string, text: string) {
    const response = await apiClient.put(`/chat/messages/${messageId}`, { text });
    return response.data;
  },

  async deleteMessage(messageId: string) {
    const response = await apiClient.delete(`/chat/messages/${messageId}`);
    return response.data;
  },

  // File upload
  async getUploadUrl() {
    const response = await apiClient.get('/upload/url');
    return response.data;
  },
};
