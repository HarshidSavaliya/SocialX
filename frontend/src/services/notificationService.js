import apiClient from '../api/client';

export const notificationService = {
  async getNotifications(page = 1, limit = 20) {
    const res = await apiClient.get(`/notifications?page=${page}&limit=${limit}`);
    return res.data.data;
  },

  async getUnreadCount() {
    const res = await apiClient.get('/notifications/unread-count');
    return res.data.data;
  },

  async markAsRead(notificationId) {
    const res = await apiClient.patch(`/notifications/${notificationId}/read`);
    return res.data.data;
  },

  async markAllAsRead() {
    const res = await apiClient.patch('/notifications/read-all');
    return res.data.data;
  },

  async deleteNotification(notificationId) {
    const res = await apiClient.delete(`/notifications/${notificationId}`);
    return res.data;
  }
};
