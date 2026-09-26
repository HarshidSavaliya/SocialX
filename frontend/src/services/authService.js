import apiClient from '../api/client';

export const authService = {
  async register(data) {
    const res = await apiClient.post('/auth/register', data);
    return res.data.data;
  },

  async login(data) {
    const res = await apiClient.post('/auth/login', data);
    return res.data.data;
  },

  async logout() {
    const res = await apiClient.post('/auth/logout');
    return res.data;
  },

  async getMe() {
    const res = await apiClient.get('/auth/me');
    return res.data.data;
  }
};
