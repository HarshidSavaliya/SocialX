import apiClient from '../api/client';

export const adminService = {
  async getDashboardStats() {
    const res = await apiClient.get('/admin/dashboard');
    return res.data.data;
  },

  async getUsers(params = {}) {
    const res = await apiClient.get('/admin/users', { params });
    return {
      users: res.data.data,
      pagination: res.data.pagination
    };
  },

  async getUserById(id) {
    const res = await apiClient.get(`/admin/users/${id}`);
    return res.data.data;
  },

  async blockUser(id, reason) {
    const res = await apiClient.patch(`/admin/users/${id}/block`, { reason });
    return res.data;
  },

  async unblockUser(id, reason) {
    const res = await apiClient.patch(`/admin/users/${id}/unblock`, { reason });
    return res.data;
  },

  async deleteHarmfulPost(id, reason) {
    const res = await apiClient.delete(`/admin/posts/${id}`, { data: { reason } });
    return res.data;
  },

  async getAuditActions(params = {}) {
    const res = await apiClient.get('/admin/actions', { params });
    return {
      actions: res.data.data,
      pagination: res.data.pagination
    };
  }
};
