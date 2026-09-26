import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// GET    /api/notifications              - list notifications (paginated)
router.get('/', protect, getNotifications);

// GET    /api/notifications/unread-count - get unread count
router.get('/unread-count', protect, getUnreadCount);

// PATCH  /api/notifications/read-all     - mark all as read
// NOTE: must be BEFORE /:id/read to prevent Express treating 'read-all' as :id
router.patch('/read-all', protect, markAllAsRead);

// PATCH  /api/notifications/:id/read     - mark one as read
router.patch('/:id/read', protect, markAsRead);

// DELETE /api/notifications/:id          - delete notification
router.delete('/:id', protect, deleteNotification);

export default router;
