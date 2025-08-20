import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const instructorService = {
  // Course Management
  async getMyCourses() {
    const response = await axios.get(`${API_BASE_URL}/instructor/courses`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async getCourseDetail(courseId: string) {
    const response = await axios.get(`${API_BASE_URL}/instructor/courses/${courseId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async createCourse(courseData: any) {
    const response = await axios.post(`${API_BASE_URL}/instructor/courses`, courseData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async updateCourse(courseId: string, courseData: any) {
    const response = await axios.put(`${API_BASE_URL}/instructor/courses/${courseId}`, courseData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async deleteCourse(courseId: string) {
    const response = await axios.delete(`${API_BASE_URL}/instructor/courses/${courseId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  // Module Management
  async createModule(courseId: string, moduleData: any) {
    const response = await axios.post(`${API_BASE_URL}/instructor/courses/${courseId}/modules`, moduleData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async updateModule(courseId: string, moduleId: string, moduleData: any) {
    const response = await axios.put(`${API_BASE_URL}/instructor/courses/${courseId}/modules/${moduleId}`, moduleData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async deleteModule(courseId: string, moduleId: string) {
    const response = await axios.delete(`${API_BASE_URL}/instructor/courses/${courseId}/modules/${moduleId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  // Lesson Management
  async createLesson(courseId: string, moduleId: string, lessonData: any) {
    const response = await axios.post(`${API_BASE_URL}/instructor/courses/${courseId}/modules/${moduleId}/lessons`, lessonData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async updateLesson(courseId: string, moduleId: string, lessonId: string, lessonData: any) {
    const response = await axios.put(`${API_BASE_URL}/instructor/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, lessonData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async deleteLesson(courseId: string, moduleId: string, lessonId: string) {
    const response = await axios.delete(`${API_BASE_URL}/instructor/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async uploadLessonContent(courseId: string, moduleId: string, lessonId: string, formData: FormData) {
    const response = await axios.post(`${API_BASE_URL}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/content`, formData, {
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Assessment Management
  async getAssessments(courseId: string) {
    const response = await axios.get(`${API_BASE_URL}/instructor/courses/${courseId}/assessments`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async createAssessment(courseId: string, assessmentData: any) {
    const response = await axios.post(`${API_BASE_URL}/instructor/courses/${courseId}/assessments`, assessmentData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async updateAssessment(courseId: string, assessmentId: string, assessmentData: any) {
    const response = await axios.put(`${API_BASE_URL}/instructor/courses/${courseId}/assessments/${assessmentId}`, assessmentData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async deleteAssessment(courseId: string, assessmentId: string) {
    const response = await axios.delete(`${API_BASE_URL}/instructor/courses/${courseId}/assessments/${assessmentId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async getAssessmentResults(courseId: string, assessmentId: string) {
    const response = await axios.get(`${API_BASE_URL}/instructor/courses/${courseId}/assessments/${assessmentId}/results`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  // Session Management
  async getSessions(courseId: string) {
    const response = await axios.get(`${API_BASE_URL}/instructor/courses/${courseId}/sessions`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async createSession(courseId: string, sessionData: any) {
    const response = await axios.post(`${API_BASE_URL}/instructor/courses/${courseId}/sessions`, sessionData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async updateSession(courseId: string, sessionId: string, sessionData: any) {
    const response = await axios.put(`${API_BASE_URL}/instructor/courses/${courseId}/sessions/${sessionId}`, sessionData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async deleteSession(courseId: string, sessionId: string) {
    const response = await axios.delete(`${API_BASE_URL}/instructor/courses/${courseId}/sessions/${sessionId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async startSession(courseId: string, sessionId: string) {
    const response = await axios.post(`${API_BASE_URL}/instructor/courses/${courseId}/sessions/${sessionId}/start`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  // Material Management
  async getMaterials(courseId: string) {
    const response = await axios.get(`${API_BASE_URL}/instructor/courses/${courseId}/materials`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async uploadMaterial(courseId: string, materialData: FormData) {
    const response = await axios.post(`${API_BASE_URL}/instructor/courses/${courseId}/materials`, materialData, {
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async updateMaterial(courseId: string, materialId: string, materialData: any) {
    const response = await axios.put(`${API_BASE_URL}/instructor/courses/${courseId}/materials/${materialId}`, materialData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async deleteMaterial(courseId: string, materialId: string) {
    const response = await axios.delete(`${API_BASE_URL}/instructor/courses/${courseId}/materials/${materialId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  // Announcement Management
  async getAnnouncements(courseId: string) {
    const response = await axios.get(`${API_BASE_URL}/instructor/courses/${courseId}/announcements`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async createAnnouncement(courseId: string, announcementData: any) {
    const response = await axios.post(`${API_BASE_URL}/instructor/courses/${courseId}/announcements`, announcementData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async updateAnnouncement(courseId: string, announcementId: string, announcementData: any) {
    const response = await axios.put(`${API_BASE_URL}/instructor/courses/${courseId}/announcements/${announcementId}`, announcementData, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async deleteAnnouncement(courseId: string, announcementId: string) {
    const response = await axios.delete(`${API_BASE_URL}/instructor/courses/${courseId}/announcements/${announcementId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  // Analytics
  async getCourseAnalytics(courseId: string) {
    const response = await axios.get(`${API_BASE_URL}/instructor/courses/${courseId}/analytics`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async getStudentProgress(courseId: string) {
    const response = await axios.get(`${API_BASE_URL}/instructor/courses/${courseId}/students/progress`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  // Dashboard Stats
  async getDashboardStats() {
    const response = await axios.get(`${API_BASE_URL}/instructor/dashboard/stats`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  // Dashboard Data
  async getUpcomingSessions() {
    const response = await axios.get(`${API_BASE_URL}/instructor/dashboard/sessions`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async getRecentAssessments() {
    const response = await axios.get(`${API_BASE_URL}/instructor/dashboard/assessments`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  async getRecentMaterials() {
    const response = await axios.get(`${API_BASE_URL}/instructor/dashboard/materials`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  },

  // Helper method to get authentication headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`
    };
  }
};

export default instructorService;
