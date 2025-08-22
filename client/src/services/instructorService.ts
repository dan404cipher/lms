import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance with auth interceptor
const instructorAxios = axios.create({ baseURL: API_BASE_URL });

instructorAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instructorAxios.interceptors.response.use(
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
            return instructorAxios(error.config);
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

const instructorService = {
  // Course Management
  async getMyCourses() {
    const response = await instructorAxios.get('/instructor/courses');
    return response.data;
  },

  async getCategories() {
    const response = await instructorAxios.get('/categories');
    return response.data;
  },

  async getCourseDetail(courseId: string) {
    const response = await instructorAxios.get(`/instructor/courses/${courseId}`);
    return response.data;
  },

  async createCourse(courseData: any) {
    const response = await instructorAxios.post('/instructor/courses', courseData);
    return response.data;
  },

  async updateCourse(courseId: string, courseData: any) {
    const response = await instructorAxios.put(`/instructor/courses/${courseId}`, courseData);
    return response.data;
  },

  async deleteCourse(courseId: string) {
    const response = await instructorAxios.delete(`/instructor/courses/${courseId}`);
    return response.data;
  },

  // Module Management
  async createModule(courseId: string, moduleData: any) {
    const response = await instructorAxios.post(`/instructor/courses/${courseId}/modules`, moduleData);
    return response.data;
  },

  async updateModule(courseId: string, moduleId: string, moduleData: any) {
    const response = await instructorAxios.put(`/instructor/courses/${courseId}/modules/${moduleId}`, moduleData);
    return response.data;
  },

  async deleteModule(courseId: string, moduleId: string) {
    const response = await instructorAxios.delete(`/instructor/courses/${courseId}/modules/${moduleId}`);
    return response.data;
  },

  // Lesson Management
  async createLesson(courseId: string, moduleId: string, lessonData: any) {
    const response = await instructorAxios.post(`/instructor/courses/${courseId}/modules/${moduleId}/lessons`, lessonData);
    return response.data;
  },

  async updateLesson(courseId: string, moduleId: string, lessonId: string, lessonData: any) {
    const response = await instructorAxios.put(`/instructor/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, lessonData);
    return response.data;
  },

  async deleteLesson(courseId: string, moduleId: string, lessonId: string) {
    const response = await instructorAxios.delete(`/instructor/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`);
    return response.data;
  },

  async uploadLessonContent(courseId: string, moduleId: string, lessonId: string, formData: FormData) {
    const response = await instructorAxios.post(`/instructor/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/content`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Assessment Management
  async getAssessments(courseId: string) {
    const response = await instructorAxios.get(`/instructor/courses/${courseId}/assessments`);
    return response.data;
  },

  async createAssessment(courseId: string, assessmentData: any) {
    const response = await instructorAxios.post(`/instructor/courses/${courseId}/assessments`, assessmentData);
    return response.data;
  },

  async updateAssessment(courseId: string, assessmentId: string, assessmentData: any) {
    const response = await instructorAxios.put(`/instructor/courses/${courseId}/assessments/${assessmentId}`, assessmentData);
    return response.data;
  },

  async deleteAssessment(courseId: string, assessmentId: string) {
    const response = await instructorAxios.delete(`/instructor/courses/${courseId}/assessments/${assessmentId}`);
    return response.data;
  },

  async getAssessmentResults(courseId: string, assessmentId: string) {
    const response = await instructorAxios.get(`/instructor/courses/${courseId}/assessments/${assessmentId}/results`);
    return response.data;
  },

  // Session Management
  async getSessions(courseId: string) {
    const response = await instructorAxios.get(`/instructor/courses/${courseId}/sessions`);
    return response.data;
  },

  async createSession(courseId: string, sessionData: any) {
    const response = await instructorAxios.post(`/instructor/courses/${courseId}/sessions`, sessionData);
    return response.data;
  },

  async updateSession(courseId: string, sessionId: string, sessionData: any) {
    const response = await instructorAxios.put(`/instructor/courses/${courseId}/sessions/${sessionId}`, sessionData);
    return response.data;
  },

  async deleteSession(courseId: string, sessionId: string) {
    const response = await instructorAxios.delete(`/instructor/courses/${courseId}/sessions/${sessionId}`);
    return response.data;
  },

  async startSession(courseId: string, sessionId: string) {
    const response = await instructorAxios.post(`/instructor/courses/${courseId}/sessions/${sessionId}/start`, {});
    return response.data;
  },

  // Material Management
  async getMaterials(courseId: string) {
    const response = await instructorAxios.get(`/instructor/courses/${courseId}/materials`);
    return response.data;
  },

  async uploadMaterial(courseId: string, materialData: FormData) {
    const response = await instructorAxios.post(`/instructor/courses/${courseId}/materials`, materialData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async updateMaterial(courseId: string, materialId: string, materialData: any) {
    const response = await instructorAxios.put(`/instructor/courses/${courseId}/materials/${materialId}`, materialData);
    return response.data;
  },

  async deleteMaterial(courseId: string, materialId: string) {
    const response = await instructorAxios.delete(`/instructor/courses/${courseId}/materials/${materialId}`);
    return response.data;
  },

  // Announcement Management
  async getAnnouncements(courseId: string) {
    const response = await instructorAxios.get(`/instructor/courses/${courseId}/announcements`);
    return response.data;
  },

  async createAnnouncement(courseId: string, announcementData: any) {
    const response = await instructorAxios.post(`/instructor/courses/${courseId}/announcements`, announcementData);
    return response.data;
  },

  async updateAnnouncement(courseId: string, announcementId: string, announcementData: any) {
    const response = await instructorAxios.put(`/instructor/courses/${courseId}/announcements/${announcementId}`, announcementData);
    return response.data;
  },

  async deleteAnnouncement(courseId: string, announcementId: string) {
    const response = await instructorAxios.delete(`/instructor/courses/${courseId}/announcements/${announcementId}`);
    return response.data;
  },

  // Analytics
  async getCourseAnalytics(courseId: string) {
    const response = await instructorAxios.get(`/instructor/courses/${courseId}/analytics`);
    return response.data;
  },

  async getStudentProgress(courseId: string) {
    const response = await instructorAxios.get(`/instructor/courses/${courseId}/students/progress`);
    return response.data;
  },

  // Dashboard Stats
  async getDashboardStats() {
    const response = await instructorAxios.get('/instructor/dashboard/stats');
    return response.data;
  },

  // Dashboard Data
  async getUpcomingSessions() {
    const response = await instructorAxios.get('/instructor/dashboard/sessions');
    return response.data;
  },

  async getRecentAssessments() {
    const response = await instructorAxios.get('/instructor/dashboard/assessments');
    return response.data;
  },

  async getRecentMaterials() {
    const response = await instructorAxios.get('/instructor/dashboard/materials');
    return response.data;
  },


};

export default instructorService;
