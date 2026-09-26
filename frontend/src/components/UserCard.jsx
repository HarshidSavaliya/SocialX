import React from 'react';
import FollowButton from './FollowButton';
import { useTheme } from '../context/ThemeContext';

export default function UserCard({ user, onNavigate, onFollowToggle }) {
  const { isDark } = useTheme();

  const userId = user._id || user.id;
  const avatar =
    user.profileImage ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

  return (
    <div
      onClick={() => onNavigate && onNavigate(user.username)}
      className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
        }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={avatar}
          alt={user.name}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-1 ring-slate-200 dark:ring-white/10"
        />
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {user.name}
          </h4>
          <p className="text-[11px] text-slate-400 truncate">@{user.username}</p>
          {user.bio && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
              {user.bio}
            </p>
          )}
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <FollowButton
          userId={userId}
          initialFollowing={user.isFollowing}
          onToggle={onFollowToggle}
          size="sm"
        />
      </div>
    </div>
  );
}
