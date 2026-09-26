import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getConversations,
  createConversation,
  getMessages,
  markAsRead
} from '../controllers/conversationController.js';

const router = express.Router();

// GET  /api/conversations         - list user's conversations
router.get('/', protect, getConversations);

// POST /api/conversations         - create or get conversation with a user
router.post('/', protect, createConversation);

// GET  /api/conversations/:conversationId/messages - get paginated messages
router.get('/:conversationId/messages', protect, getMessages);

// PATCH /api/conversations/:conversationId/read   - mark messages as read
router.patch('/:conversationId/read', protect, markAsRead);

export default router;
