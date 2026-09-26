import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  Music,
  Compass,
  Flame,
  Hash,
  Loader2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { userService } from '../services/userService';
import StorySection from './StorySection';
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

  const trendingHashtags = [
    { tag: '#swissalps', count: '12.4K posts' },
    { tag: '#oppenheimer', count: '48.2K posts' },
    { tag: '#designsystem', count: '19.1K posts' },
    { tag: '#coffeeculture', count: '8.3K posts' },
    { tag: '#mern', count: '24.5K posts' }
  ];

  const recommendations = [
    { label: 'UI/UX Design', icon: Layers, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    { label: 'Cinematography', icon: Sparkles, color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
    { label: 'Alpine Trekking', icon: Compass, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' }
  ];

  return (
    <aside className="w-full lg:w-72 flex flex-col gap-5 select-none">
      {/* 1. Stories Section (Structured empty state as instructed for Phase 2) */}
      <StorySection />

      {/* 2. People You May Know (Real MongoDB user data) */}
      <section
        className={`p-4 rounded-3xl transition-all duration-300 border ${isDark
            ? 'bg-white/[0.03] border-white/[0.08]'
            : 'bg-white border-slate-200/80 shadow-xs'
          }`}
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Suggestions
          </h2>
          <span className="text-[11px] text-slate-400">Discover</span>
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

      {/* 3. Trending Hashtags */}
      <section
        className={`p-4 rounded-3xl transition-all duration-300 border ${isDark
            ? 'bg-white/[0.03] border-white/[0.08]'
            : 'bg-white border-slate-200/80 shadow-xs'
          }`}
      >
        <div className="flex items-center gap-1.5 mb-3 px-1 text-slate-900 dark:text-white">
          <Flame className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold tracking-tight">Trending Topics</h2>
        </div>

        <div className="space-y-2">
          {trendingHashtags.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onHashtagClick && onHashtagClick(item.tag)}
              className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {item.tag.replace('#', '')}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">{item.count}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 4. Recommendations */}
      <section
        className={`p-4 rounded-3xl transition-all duration-300 border ${isDark
            ? 'bg-white/[0.03] border-white/[0.08]'
            : 'bg-white border-slate-200/80 shadow-xs'
          }`}
      >
        <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-3 px-1">
          Recommendations
        </h2>

        <div className="space-y-2">
          {recommendations.map((rec, i) => {
            const Icon = rec.icon;
            return (
              <div
                key={i}
                className={`p-2.5 rounded-2xl flex items-center gap-2.5 border transition-all cursor-pointer hover:scale-101 ${rec.color}`}
              >
                <div className="p-1.5 rounded-xl bg-white/20 dark:bg-white/10">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold">{rec.label}</span>
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
