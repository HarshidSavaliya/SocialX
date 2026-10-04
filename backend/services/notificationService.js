import Notification from '../models/Notification.js';
import { emitToUser } from '../socket/socketServer.js';

class NotificationService {
  async createNotification({
    recipient,
    sender,
    type,
    title,
    message,
    relatedPost = null,
    relatedConversation = null,
    relatedUser = null
  }) {
    // Prevent self-notifications
    if (recipient && sender && recipient.toString() === sender.toString()) {
      return null;
    }

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      relatedPost,
      relatedConversation,
      relatedUser
    });

    await notification.populate([
      { path: 'sender', select: 'name username profileImage' },
      { path: 'relatedPost', select: 'caption mediaUrl' }
    ]);

    // Emit real-time notification to recipient via Socket.IO
    try {
      const unreadCount = await Notification.countDocuments({
        recipient,
        isRead: false
      });

      emitToUser(recipient, 'notification:new', notification);
      emitToUser(recipient, 'notification:unread-count', { unreadCount });
    } catch (socketErr) {
      console.warn('Socket notification emit notice:', socketErr.message);
    }

    return notification;
  }

  async getUserNotifications(userId, { page = 1, limit = 20 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('sender', 'name username profileImage')
        .populate('relatedPost', 'caption mediaUrl')
        .lean(),
      Notification.countDocuments({ recipient: userId }),
      Notification.countDocuments({ recipient: userId, isRead: false })
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    };
  }

  async getUnreadCount(userId) {
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });
    return { unreadCount };
  }

  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    emitToUser(userId, 'notification:unread-count', { unreadCount });

    return {
      success: true,
      notification,
      unreadCount
    };
  }

  async markAllAsRead(userId) {
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    emitToUser(userId, 'notification:unread-count', { unreadCount: 0 });

    return {
      success: true,
      message: 'All notifications marked as read',
      unreadCount: 0
    };
  }
}

export default new NotificationService();
