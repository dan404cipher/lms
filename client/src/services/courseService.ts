import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Create axios instance with auth interceptor
const courseAxios = axios.create({ baseURL: API_URL });

courseAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

courseAxios.interceptors.response.use(
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
            return courseAxios(error.config);
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

class CourseService {
  async getCourses(params?: any) {
    const response = await courseAxios.get('/courses', { params });
    return response.data;
  }

  async getMyCourses() {
    // Get user's enrolled courses
    const response = await courseAxios.get('/users/enrolled-courses');
    return response.data;
  }

  async getCourseDetail(courseId: string) {
    const response = await courseAxios.get(`/courses/${courseId}/detail`);
    return response.data;
  }

  async getCourse(id: string) {
    const response = await courseAxios.get(`/courses/${id}`);
    return response.data;
  }

  async createCourse(data: any) {
    const response = await courseAxios.post('/courses', data);
    return response.data;
  }

  async updateCourse(id: string, data: any) {
    const response = await courseAxios.put(`/courses/${id}`, data);
    return response.data;
  }

  async deleteCourse(id: string) {
    const response = await courseAxios.delete(`/courses/${id}`);
    return response.data;
  }

  async downloadMaterial(courseId: string, materialId: string): Promise<Blob> {
    const response = await courseAxios.get(`/courses/${courseId}/materials/${materialId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async downloadLessonContent(courseId: string, moduleId: string, lessonId: string, fileId: string): Promise<Blob> {
    const response = await courseAxios.get(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/content/${fileId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async markLessonComplete(courseId: string, lessonId: string) {
    const response = await courseAxios.post(`/courses/${courseId}/lessons/${lessonId}/complete`);
    return response.data;
  }
}

export default new CourseService();
