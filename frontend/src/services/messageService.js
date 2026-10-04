import apiClient from '../api/client';

export const messageService = {
  async getConversations() {
    const res = await apiClient.get('/conversations');
    return res.data.data.conversations;
  },

  async createConversation(receiverId) {
    const res = await apiClient.post('/conversations', { receiverId });
    return res.data.data.conversation;
  },

  async getMessages(conversationId, page = 1, limit = 30) {
    const res = await apiClient.get(
      `/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    );
    return res.data.data;
  },

  async sendMessage({ receiverId, text, mediaUrl, mediaType, file }) {
    if (file) {
      const formData = new FormData();
      formData.append('receiverId', receiverId);
      if (text) formData.append('text', text);
      formData.append('media', file);
      const res = await apiClient.post('/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.data.message;
    }
    const res = await apiClient.post('/messages', { receiverId, text, mediaUrl, mediaType });
    return res.data.data.message;
  },

  async markAsRead(conversationId) {
    const res = await apiClient.patch(`/conversations/${conversationId}/read`);
    return res.data.data;
  },

  async deleteMessage(messageId) {
    const res = await apiClient.delete(`/messages/${messageId}`);
    return res.data;
  }
};
