import apiClient from '../api/client';

export const shareService = {
  async sharePost(postId) {
    const res = await apiClient.post(`/posts/${postId}/share`);
    return res.data.data;
  }
};
