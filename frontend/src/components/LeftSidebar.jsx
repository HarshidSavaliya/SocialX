import React from 'react';
import {
  Home,
  User,
  Users,
  Compass,
  MessageSquare,
  Bell,
  Search,
  Settings,
  LogOut,
  LogIn,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';

export default function LeftSidebar({
  activeView,
  setActiveView,
  onOpenAuth,
  onNavigateToMyProfile
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark } = useTheme();
  const { unreadCount } = useNotifications();

  const navItems = [
    { id: 'feed', label: 'News Feed', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      requiresAuth: true
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      requiresAuth: true,
      badge: unreadCount > 0 ? `${unreadCount}` : null
    },
    { id: 'profile', label: 'My Profile', icon: User, requiresAuth: true },
    { id: 'explore', label: 'Explore & Topics', icon: Compass },
    { id: 'friends', label: 'Network', icon: Users, badge: user ? `${user.followingCount || 0}` : null }
  ];

  const userAvatar =
    user?.profileImage ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

  return (
    <aside className="w-full lg:w-64 flex flex-col gap-5 select-none">
      {/* User Profile Mini Card or Sign In prompt */}
      {isAuthenticated && user ? (
        <div
          onClick={onNavigateToMyProfile}
          className={`p-4 rounded-3xl transition-all duration-300 cursor-pointer group border ${isDark
              ? 'bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.08] shadow-lg shadow-black/20'
              : 'bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs'
            }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <img
                src={userAvatar}
                alt={user.name}
                className="relative w-12 h-12 rounded-full object-cover border-2 border-indigo-500/40 group-hover:border-indigo-500 transition-colors"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#14161f]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3
                className={`text-xs sm:text-sm font-bold truncate transition-colors ${isDark ? 'text-white group-hover:text-indigo-300' : 'text-slate-900 group-hover:text-indigo-600'
                  }`}
              >
                {user.name}
              </h3>
              <p className="text-xs text-slate-400 truncate">@{user.username}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {user.followersCount || 0}
                </span>
                <span>followers</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`p-4 rounded-3xl border text-center transition-all ${isDark
              ? 'bg-white/[0.04] border-white/[0.08]'
              : 'bg-white border-slate-200/80 shadow-xs'
            }`}
        >
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Join SocialX
          </h3>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Connect, post media, chat in real-time, and follow creators.
          </p>
          <button
            onClick={onOpenAuth}
            className="w-full py-2 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In / Register</span>
          </button>
        </div>
      )}

      {/* Main Navigation List */}
      <nav
        className={`p-2.5 rounded-3xl transition-all border ${isDark
            ? 'bg-white/[0.03] border-white/[0.06]'
            : 'bg-white/90 border border-slate-200/80 shadow-xs'
          }`}
      >
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    if (item.requiresAuth && !isAuthenticated) {
                      onOpenAuth();
                      return;
                    }
                    if (item.id === 'profile') {
                      onNavigateToMyProfile();
                    } else {
                      setActiveView(item.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all duration-200 ${isActive
                      ? isDark
                        ? 'bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                        : 'bg-slate-900 text-white font-bold shadow-md shadow-slate-900/15'
                      : isDark
                        ? 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''
                        }`}
                    />
                    <span className="tracking-wide">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isActive
                          ? isDark
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-900'
                          : isDark
                            ? 'bg-white/10 text-slate-200'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}

          {/* Logout Action */}
          {isAuthenticated && (
            <li className="pt-2 border-t border-slate-100 dark:border-white/5">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      {/* SocialX Studio App Card */}
      <div
        className={`p-4 rounded-3xl relative overflow-hidden transition-all duration-300 border ${isDark
            ? 'bg-gradient-to-b from-indigo-950/40 via-white/[0.03] to-white/[0.02] border-white/[0.08]'
            : 'bg-gradient-to-b from-indigo-50/80 via-white to-slate-50 border-indigo-100/80 shadow-xs'
          }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              SocialX Web & API
            </span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Phase 3
          </span>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
          Full MERN real-time stack with Socket.IO messaging, presence tracking, live notifications & debounced search.
        </p>

        <div className="text-[10px] text-slate-400 font-mono">
          API: http://localhost:5000/api
        </div>
      </div>
    </aside>
  );
}
