import express from 'express';
import {
  createPost,
  editPost,
  deletePost,
  getPostById,
  getFeed,
  recordView,
  savePost,
  unsavePost,
  getUploadSignature
} from '../controllers/postController.js';
import { likePost, unlikePost, getPostLikers } from '../controllers/likeController.js';
import { addComment, getComments } from '../controllers/commentController.js';
import { sharePost } from '../controllers/shareController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';
import { uploadSingleMedia } from '../middleware/uploadMiddleware.js';
import {
  uploadRateLimiter,
  interactionRateLimiter,
  viewRateLimiter
} from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// 1. Static and Query Endpoints (MUST come before /:id wildcard)
router.get('/feed', optionalAuth, getFeed);
router.get('/upload-signature', protect, uploadRateLimiter, getUploadSignature);

// 2. Post CRUD
router.post('/', protect, uploadRateLimiter, uploadSingleMedia, createPost);
router.get('/:id', optionalAuth, getPostById);
router.put('/:id', protect, uploadSingleMedia, editPost);
router.delete('/:id', protect, deletePost);

// 3. View Tracking
router.post('/:id/view', viewRateLimiter, recordView);

// 4. Saved / Bookmarked Posts & Reels
router.post('/:id/save', protect, savePost);
router.delete('/:id/save', protect, unsavePost);

// 5. Social Interactions: Likes
router.post('/:id/like', protect, interactionRateLimiter, likePost);
router.delete('/:id/like', protect, interactionRateLimiter, unlikePost);
router.get('/:id/likes', optionalAuth, getPostLikers);

// 6. Social Interactions: Comments
router.post('/:id/comments', protect, interactionRateLimiter, addComment);
router.get('/:id/comments', optionalAuth, getComments);

// 7. Social Interactions: Shares
router.post('/:id/share', protect, interactionRateLimiter, sharePost);

export default router;
