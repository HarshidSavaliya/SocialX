import axios from 'axios';
import apiClient from '../api/client';

export const postService = {
  async getFeed({ page = 1, limit = 8, filter = 'all', cursor = null } = {}) {
    const params = { limit, filter };
    if (cursor) params.cursor = cursor;
    else if (page) params.page = page;

    const res = await apiClient.get('/posts/feed', { params });
    const items = res.data.items || res.data.data || res.data.posts || [];

    return {
      items,
      posts: items, // Backward compatibility
      nextCursor: res.data.nextCursor || null,
      hasMore: Boolean(res.data.hasMore ?? res.data.pagination?.hasNextPage),
      pagination: res.data.pagination || {
        hasNextPage: Boolean(res.data.hasMore),
        nextCursor: res.data.nextCursor || null
      }
    };
  },

  async getUserPosts(username, { page = 1, limit = 10 } = {}) {
    const res = await apiClient.get(`/users/${username}/posts`, {
      params: { page, limit }
    });
    return {
      posts: res.data.data || res.data.posts || [],
      pagination: res.data.pagination
    };
  },

  async getPostById(postId) {
    const res = await apiClient.get(`/posts/${postId}`);
    return res.data.data;
  },

  async createPost(payload) {
    // If payload is FormData, send as multipart
    if (payload instanceof FormData) {
      const res = await apiClient.post('/posts', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.data || res.data.post;
    }

    // Otherwise send as JSON payload with direct upload metadata
    const res = await apiClient.post('/posts', payload);
    return res.data.data || res.data.post;
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
  },

  /**
   * Request signed upload parameters from backend
   */
  async getUploadSignature({ folder = 'socialx/reels', resourceType = 'video' } = {}) {
    const res = await apiClient.get('/posts/upload-signature', {
      params: { folder, resourceType }
    });
    return res.data.data;
  },

  /**
   * Direct Browser -> Cloudinary Upload
   * Completely bypasses backend server bandwidth and RAM for video binaries
   */
  async uploadDirectToCloudinary(file, signatureData, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signatureData.apiKey);
    formData.append('timestamp', signatureData.timestamp);
    formData.append('signature', signatureData.signature);
    formData.append('folder', signatureData.folder);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${signatureData.resourceType || 'video'}/upload`;

    const res = await axios.post(uploadUrl, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });

    return {
      mediaUrl: res.data.secure_url,
      mediaPublicId: res.data.public_id,
      mediaType: signatureData.resourceType === 'video' ? 'video' : 'image',
      duration: res.data.duration || 0,
      width: res.data.width || 0,
      height: res.data.height || 0,
      format: res.data.format || '',
      bytes: res.data.bytes || 0
    };
  },

  /**
   * Controlled View Recording (Threshold: user watched >= 2s)
   */
  async recordView(postId) {
    if (!postId) return null;
    try {
      const res = await apiClient.post(`/posts/${postId}/view`);
      return res.data.data;
    } catch {
      return null;
    }
  },

  /**
   * Real Save / Bookmark Post or Reel
   */
  async savePost(postId) {
    const res = await apiClient.post(`/posts/${postId}/save`);
    return res.data;
  },

  /**
   * Unsave / Remove Bookmark
   */
  async unsavePost(postId) {
    const res = await apiClient.delete(`/posts/${postId}/save`);
    return res.data;
  }
};
