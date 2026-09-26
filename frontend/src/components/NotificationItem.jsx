import React from 'react';
import { Heart, MessageSquare, UserPlus, MessageCircle, Video } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { formatRelativeTime } from '../utils/dateTime';

const ICONS = {
  LIKE: { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  COMMENT: { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  FOLLOW: { icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  MESSAGE: { icon: MessageCircle, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  VIDEO_CALL: { icon: Video, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  MISSED_VIDEO_CALL: { icon: Video, color: 'text-rose-500', bg: 'bg-rose-500/10' }
};

export default function NotificationItem({ notification, onMarkAsRead, onNavigate }) {
  const { isDark } = useTheme();
  const typeInfo = ICONS[notification.type] || ICONS.MESSAGE;
  const Icon = typeInfo.icon;

  const handleClick = () => {
    if (!notification.isRead) onMarkAsRead(notification._id);
    if (onNavigate) onNavigate(notification);
  };

  const senderAvatar = notification.sender?.profileImage;
  const senderName = notification.sender?.name || 'Someone';

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-3 flex items-start gap-3 rounded-xl transition-all duration-150 ${!notification.isRead
          ? isDark ? 'bg-indigo-500/8 hover:bg-indigo-500/12' : 'bg-indigo-50 hover:bg-indigo-100/80'
          : isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
        }`}
    >
      {/* Sender Avatar with type icon overlay */}
      <div className="relative flex-shrink-0">
        {senderAvatar ? (
          <img
            src={senderAvatar}
            alt={senderName}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold">
            {senderName[0]}
          </div>
        )}
        <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${typeInfo.bg}`}>
          <Icon className={`w-2.5 h-2.5 ${typeInfo.color}`} />
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          {notification.message}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">{formatRelativeTime(notification.createdAt)}</p>
      </div>

      {/* Unread indicator */}
      {!notification.isRead && (
        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-1.5" />
      )}
    </button>
  );
}
