import express from 'express';
import { deleteComment, addComment, getComments } from '../controllers/commentController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes for comments on post
router.post('/post/:postId', protect, addComment);
router.get('/post/:postId', optionalAuth, getComments);

// Delete comment by comment ID
router.delete('/:id', protect, deleteComment);

export default router;
