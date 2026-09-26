import React from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import NotificationItem from '../components/NotificationItem';

export default function NotificationsView({ onNavigate }) {
  const { isDark } = useTheme();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className={`rounded-3xl border p-5 min-h-[400px] ${isDark
        ? 'bg-white/[0.03] border-white/[0.08]'
        : 'bg-white border-slate-200/80 shadow-xs'
      }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500 text-white">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-500 hover:text-indigo-600"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-14 rounded-xl animate-pulse ${isDark ? 'bg-white/[0.05]' : 'bg-slate-100'}`} />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No notifications yet</p>
          <p className="text-xs text-slate-400 mt-1">When someone likes or comments on your posts, you'll see it here.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map(n => (
            <NotificationItem
              key={n._id}
              notification={n}
              onMarkAsRead={markAsRead}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
