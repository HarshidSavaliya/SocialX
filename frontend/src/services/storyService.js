import apiClient from '../api/client';

export const storyService = {
  /**
   * Fetch active stories feed grouped by user
   */
  async getFeed() {
    const res = await apiClient.get('/stories/feed');
    return res.data.data || [];
  },

  /**
   * Fetch active stories for a specific user
   */
  async getUserStories(userId) {
    const res = await apiClient.get(`/stories/user/${userId}`);
    return res.data.data;
  },

  /**
   * Fetch a single active story by ID
   */
  async getStoryById(storyId) {
    const res = await apiClient.get(`/stories/${storyId}`);
    return res.data.data;
  },

  /**
   * Create a new story with media upload
   * @param {FormData} formData
   */
  async createStory(formData) {
    const res = await apiClient.post('/stories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data.data;
  },

  /**
   * Mark a story as viewed by the authenticated user
   */
  async viewStory(storyId) {
    const res = await apiClient.post(`/stories/${storyId}/view`);
    return res.data;
  },

  /**
   * Delete a story (owner or admin)
   */
  async deleteStory(storyId) {
    const res = await apiClient.delete(`/stories/${storyId}`);
    return res.data;
  },

  /**
   * Get the list of viewers for a story (author only)
   */
  async getViewers(storyId) {
    const res = await apiClient.get(`/stories/${storyId}/viewers`);
    return res.data.data;
  }
};
