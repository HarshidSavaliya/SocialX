import React from 'react';
import { Home, Search, PlusCircle, MessageSquare, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';

export default function BottomMobileNav({ activeView, setActiveView, onOpenCreatePost }) {
  const { isDark } = useTheme();
  const { unreadCount } = useNotifications();

  const navItems = [
    { id: 'feed', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'create', label: 'Post', icon: PlusCircle, isCreate: true },
    {
      id: 'messages',
      label: 'Chat',
      icon: MessageSquare,
      badge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : `${unreadCount}`) : null
    },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <div
      className={`md:hidden fixed bottom-0 inset-x-0 z-40 px-4 py-2 border-t backdrop-blur-2xl transition-colors ${isDark ? 'bg-[#0e1017]/90 border-white/[0.08]' : 'bg-white/90 border-slate-200 shadow-lg'
        }`}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          if (item.isCreate) {
            return (
              <button
                key={item.id}
                onClick={onOpenCreatePost}
                className="p-2.5 rounded-full bg-gradient-to-tr from-slate-900 to-indigo-800 text-white shadow-md shadow-indigo-900/30 active:scale-95 transition-transform"
                title="Create Post"
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative ${isActive
                  ? isDark
                    ? 'text-white font-bold'
                    : 'text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>

              {item.badge && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-[#0e1017]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
