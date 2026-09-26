import apiClient from '../api/client';

export const followService = {
  async followUser(userId) {
    const res = await apiClient.post(`/users/${userId}/follow`);
    return res.data.data;
  },

  async unfollowUser(userId) {
    const res = await apiClient.delete(`/users/${userId}/follow`);
    return res.data.data;
  },

  async getFollowers(userId) {
    const res = await apiClient.get(`/users/${userId}/followers`);
    return res.data.data;
  },

  async getFollowing(userId) {
    const res = await apiClient.get(`/users/${userId}/following`);
    return res.data.data;
  }
};
