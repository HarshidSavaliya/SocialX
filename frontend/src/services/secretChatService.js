import apiClient from '../api/client';

export const secretChatService = {
  async startSecretChat({ targetUserId, pin, autoDeleteLimit = 20 }) {
    const res = await apiClient.post('/secret-chats', {
      targetUserId,
      pin,
      autoDeleteLimit
    });
    return {
      conversation: res.data.data,
      secretToken: res.data.secretToken
    };
  },

  async createSecretConversation(targetUserId, pin = '1234', autoDeleteLimit = 10) {
    const res = await this.startSecretChat({ targetUserId, pin, autoDeleteLimit });
    return res.conversation;
  },

  async getSecretConversations() {
    const res = await apiClient.get('/secret-chats');
    return res.data.data;
  },

  async verifyPin(conversationId, pin) {
    const res = await apiClient.post(`/secret-chats/${conversationId}/verify-pin`, {
      pin
    });
    return {
      conversation: res.data.data,
      secretToken: res.data.secretToken
    };
  },

  async getMessages(conversationId, secretToken) {
    const res = await apiClient.get(`/secret-chats/${conversationId}/messages`, {
      headers: {
        'x-secret-token': secretToken
      }
    });
    return res.data.data;
  },

  async sendMessage(conversationId, secretToken, formData) {
    const res = await apiClient.post(
      `/secret-chats/${conversationId}/messages`,
      formData,
      {
        headers: {
          'x-secret-token': secretToken,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return res.data.data;
  },

  async updateSettings(conversationId, secretToken, { autoDeleteLimit }) {
    const res = await apiClient.patch(
      `/secret-chats/${conversationId}/settings`,
      { autoDeleteLimit },
      {
        headers: {
          'x-secret-token': secretToken
        }
      }
    );
    return res.data.data;
  },

  async exitSecretChat(conversationId, secretToken) {
    const res = await apiClient.post(
      `/secret-chats/${conversationId}/exit`,
      {},
      {
        headers: {
          'x-secret-token': secretToken
        }
      }
    );
    return res.data;
  },

  async viewOnceMedia(messageId) {
    const res = await apiClient.post(`/secret-messages/${messageId}/view`);
    return res.data.data;
  }
};
