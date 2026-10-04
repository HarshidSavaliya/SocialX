import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { sendMessage, deleteMessage } from '../controllers/messageController.js';

import { uploadSingleMedia } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// POST   /api/messages           - send a message (text or media)
router.post('/', protect, uploadSingleMedia, sendMessage);

// DELETE /api/messages/:messageId - delete own message
router.delete('/:messageId', protect, deleteMessage);

export default router;
