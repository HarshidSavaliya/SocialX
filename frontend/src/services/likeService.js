import apiClient from '../api/client';

export const likeService = {
  async likePost(postId) {
    const res = await apiClient.post(`/posts/${postId}/like`);
    return res.data.data;
  },

  async unlikePost(postId) {
    const res = await apiClient.delete(`/posts/${postId}/like`);
    return res.data.data;
  }
};
