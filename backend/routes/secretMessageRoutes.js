import express from 'express';
import { viewOnceMedia } from '../controllers/secretChatController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateUser);

// R.10.5 View-once media open & burn endpoint
router.post('/:id/view', viewOnceMedia);

export default router;
