import express from 'express';
import {
  startSecretChat,
  getSecretConversations,
  verifyPin,
  getMessages,
  sendMessage,
  updateSettings,
  exitSecretChat
} from '../controllers/secretChatController.js';
import { authenticateUser, requireSecretAccess } from '../middleware/authMiddleware.js';
import { uploadSingleMedia } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Enforce authentication on all secret chat endpoints
router.use(authenticateUser);

// R.10.1 Start Secret Chat & list active conversations
router.post('/', startSecretChat);
router.get('/', getSecretConversations);

// R.10.6 PIN Verification endpoint (returns scoped session token)
router.post('/:id/verify-pin', verifyPin);

// Protected secret operations requiring verified PIN token & participant access
router.get('/:id/messages', requireSecretAccess, getMessages);
router.post('/:id/messages', requireSecretAccess, uploadSingleMedia, sendMessage);
router.patch('/:id/settings', requireSecretAccess, updateSettings);
router.post('/:id/exit', requireSecretAccess, exitSecretChat);

export default router;
