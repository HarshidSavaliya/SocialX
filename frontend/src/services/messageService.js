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

  async getMessages(conversationId, cursorOrPage = null, limit = 30) {
    let url = `/conversations/${conversationId}/messages?limit=${limit}`;

    if (typeof cursorOrPage === 'string') {
      url += `&cursor=${encodeURIComponent(cursorOrPage)}`;
    } else if (typeof cursorOrPage === 'number') {
      url += `&page=${cursorOrPage}`;
    } else if (typeof cursorOrPage === 'object' && cursorOrPage !== null) {
      if (cursorOrPage.cursor) url += `&cursor=${encodeURIComponent(cursorOrPage.cursor)}`;
      else if (cursorOrPage.page) url += `&page=${cursorOrPage.page}`;
      if (cursorOrPage.limit) url = url.replace(/limit=\d+/, `limit=${cursorOrPage.limit}`);
    }

    const res = await apiClient.get(url);
    return res.data.data;
  },

  async sendMessage({ conversationId, receiverId, text, mediaUrl, mediaType, file, replyTo, clientMessageId }) {
    const id = clientMessageId || `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (file) {
      const formData = new FormData();
      if (conversationId) formData.append('conversationId', conversationId);
      if (receiverId) formData.append('receiverId', receiverId);
      if (text) formData.append('text', text);
      if (replyTo) formData.append('replyTo', replyTo);
      formData.append('clientMessageId', id);
      formData.append('media', file);
      const res = await apiClient.post('/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.data?.message || res.data.message || res.data.data;
    }

    const res = await apiClient.post('/messages', {
      conversationId,
      receiverId,
      text,
      mediaUrl,
      mediaType,
      replyTo,
      clientMessageId: id
    });
    return res.data.data?.message || res.data.message || res.data.data;
  },

  async markAsRead(conversationId) {
    const res = await apiClient.patch(`/conversations/${conversationId}/read`);
    return res.data.data;
  },

  async deleteMessage(messageId) {
    const res = await apiClient.delete(`/messages/${messageId}`);
    return res.data;
  },

  async deleteConversation(conversationId) {
    const res = await apiClient.delete(`/conversations/${conversationId}`);
    return res.data;
  },

  async reactToMessage(messageId, emoji) {
    const res = await apiClient.post(`/messages/${messageId}/react`, { emoji });
    return res.data.data;
  },

  async toggleStarMessage(messageId) {
    const res = await apiClient.post(`/messages/${messageId}/star`);
    return res.data.data;
  }
};
