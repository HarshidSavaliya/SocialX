import {
  Home,
  User,
  Users,
  Clapperboard,
  MessageSquare,
  Bell,
  Search,
  Settings,
  LogOut,
  LogIn,
  Lock,
  ShieldCheck,
  PlusCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import { getUserAvatar, handleImageError } from '../utils/avatar';

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
    { id: 'create-post', label: 'Create Post', icon: PlusCircle, requiresAuth: true },
    { id: 'search', label: 'Search', icon: Search },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      requiresAuth: true
    },
    {
      id: 'secret-chat',
      label: 'Secret Chat',
      icon: Lock,
      requiresAuth: true,
      badge: 'PIN'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      requiresAuth: true,
      badge: unreadCount > 0 ? `${unreadCount}` : null
    },
    { id: 'profile', label: 'My Profile', icon: User, requiresAuth: true },
    ...(user?.role === 'ADMIN'
      ? [
          {
            id: 'admin',
            label: 'Admin Panel',
            icon: ShieldCheck,
            requiresAuth: true,
            badge: 'Admin'
          }
        ]
      : []),
    { id: 'reels', label: 'Reels', icon: Clapperboard, badge: 'New' }
  ];

  const userAvatar = getUserAvatar(user);

  return (
    <aside className="w-full lg:w-64 flex flex-col gap-5 select-none">
      {/* User Profile Mini Card or Sign In prompt */}
      {isAuthenticated && user ? (
        <div
          onClick={onNavigateToMyProfile}
          className={`p-4 rounded-3xl transition-all duration-300 cursor-pointer group border ${isDark
              ? 'bg-[#15131a]/90 hover:bg-[#1a1722] border-white/[0.08] shadow-lg shadow-black/30 hover:border-amber-500/30'
              : 'bg-white hover:bg-stone-50 border border-stone-200/80 shadow-xs'
            }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <img
                src={userAvatar}
                onError={(e) => handleImageError(e, user?.name)}
                alt={user.name}
                className="relative w-12 h-12 rounded-full object-cover border-2 border-amber-500/40 group-hover:border-amber-400 transition-colors"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#14161f]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3
                className={`text-xs sm:text-sm font-bold truncate transition-colors ${isDark ? 'text-white group-hover:text-amber-400' : 'text-stone-900 group-hover:text-amber-600'
                  }`}
              >
                {user.name}
              </h3>
              <p className="text-xs text-stone-400 truncate">@{user.username}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-400">
                <span className="font-semibold text-stone-700 dark:text-stone-200">
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
              ? 'bg-[#15131a]/90 border-white/[0.08] shadow-lg shadow-black/30'
              : 'bg-white border-stone-200/80 shadow-xs'
            }`}
        >
          <h3 className="text-sm font-bold text-stone-900 dark:text-white mb-1">
            Join SocialX
          </h3>
          <p className="text-xs text-stone-400 mb-3 leading-relaxed">
            Connect, post media, chat in real-time, and follow creators.
          </p>
          <button
            onClick={onOpenAuth}
            className="w-full py-2.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 hover:brightness-110 shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In / Register</span>
          </button>
        </div>
      )}

      {/* Primary Create Post Action Button */}
      {isAuthenticated && (
        <button
          onClick={() => setActiveView('create-post')}
          className={`w-full py-3 px-4 rounded-3xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] ${
            activeView === 'create-post'
              ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-stone-950 ring-2 ring-amber-400 shadow-amber-500/30'
              : 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 text-stone-950 hover:brightness-110 shadow-amber-500/20'
          }`}
        >
          <PlusCircle className="w-4 h-4 text-stone-950 stroke-[2.5]" />
          <span>Create New Post</span>
        </button>
      )}

      {/* Main Navigation List */}
      <nav
        className={`p-2.5 rounded-3xl transition-all border ${isDark
            ? 'bg-[#15131a]/80 backdrop-blur-xl border-white/[0.08] shadow-lg shadow-black/30'
            : 'bg-white/90 border border-stone-200/80 shadow-xs'
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
                        ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-400 font-bold border border-amber-500/30 shadow-sm shadow-amber-500/10'
                        : 'bg-stone-900 text-white font-bold shadow-md shadow-stone-900/15'
                      : isDark
                        ? 'text-stone-400 hover:text-white hover:bg-white/[0.04]'
                        : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100/80'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? (isDark ? 'text-amber-400' : 'text-white') : 'text-stone-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isActive
                          ? 'bg-amber-400 text-stone-950'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
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
    </aside>
  );
}
