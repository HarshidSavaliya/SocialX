import apiClient from '../api/client';

export const videoCallService = {
  /**
   * Request initiation of a video call session
   */
  async initiateCall({ receiverId, conversationId, callType = 'video' }) {
    const res = await apiClient.post('/video-calls/initiate', {
      receiverId,
      conversationId,
      callType
    });
    return res.data;
  },

  /**
   * Accept an incoming call session
   */
  async acceptCall({ callSessionId }) {
    const res = await apiClient.post('/video-calls/accept', { callSessionId });
    return res.data;
  },

  /**
   * Reject an incoming call session
   */
  async rejectCall({ callSessionId, reason = 'declined' }) {
    const res = await apiClient.post('/video-calls/reject', { callSessionId, reason });
    return res.data;
  },

  /**
   * End an active or ongoing call session
   */
  async endCall({ callSessionId, reason = 'ended' }) {
    const res = await apiClient.post('/video-calls/end', { callSessionId, reason });
    return res.data;
  },

  /**
   * Mark a call as missed when unanswered
   */
  async markMissed({ callSessionId }) {
    const res = await apiClient.post('/video-calls/missed', { callSessionId });
    return res.data;
  },

  /**
   * Fetch temporary Agora RTC token for authorized participant
   */
  async getAgoraToken(callSessionId) {
    const res = await apiClient.get(`/video-calls/token/${callSessionId}`);
    return res.data;
  },

  /**
   * Fetch call history for current user
   */
  async getCallHistory({ page = 1, limit = 20 } = {}) {
    const res = await apiClient.get(`/video-calls/history?page=${page}&limit=${limit}`);
    return res.data.data;
  }
};
