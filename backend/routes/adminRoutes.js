import express from 'express';
import {
  getDashboardStats,
  getUsers,
  getUserById,
  blockUser,
  unblockUser,
  deleteHarmfulPost,
  getAuditActions
} from '../controllers/adminController.js';
import { authenticateUser, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Enforce authentication AND role-based authorization for all admin routes
router.use(authenticateUser, requireRole('ADMIN'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/block', blockUser);
router.patch('/users/:id/unblock', unblockUser);
router.delete('/posts/:id', deleteHarmfulPost);
router.get('/actions', getAuditActions);

export default router;
