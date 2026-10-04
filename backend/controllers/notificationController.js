import notificationService from '../services/notificationService.js';
import Notification from '../models/Notification.js';

export const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await notificationService.getUserNotifications(req.user._id, { page, limit });
    res.json({
      success: true,
      data: result,
      notifications: result?.notifications || []
    });
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const result = await notificationService.getUnreadCount(req.user._id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await notificationService.markAsRead(id, req.user._id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({ _id: id, recipient: req.user._id });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    await notification.deleteOne();
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
};
