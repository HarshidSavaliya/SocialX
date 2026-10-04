import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { sendMessage, deleteMessage, reactToMessage, toggleStarMessage } from '../controllers/messageController.js';
import { getMessages } from '../controllers/conversationController.js';
import { uploadSingleMedia } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// GET    /api/messages/conversation/:conversationId - alias for conversation messages
router.get('/conversation/:conversationId', protect, getMessages);

// POST   /api/messages                 - send a message (text or media)
router.post('/', protect, uploadSingleMedia, sendMessage);

// DELETE /api/messages/:messageId       - delete own message
router.delete('/:messageId', protect, deleteMessage);

// POST   /api/messages/:messageId/react - add/toggle reaction
router.post('/:messageId/react', protect, reactToMessage);

// POST   /api/messages/:messageId/star  - toggle star
router.post('/:messageId/star', protect, toggleStarMessage);

export default router;
