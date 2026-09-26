import apiClient from '../api/client';

export const commentService = {
  async getComments(postId) {
    const res = await apiClient.get(`/posts/${postId}/comments`);
    return res.data.data;
  },

  async addComment(postId, text) {
    const res = await apiClient.post(`/posts/${postId}/comments`, { text });
    return res.data.data;
  },

  async deleteComment(commentId) {
    const res = await apiClient.delete(`/comments/${commentId}`);
    return res.data;
  }
};
