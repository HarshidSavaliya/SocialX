import React, { useState } from 'react';
import { Search, Flame, TrendingUp, Compass, Sparkles, Hash, ArrowUpRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { initialPosts } from '../data/mockData';
import PostCard from '../components/PostCard';

export default function ExploreView() {
  const { isDark } = useTheme();
  const [selectedTag, setSelectedTag] = useState('All');

  const tags = ['All', 'Alpine Expeditions', 'Cinematography', 'Spatial UI', 'Specialty Coffee', 'Architecture'];

  const trendingTopics = [
    { tag: '#Oppenheimer70mm', posts: '48.2K posts', category: 'Cinema & Arts' },
    { tag: '#VisionOS3', posts: '32.1K posts', category: 'Spatial Computing' },
    { tag: '#MatterhornAscent', posts: '19.4K posts', category: 'Outdoors & Climbing' },
    { tag: '#PourOverChemistry', posts: '8.7K posts', category: 'Culinary Craft' },
    { tag: '#AnalogSynthesizers', posts: '14.5K posts', category: 'Electronic Sound' }
  ];

  return (
    <div className="space-y-6">

      {/* Top Banner & Search */}
      <div className={`p-6 sm:p-8 rounded-3xl transition-all duration-300 relative overflow-hidden ${isDark
          ? 'bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-[#12141c] border border-white/[0.08]'
          : 'bg-gradient-to-r from-indigo-50 via-purple-50 to-white border border-indigo-100 shadow-xs'
        }`}>
        <div className="max-w-xl">
          <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            <span>Discover & Forums</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Explore Curated Perspectives
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">
            Dive into high-fidelity photography, technical design breakdowns, and global discussions.
          </p>

          {/* Search */}
          <div className={`flex items-center rounded-full px-4 py-2.5 max-w-md ${isDark ? 'bg-white/10 border border-white/15' : 'bg-white border border-slate-200 shadow-xs'
            }`}>
            <Search className="w-4 h-4 text-slate-400 mr-2.5" />
            <input
              type="text"
              placeholder="Search topics, creators, and discussions..."
              className="bg-transparent outline-none text-xs sm:text-sm w-full text-slate-800 dark:text-white placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Filter Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTag(t)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedTag === t
                ? isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                : isDark
                  ? 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/10'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Trending Topics Grid */}
      <div className={`p-5 rounded-3xl border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-xs'
        }`}>
        <div className="flex items-center gap-2 mb-3.5">
          <TrendingUp className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Trending Across SocialX
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {trendingTopics.map((topic, i) => (
            <div
              key={i}
              className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-slate-50'
                }`}
            >
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">{topic.category}</span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{topic.tag}</h4>
                <span className="text-[11px] text-indigo-500 font-medium">{topic.posts}</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Posts Stream */}
      <div className="space-y-5">
        {initialPosts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>

    </div>
  );
}
