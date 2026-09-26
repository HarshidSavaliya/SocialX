import express from 'express';
import { optionalAuth } from '../middleware/authMiddleware.js';
import {
  globalSearch,
  searchUsers,
  searchPosts,
  searchHashtags
} from '../controllers/searchController.js';

const router = express.Router();

// GET /api/search?q=query         - global search (users + posts + hashtags)
router.get('/', optionalAuth, globalSearch);

// GET /api/search/users?q=query   - search users only
router.get('/users', optionalAuth, searchUsers);

// GET /api/search/posts?q=query   - search posts only
router.get('/posts', optionalAuth, searchPosts);

// GET /api/search/hashtags?q=query - search hashtags only
router.get('/hashtags', optionalAuth, searchHashtags);

export default router;
