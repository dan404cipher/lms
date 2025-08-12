import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

class ActivityService {
  async getMyActivities() {
    const response = await axios.get(`${API_URL}/sessions/my-activities`, {
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

export default new ActivityService();
