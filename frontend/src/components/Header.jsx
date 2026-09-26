import React, { useState } from 'react';
import {
  Search,
  Sun,
  Moon,
  PlusCircle,
  LogIn,
  LogOut,
  User,
  Command,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

export default function Header({
  onOpenCreatePost,
  onOpenAuth,
  onNavigateHome,
  onNavigateToMyProfile,
  onSearchHashtag,
  onOpenSearch,
  onOpenNotifications,
  onOpenConversation
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (onOpenSearch) {
        onOpenSearch(searchQuery.trim());
      } else if (onSearchHashtag) {
        onSearchHashtag(searchQuery.trim());
      }
    }
  };

  const handleNotificationNavigate = (notification) => {
    if (notification.type === 'MESSAGE' && onOpenConversation && notification.relatedConversation) {
      onOpenConversation(notification.relatedConversation);
    } else if (notification.type === 'FOLLOW' && onNavigateToMyProfile && notification.sender?.username) {
      onNavigateToMyProfile(notification.sender.username);
    } else if (onOpenNotifications) {
      onOpenNotifications();
    }
  };

  const userAvatar =
    user?.profileImage ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors duration-300 backdrop-blur-xl border-b ${isDark
          ? 'bg-[#0f1118]/85 border-white/[0.08]'
          : 'bg-white/85 border-slate-200/80 shadow-xs'
        }`}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-800 text-white shadow-md shadow-indigo-900/20 overflow-hidden">
            <span className="font-extrabold text-xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300 group-hover:scale-110 transition-transform">
              SX
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span
                className={`font-bold text-xl tracking-tight transition-colors ${isDark ? 'text-white' : 'text-slate-900'
                  }`}
              >
                Social<span className="text-indigo-500">X</span>
              </span>
              <span
                className={`text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded-full uppercase ${isDark
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                  }`}
              >
                Phase 3
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block -mt-0.5">
              Connected Social Feed & Chat
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-4">
          <div
            onClick={() => {
              if (onOpenSearch) onOpenSearch(searchQuery);
            }}
            className={`relative w-full flex items-center rounded-full transition-all duration-200 border cursor-pointer ${isDark
                ? 'bg-white/[0.05] border-white/10 focus-within:border-indigo-400/50 focus-within:bg-white/[0.08]'
                : 'bg-slate-100/90 border-slate-200/80 focus-within:border-slate-400 focus-within:bg-white'
              }`}
          >
            <Search className="w-4 h-4 ml-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search people, posts, or #hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (onOpenSearch) onOpenSearch(searchQuery);
              }}
              className={`w-full py-2.5 pl-3 pr-10 text-xs sm:text-sm bg-transparent outline-none transition-colors ${isDark ? 'text-slate-100 placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'
                }`}
            />
          </div>
        </form>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Create Post Button */}
          {isAuthenticated ? (
            <button
              onClick={onOpenCreatePost}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold tracking-wide transition-all shadow-sm ${isDark
                  ? 'bg-white text-slate-950 hover:bg-slate-100'
                  : 'bg-slate-900 text-white hover:bg-black'
                }`}
            >
              <PlusCircle className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Create Post</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Real-time Notification Bell */}
          <NotificationBell onNavigate={handleNotificationNavigate} />

          {/* Theme Switcher Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className={`p-2.5 rounded-full transition-all duration-300 border ${isDark
                ? 'bg-white/10 hover:bg-white/20 text-amber-300 border-white/10'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Avatar & Profile Link */}
          {isAuthenticated && user && (
            <div
              onClick={onNavigateToMyProfile}
              className="flex items-center gap-2 pl-1 cursor-pointer group"
              title={`Logged in as ${user.name}`}
            >
              <div className="relative">
                <img
                  src={userAvatar}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/40 group-hover:ring-indigo-500 transition-all shadow-sm"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0f1118]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
