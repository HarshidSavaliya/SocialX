import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { userService } from '../services/userService';
import SuggestionCard from './SuggestionCard';

export default function RightSidebar({ onNavigateUser, onHashtagClick }) {
  const { isDark } = useTheme();
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadSuggestions = async () => {
      try {
        setLoadingSuggestions(true);
        const data = await userService.getSuggestions(5);
        if (isMounted) setSuggestions(data);
      } catch (err) {
        console.warn('Could not load suggestions:', err.message);
      } finally {
        if (isMounted) setLoadingSuggestions(false);
      }
    };

    loadSuggestions();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <aside className="w-full lg:w-72 flex flex-col gap-4 select-none">
      {/* People You May Know (Real MongoDB user data) */}
      <section
        className={`p-4 rounded-3xl transition-all duration-300 border ${isDark
            ? 'bg-[#15131a]/90 backdrop-blur-xl border-white/[0.08] shadow-lg shadow-black/30'
            : 'bg-white border-stone-200/80 shadow-xs'
          }`}
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-stone-900 dark:text-white tracking-tight">
            Suggestions
          </h2>
          <span className="text-[11px] font-semibold text-amber-500">Discover</span>
        </div>

        {loadingSuggestions ? (
          <div className="flex items-center justify-center py-4 text-xs text-slate-400 gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
            <span>Finding creators...</span>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-3 text-xs text-slate-400">
            No new suggestions right now.
          </div>
        ) : (
          <div className="space-y-1 divide-y divide-slate-100/60 dark:divide-white/[0.04]">
            {suggestions.map((user) => (
              <SuggestionCard
                key={user.id || user._id}
                user={user}
                onNavigate={onNavigateUser}
              />
            ))}
          </div>
        )}
      </section>

      {/* Clean Minimal App Footer */}
      <div className="px-3 py-1 text-[11px] text-slate-400 dark:text-slate-500 flex flex-wrap gap-x-2.5 gap-y-1">
        <span>© 2026 SocialX</span>
        <span>•</span>
        <span className="hover:underline cursor-pointer">Privacy</span>
        <span>•</span>
        <span className="hover:underline cursor-pointer">Terms</span>
        <span>•</span>
        <span className="hover:underline cursor-pointer">Help</span>
      </div>
    </aside>
  );
}
