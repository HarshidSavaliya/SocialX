import express from 'express';
import {
  createPost,
  editPost,
  deletePost,
  getPostById,
  getFeed
} from '../controllers/postController.js';
import { likePost, unlikePost } from '../controllers/likeController.js';
import { addComment, getComments } from '../controllers/commentController.js';
import { sharePost } from '../controllers/shareController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';
import { uploadSingleMedia } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Feed endpoint must come before /:id wildcard
router.get('/feed', optionalAuth, getFeed);

// Post CRUD
router.post('/', protect, uploadSingleMedia, createPost);
router.get('/:id', optionalAuth, getPostById);
router.put('/:id', protect, uploadSingleMedia, editPost);
router.delete('/:id', protect, deletePost);

// Social Interactions: Likes
router.post('/:id/like', protect, likePost);
router.delete('/:id/like', protect, unlikePost);

// Social Interactions: Comments
router.post('/:id/comments', protect, addComment);
router.get('/:id/comments', optionalAuth, getComments);

// Social Interactions: Shares
router.post('/:id/share', protect, sharePost);

export default router;
