import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance with auth interceptor
const adminAxios = axios.create({ baseURL: API_BASE_URL });

adminAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminAxios.interceptors.response.use(
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
            return adminAxios(error.config);
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

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'learner' | 'instructor' | 'admin' | 'super_admin';
  status: 'active' | 'inactive' | 'suspended';
  credits: number;
  emailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  profile?: {
    bio?: string;
    location?: string;
    phone?: string;
    website?: string;
  };
}

export interface Course {
  _id: string;
  title: string;
  instructorId: {
    _id: string;
    name: string;
    email: string;
  };
  categoryId: {
    _id: string;
    name: string;
  };
  enrolledStudents?: number;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  published?: boolean;
  courseCode?: string;
  description?: string;
  shortDescription?: string;
  thumbnail?: string;
  priceCredits?: number;
  difficulty?: string;
  duration?: number;
  stats?: {
    enrollments: number;
    completions: number;
    averageRating: number;
    totalRatings: number;
    averageProgress?: number;
  };
  // Course content
  modules?: Array<{
    _id: string;
    title: string;
    description: string;
    order: number;
    lessons: Array<{
      _id: string;
      title: string;
      description: string;
      order: number;
      isPublished: boolean;
    }>;
  }>;
  // Additional data
  sessions?: Array<{
    _id: string;
    title: string;
    description: string;
    type: string;
    scheduledAt: string;
    duration: number;
    status: string;
  }>;
  assessments?: Array<{
    _id: string;
    title: string;
    description: string;
    type: string;
    dueDate: string;
    totalPoints: number;
  }>;
  materials?: Array<{
    _id: string;
    title: string;
    description: string;
    type: string;
    url?: string;
    createdAt: string;
  }>;
  announcements?: Array<{
    _id: string;
    title: string;
    content: string;
    createdAt: string;
  }>;
  // Enrollment data for batch management
  enrollments?: Array<{
    _id: string;
    userId: {
      _id: string;
      name: string;
      email: string;
      role: string;
    };
    role?: string;
    progress?: {
      completionPercentage: number;
      videosCompleted: number;
      totalVideos: number;
      resourcesViewed: number;
      totalResources: number;
    };
    enrolledAt: string;
    status: string;
  }>;
  // UI compatibility data
  syllabus?: Array<{
    _id: string;
    title: string;
    type: string;
    size: string;
    viewed: boolean;
  }>;
  prerequisites?: Array<{
    _id: string;
    title: string;
    type: string;
    duration: string;
    completed: boolean;
  }>;
}

export interface SystemStats {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  activeSessions: number;
  totalStorage: number;
  systemHealth: string;
  monthlyGrowth: {
    users: number;
    courses: number;
    enrollments: number;
  };
}

export interface AdminResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

class AdminService {
  // User Management
  async getAllUsers(params?: URLSearchParams): Promise<AdminResponse<{ users: User[]; pagination: any }>> {
    const url = params ? `/admin/users?${params.toString()}` : '/admin/users';
    const response = await adminAxios.get(url);
    return response.data;
  }

  async getUserById(userId: string): Promise<AdminResponse<User>> {
    const response = await adminAxios.get(`/admin/users/${userId}`);
    return response.data;
  }

  async createUser(userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    status: string;
    credits: number;
    bio?: string;
    location?: string;
    phone?: string;
    website?: string;
  }): Promise<AdminResponse<User>> {
    const response = await adminAxios.post('/admin/users', userData);
    return response.data;
  }

  async updateUser(userId: string, userData: Partial<{
    name: string;
    email: string;
    password: string;
    role: string;
    status: string;
    credits: number;
    bio: string;
    location: string;
    phone: string;
    website: string;
  }>): Promise<AdminResponse<User>> {
    const response = await adminAxios.put(`/admin/users/${userId}`, userData);
    return response.data;
  }

  async deleteUser(userId: string): Promise<AdminResponse<void>> {
    const response = await adminAxios.delete(`/admin/users/${userId}`);
    return response.data;
  }

  async toggleUserStatus(userId: string): Promise<AdminResponse<User>> {
    const response = await adminAxios.patch(`/admin/users/${userId}/toggle-status`);
    return response.data;
  }

  async updateUserStatus(userId: string, status: string): Promise<AdminResponse<User>> {
    const response = await adminAxios.patch(`/admin/users/${userId}/status`, { status });
    return response.data;
  }

  // Course Management
  async getAllCourses(): Promise<AdminResponse<Course[]>> {
    const response = await adminAxios.get('/admin/courses');
    return response.data;
  }

  async getCategories(): Promise<AdminResponse<any[]>> {
    const response = await adminAxios.get('/categories');
    return response.data;
  }

  async createCourse(courseData: {
    title: string;
    description: string;
    shortDescription?: string;
    categoryId: string;
    instructorId: string;
    courseCode?: string;
    priceCredits?: number;
    difficulty?: string;
    duration?: number;
  }): Promise<AdminResponse<Course>> {
    const response = await adminAxios.post('/admin/courses', courseData);
    return response.data;
  }

  async getCourseById(courseId: string): Promise<AdminResponse<Course>> {
    const response = await adminAxios.get(`/admin/courses/${courseId}`);
    return response.data;
  }

  async updateCourse(courseId: string, courseData: any): Promise<AdminResponse<Course>> {
    const response = await adminAxios.put(`/admin/courses/${courseId}`, courseData);
    return response.data;
  }

  async updateCourseStatus(courseId: string, status: string): Promise<AdminResponse<Course>> {
    const response = await adminAxios.patch(`/admin/courses/${courseId}/status`, { status });
    return response.data;
  }

  async deleteCourse(courseId: string): Promise<AdminResponse<void>> {
    const response = await adminAxios.delete(`/admin/courses/${courseId}`);
    return response.data;
  }

  // Enrollment Management
  async getEnrolledStudents(courseId: string): Promise<AdminResponse<any>> {
    const response = await adminAxios.get(`/admin/courses/${courseId}/enrollments`);
    return response.data;
  }

  async addStudentsToCourse(courseId: string, userIds: string[]): Promise<AdminResponse<void>> {
    console.log('adminService.addStudentsToCourse - Sending request:');
    console.log('  URL:', `/admin/courses/${courseId}/enrollments`);
    console.log('  Data:', { userIds });
    const response = await adminAxios.post(`/admin/courses/${courseId}/enrollments`, { userIds });
    return response.data;
  }

  async removeStudentFromCourse(courseId: string, userId: string): Promise<AdminResponse<void>> {
    const response = await adminAxios.delete(`/admin/courses/${courseId}/enrollments/${userId}`);
    return response.data;
  }

  // Course Content Management (same as instructor service)
  async createModule(courseId: string, moduleData: {
    title: string;
    description: string;
    order: number;
  }): Promise<AdminResponse<any>> {
    const response = await adminAxios.post(`/admin/courses/${courseId}/modules`, moduleData);
    return response.data;
  }

  async createLesson(courseId: string, moduleId: string, lessonData: {
    title: string;
    description: string;
    order: number;
  }): Promise<AdminResponse<any>> {
    const response = await adminAxios.post(`/admin/courses/${courseId}/modules/${moduleId}/lessons`, lessonData);
    return response.data;
  }

  async createAssessment(courseId: string, assessmentData: {
    title: string;
    description: string;
    type: string;
    dueDate: string;
    totalPoints: number;
    instructions?: string;
    timeLimit?: number;
    isPublished?: boolean;
    instructor?: string; // Add instructor field
  }): Promise<AdminResponse<any>> {
    const response = await adminAxios.post(`/admin/courses/${courseId}/assessments`, assessmentData);
    return response.data;
  }

  async publishAssessment(courseId: string, assessmentId: string, isPublished: boolean): Promise<AdminResponse<any>> {
    const response = await adminAxios.put(`/admin/courses/${courseId}/assessments/${assessmentId}/publish`, { isPublished });
    return response.data;
  }

  async createAnnouncement(courseId: string, announcementData: {
    title: string;
    content: string;
  }): Promise<AdminResponse<any>> {
    const response = await adminAxios.post(`/admin/courses/${courseId}/announcements`, announcementData);
    return response.data;
  }

  async uploadMaterial(courseId: string, materialData: FormData): Promise<AdminResponse<any>> {
    const response = await adminAxios.post(`/admin/courses/${courseId}/materials`, materialData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async downloadMaterial(courseId: string, materialId: string): Promise<Blob> {
    const response = await adminAxios.get(`/admin/courses/${courseId}/materials/${materialId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async downloadLessonContent(courseId: string, moduleId: string, lessonId: string, fileId: string): Promise<Blob> {
    const response = await adminAxios.get(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/content/${fileId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Assessment Attachment Management
  async uploadAssessmentAttachment(courseId: string, assessmentId: string, file: File): Promise<AdminResponse<any>> {
    const formData = new FormData();
    formData.append('attachment', file);
    
    const response = await adminAxios.post(`/admin/courses/${courseId}/assessments/${assessmentId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async downloadAssessmentAttachment(courseId: string, assessmentId: string, attachmentId: string): Promise<Blob> {
    const response = await adminAxios.get(`/admin/courses/${courseId}/assessments/${assessmentId}/attachments/${attachmentId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async deleteAssessmentAttachment(courseId: string, assessmentId: string, attachmentId: string): Promise<AdminResponse<any>> {
    const response = await adminAxios.delete(`/admin/courses/${courseId}/assessments/${assessmentId}/attachments/${attachmentId}`);
    return response.data;
  }

  async uploadLessonContent(courseId: string, moduleId: string, lessonId: string, formData: FormData): Promise<AdminResponse<any>> {
    const response = await adminAxios.post(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/content`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Delete methods
  async deleteMaterial(courseId: string, materialId: string): Promise<AdminResponse<void>> {
    const response = await adminAxios.delete(`/admin/courses/${courseId}/materials/${materialId}`);
    return response.data;
  }

  async deleteLesson(courseId: string, moduleId: string, lessonId: string): Promise<AdminResponse<void>> {
    const response = await adminAxios.delete(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`);
    return response.data;
  }

  async deleteSession(courseId: string, sessionId: string): Promise<AdminResponse<void>> {
    const response = await adminAxios.delete(`/admin/courses/${courseId}/sessions/${sessionId}`);
    return response.data;
  }

  // System Statistics
  async getSystemStats(): Promise<AdminResponse<SystemStats>> {
    const response = await adminAxios.get('/admin/stats');
    return response.data;
  }

  async getSystemHealth(): Promise<AdminResponse<{ health: string; details: any }>> {
    const response = await adminAxios.get('/admin/health');
    return response.data;
  }

  // Analytics & Reports
  async getAnalytics(timeframe: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<AdminResponse<any>> {
    const response = await adminAxios.get(`/admin/analytics?timeframe=${timeframe}`);
    return response.data;
  }

  async generateReport(reportType: string, filters?: any): Promise<AdminResponse<any>> {
    const response = await adminAxios.post('/admin/reports', { reportType, filters });
    return response.data;
  }

  // System Management
  async getSystemSettings(): Promise<AdminResponse<any>> {
    const response = await adminAxios.get('/admin/settings');
    return response.data;
  }

  async updateSystemSettings(settings: any): Promise<AdminResponse<any>> {
    const response = await adminAxios.put('/admin/settings', settings);
    return response.data;
  }

  async backupSystem(): Promise<AdminResponse<{ backupId: string; downloadUrl: string }>> {
    const response = await adminAxios.post('/admin/backup');
    return response.data;
  }

  async getBackupHistory(): Promise<AdminResponse<any[]>> {
    const response = await adminAxios.get('/admin/backup/history');
    return response.data;
  }

  // Activity Logs
  async getActivityLogs(filters?: {
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AdminResponse<any[]>> {
    const response = await adminAxios.get('/admin/activity-logs', { params: filters });
    return response.data;
  }

  // Bulk Operations
  async bulkUpdateUsers(userIds: string[], updates: Partial<User>): Promise<AdminResponse<{ updated: number; failed: number }>> {
    const response = await adminAxios.post('/admin/users/bulk-update', { userIds, updates });
    return response.data;
  }

  async bulkDeleteUsers(userIds: string[]): Promise<AdminResponse<{ deleted: number; failed: number }>> {
    const response = await adminAxios.post('/admin/users/bulk-delete', { userIds });
    return response.data;
  }

  // Notifications
  async sendSystemNotification(notification: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    targetUsers?: string[];
    targetRoles?: string[];
  }): Promise<AdminResponse<any>> {
    const response = await adminAxios.post('/admin/notifications', notification);
    return response.data;
  }

  async getNotificationHistory(): Promise<AdminResponse<any[]>> {
    const response = await adminAxios.get('/admin/notifications/history');
    return response.data;
  }
}

const adminService = new AdminService();
export default adminService;
