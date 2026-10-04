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
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getUserAvatar, handleImageError } from '../utils/avatar';
import NotificationBell from './NotificationBell';

export default function Header({
  onOpenCreatePost,
  onOpenAuth,
  onNavigateHome,
  onNavigateToMyProfile,
  onNavigateToProfile,
  onSearchHashtag,
  onOpenSearch,
  onOpenNotifications,
  onOpenConversation,
  onOpenAdmin,
  onOpenSecretChat
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
    } else if (notification.type === 'FOLLOW') {
      const target =
        notification.sender?.username ||
        notification.sender?._id ||
        notification.sender?.id ||
        notification.sender;
      if (target && onNavigateToProfile) {
        onNavigateToProfile(target);
      } else if (onOpenNotifications) {
        onOpenNotifications();
      }
    } else if (onOpenNotifications) {
      onOpenNotifications();
    }
  };

  const userAvatar = getUserAvatar(user);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors duration-300 backdrop-blur-2xl border-b ${isDark
          ? 'bg-[#0c0a0f]/85 border-white/[0.07]'
          : 'bg-white/85 border-stone-200/80 shadow-xs'
        }`}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-600 text-stone-950 shadow-md shadow-amber-500/25 group-hover:shadow-amber-500/40 group-hover:scale-105 transition-all">
            <svg className="w-5 h-5 text-stone-950 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4l16 16" />
              <path d="M4 20l5.5 -5.5" />
              <path d="M14.5 9.5l5.5 -5.5" />
            </svg>
          </div>

          <span
            className={`font-extrabold text-xl tracking-tight transition-colors ${
              isDark ? 'text-white' : 'text-stone-900'
            }`}
          >
            Social<span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">X</span>
          </span>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-4">
          <div
            onClick={() => {
              if (onOpenSearch) onOpenSearch(searchQuery);
            }}
            className={`relative w-full flex items-center rounded-full transition-all duration-200 border cursor-pointer ${isDark
                ? 'bg-white/[0.04] border-white/10 focus-within:border-amber-500/50 focus-within:bg-white/[0.07]'
                : 'bg-stone-100/90 border-stone-200/80 focus-within:border-stone-400 focus-within:bg-white'
              }`}
          >
            <Search className="w-4 h-4 ml-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search people, posts, or #hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (onOpenSearch) onOpenSearch(searchQuery);
              }}
              className={`w-full py-2.5 pl-3 pr-10 text-xs sm:text-sm bg-transparent outline-none transition-colors ${isDark ? 'text-stone-100 placeholder-stone-500' : 'text-stone-800 placeholder-stone-400'
                }`}
            />
          </div>
        </form>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Create Post Button */}
          {isAuthenticated ? (
            <>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={onOpenAdmin}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all shadow-xs"
                  title="Open Admin Moderation Console"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>
              )}

              <button
                onClick={onOpenCreatePost}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold tracking-wide transition-all shadow-md bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-stone-950 hover:brightness-110 shadow-amber-500/20 active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-stone-950 stroke-[2.5]" />
                <span className="hidden sm:inline">Create Post</span>
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 shadow-md shadow-amber-500/20 hover:brightness-110 transition-all"
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
                ? 'bg-white/[0.06] hover:bg-white/[0.12] text-amber-400 border-white/10'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
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
                  onError={(e) => handleImageError(e, user?.name)}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-500/40 group-hover:ring-amber-400 transition-all shadow-sm"
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
