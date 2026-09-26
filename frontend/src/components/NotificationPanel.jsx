import React from 'react';
import { X, CheckCheck, Bell } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import NotificationItem from './NotificationItem';

export default function NotificationPanel({
  notifications,
  unreadCount,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
  onNavigate
}) {
  const { isDark } = useTheme();

  return (
    <div
      className={`absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border z-50 overflow-hidden ${isDark
          ? 'bg-[#15171f] border-white/[0.1] shadow-black/60'
          : 'bg-white border-slate-200 shadow-slate-200/80'
        }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-white/[0.07]' : 'border-slate-100'}`}>
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500 text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-[11px] font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
            >
              <CheckCheck className="w-3 h-3" />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto p-2">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center">
            <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => (
            <NotificationItem
              key={n._id}
              notification={n}
              onMarkAsRead={onMarkAsRead}
              onNavigate={onNavigate}
            />
          ))
        )}
      </div>
    </div>
  );
}
