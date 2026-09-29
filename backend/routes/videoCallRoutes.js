import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  markMissedCall,
  getAgoraToken,
  getUserCallHistory,
  getCallSession
} from '../controllers/videoCallController.js';

const router = express.Router();

// All video call endpoints require authenticated user
router.use(protect);

// Call Lifecycle Endpoints
router.post('/initiate', initiateCall);
router.post('/accept', acceptCall);
router.post('/reject', rejectCall);
router.post('/end', endCall);
router.post('/missed', markMissedCall);

// Secure Agora Token Endpoint
router.get('/token/:callSessionId', getAgoraToken);

// Call History & Status
router.get('/history', getUserCallHistory);
router.get('/:callSessionId', getCallSession);

export default router;
