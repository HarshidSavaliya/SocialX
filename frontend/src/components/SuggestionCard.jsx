import React from 'react';
import FollowButton from './FollowButton';
import { useTheme } from '../context/ThemeContext';
import { getUserAvatar, handleImageError } from '../utils/avatar';

export default function SuggestionCard({ user, onNavigate, onFollowToggle }) {
  const { isDark } = useTheme();

  const userId = user._id || user.id;

  return (
    <div
      onClick={() => onNavigate && onNavigate(user.username)}
      className="flex items-center justify-between gap-3 cursor-pointer group py-1.5"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src={getUserAvatar(user)}
          onError={(e) => handleImageError(e, user?.name)}
          alt={user.name}
          className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-1 ring-slate-200 dark:ring-white/10"
        />
        <div className="min-w-0">
          <h4
            className={`text-xs font-bold truncate transition-colors ${isDark
                ? 'text-slate-100 group-hover:text-indigo-400'
                : 'text-slate-900 group-hover:text-indigo-600'
              }`}
          >
            {user.name}
          </h4>
          <p className="text-[11px] text-slate-400 truncate">@{user.username}</p>
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
        <FollowButton
          userId={userId}
          initialFollowing={user.isFollowing || false}
          onToggle={onFollowToggle}
          size="sm"
        />
      </div>
    </div>
  );
}
