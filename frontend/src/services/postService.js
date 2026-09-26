import apiClient from '../api/client';

export const postService = {
  async getFeed({ page = 1, limit = 10, filter = 'all' } = {}) {
    const res = await apiClient.get('/posts/feed', {
      params: { page, limit, filter }
    });
    return {
      posts: res.data.data,
      pagination: res.data.pagination
    };
  },

  async getUserPosts(username, { page = 1, limit = 10 } = {}) {
    const res = await apiClient.get(`/users/${username}/posts`, {
      params: { page, limit }
    });
    return {
      posts: res.data.data,
      pagination: res.data.pagination
    };
  },

  async getPostById(postId) {
    const res = await apiClient.get(`/posts/${postId}`);
    return res.data.data;
  },

  async createPost(formData) {
    const res = await apiClient.post('/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.data;
  },

  async editPost(postId, data) {
    const isFormData = data instanceof FormData;
    const res = await apiClient.put(`/posts/${postId}`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    });
    return res.data.data;
  },

  async deletePost(postId) {
    const res = await apiClient.delete(`/posts/${postId}`);
    return res.data;
  }
};
