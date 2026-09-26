import apiClient from '../api/client';

export const searchService = {
  async globalSearch(query) {
    const res = await apiClient.get(`/search?q=${encodeURIComponent(query)}`);
    return res.data.data;
  },

  async searchUsers(query, limit = 20) {
    const res = await apiClient.get(`/search/users?q=${encodeURIComponent(query)}&limit=${limit}`);
    return res.data.data.users;
  },

  async searchPosts(query, { limit = 20, sort = 'recent' } = {}) {
    const res = await apiClient.get(
      `/search/posts?q=${encodeURIComponent(query)}&limit=${limit}&sort=${sort}`
    );
    return res.data.data.posts;
  },

  async searchHashtags(query, limit = 20) {
    const res = await apiClient.get(
      `/search/hashtags?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return res.data.data.hashtags;
  }
};
