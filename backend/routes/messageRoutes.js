import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { sendMessage, deleteMessage } from '../controllers/messageController.js';

const router = express.Router();

// POST   /api/messages           - send a message
router.post('/', protect, sendMessage);

// DELETE /api/messages/:messageId - delete own message
router.delete('/:messageId', protect, deleteMessage);

export default router;
