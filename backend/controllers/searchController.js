import searchService from '../services/searchService.js';

export const globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Search query (q) is required' });
    }
    const result = await searchService.globalSearch(q.trim(), req.user?._id || null);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const searchUsers = async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Search query (q) is required' });
    }
    const users = await searchService.searchUsers(q.trim(), req.user?._id || null, { limit });
    res.json({ success: true, data: { users } });
  } catch (err) {
    next(err);
  }
};

export const searchPosts = async (req, res, next) => {
  try {
    const { q, limit = 20, sort = 'recent' } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Search query (q) is required' });
    }
    const posts = await searchService.searchPosts(q.trim(), { limit, sort });
    res.json({ success: true, data: { posts } });
  } catch (err) {
    next(err);
  }
};

export const searchHashtags = async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Search query (q) is required' });
    }
    const hashtags = await searchService.searchHashtags(q.trim(), { limit });
    res.json({ success: true, data: { hashtags } });
  } catch (err) {
    next(err);
  }
};
