import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

class CourseService {
  async getCourses(params?: any) {
    const response = await axios.get(`${API_URL}/courses`, { params });
    return response.data;
  }

  async getMyCourses() {
    const response = await axios.get(`${API_URL}/enrollments/my-courses`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getCourseDetail(courseId: string) {
    const response = await axios.get(`${API_URL}/courses/${courseId}/detail`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getCourse(id: string) {
    const response = await axios.get(`${API_URL}/courses/${id}`);
    return response.data;
  }

  async createCourse(data: any) {
    const response = await axios.post(`${API_URL}/courses`, data, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async updateCourse(id: string, data: any) {
    const response = await axios.put(`${API_URL}/courses/${id}`, data, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async deleteCourse(id: string) {
    const response = await axios.delete(`${API_URL}/courses/${id}`, {
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

export default new CourseService();
