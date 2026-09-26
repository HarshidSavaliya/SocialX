import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';

export function useNotifications() {
  const { socket } = useSocket() || {};
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await notificationService.getNotifications(1, 20);
      setNotifications((res.notifications || []).filter(notification => !notification.isRead));
      setUnreadCount(res.unreadCount || 0);
    } catch (e) {
      console.warn('Fetch notifications error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;
    const handleNew = (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };
    const handleCount = ({ unreadCount: c }) => setUnreadCount(c);
    socket.on('notification:new', handleNew);
    socket.on('notification:unread-count', handleCount);
    return () => {
      socket.off('notification:new', handleNew);
      socket.off('notification:unread-count', handleCount);
    };
  }, [socket]);

  const markAsRead = async (id) => {
    const wasUnread = notifications.some(notification => notification._id === id && !notification.isRead);
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.filter(notification => notification._id !== id));
      if (wasUnread) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
    } catch (e) {
      console.warn('Mark as read error:', e.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications([]);
      setUnreadCount(0);
    } catch (e) {
      console.warn('Mark all read error:', e.message);
    }
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
