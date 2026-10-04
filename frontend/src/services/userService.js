import apiClient from '../api/client';

export const userService = {
  async getUserProfile(username) {
    const res = await apiClient.get(`/users/${username}`);
    return res.data.data;
  },

  async updateProfile(data) {
    const res = await apiClient.put('/users/profile', data);
    return res.data.data;
  },

  async updateProfileImage(file) {
    const formData = new FormData();
    formData.append('media', file);
    const res = await apiClient.put('/users/profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.data;
  },

  async changePassword(data) {
    const res = await apiClient.put('/users/change-password', data);
    return res.data;
  },

  async changeEmail(data) {
    const res = await apiClient.put('/users/change-email', data);
    return res.data;
  },

  async getSuggestions(limit = 5) {
    const res = await apiClient.get(`/users/suggestions?limit=${limit}`);
    return res.data.data;
  },

  async getFollowing(userId) {
    const res = await apiClient.get(`/users/${userId}/following`);
    return res.data.data;
  },

  async getFollowers(userId) {
    const res = await apiClient.get(`/users/${userId}/followers`);
    return res.data.data;
  }
};
