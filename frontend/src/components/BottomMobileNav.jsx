import React from 'react';
import { Home, Search, PlusCircle, MessageSquare, Clapperboard, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';

export default function BottomMobileNav({ activeView, setActiveView, onOpenCreatePost }) {
  const { isDark } = useTheme();
  const { unreadCount } = useNotifications();

  const navItems = [
    { id: 'feed', label: 'Home', icon: Home },
    { id: 'reels', label: 'Reels', icon: Clapperboard },
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
      className={`md:hidden fixed bottom-4 inset-x-4 z-40 max-w-sm mx-auto px-4 py-2 rounded-full backdrop-blur-2xl transition-all shadow-2xl ${
        isDark
          ? 'bg-[#15131a]/90 border border-white/15 shadow-black/80'
          : 'bg-white/95 border border-stone-200/80 shadow-slate-400/20'
      }`}
    >
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          if (item.isCreate) {
            return (
              <button
                key={item.id}
                onClick={onOpenCreatePost}
                className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30 flex items-center justify-center active:scale-95 hover:scale-105 transition-all"
                title="Create Post"
              >
                <Icon className="w-5 h-5 stroke-[2.5]" />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all relative ${isActive
                  ? isDark
                    ? 'text-amber-400 font-bold'
                    : 'text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
                }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>

              {item.badge && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-[#15131a]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
