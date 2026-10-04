import React from 'react';
import { Search, Hash, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSearch } from '../hooks/useSearch';
import { useAuth } from '../context/AuthContext';
import FollowButton from '../components/FollowButton';

export default function SearchView({ onNavigateToProfile, onHashtagClick, onOpenConversation }) {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const { query, setQuery, results, loading, filter, setFilter } = useSearch(400);

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'people', label: 'People' },
    { id: 'posts', label: 'Posts' },
    { id: 'hashtags', label: 'Hashtags' }
  ];

  const showPeople = filter === 'all' || filter === 'people';
  const showPosts = filter === 'all' || filter === 'posts';
  const showHashtags = filter === 'all' || filter === 'hashtags';

  const hasResults = results.users.length > 0 || results.posts.length > 0 || results.hashtags.length > 0;

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${isDark
          ? 'bg-white/[0.04] border-white/[0.08]'
          : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search people, posts, or #hashtags..."
          className={`flex-1 text-sm bg-transparent outline-none ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
            }`}
        />
        {loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin flex-shrink-0" />}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === f.id
                ? isDark ? 'bg-white text-slate-950' : 'bg-slate-900 text-white'
                : isDark ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {!query.trim() ? (
        <div className={`rounded-2xl border p-8 text-center ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-slate-100'}`}>
          <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Start searching</p>
          <p className="text-xs text-slate-400 mt-1">Find people, posts, and hashtags on SocialX</p>
        </div>
      ) : !loading && !hasResults ? (
        <div className={`rounded-2xl border p-8 text-center ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-slate-100'}`}>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* People */}
          {showPeople && results.users.length > 0 && (
            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06]">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">People</span>
              </div>
              <div className="divide-y divide-slate-100/60 dark:divide-white/[0.04]">
                {results.users.map(u => (
                  <div
                    key={u._id}
                    className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}
                    onClick={() => onNavigateToProfile && onNavigateToProfile(u.username || u._id || u.id)}
                  >
                    <img
                      src={u.profileImage}
                      alt={u.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{u.name}</p>
                      <p className="text-xs text-slate-400 truncate">@{u.username}</p>
                      {u.bio && (
                        <p className={`text-[11px] mt-1 line-clamp-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          {u.bio}
                        </p>
                      )}
                    </div>
                    {!u.isSelf && (
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <FollowButton
                          userId={u._id}
                          initialFollowing={u.isFollowing}
                          size="sm"
                        />
                        {isAuthenticated && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenConversation) onOpenConversation(u._id);
                            }}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${isDark
                                ? 'bg-white/10 text-white hover:bg-white/20'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                          >
                            Message
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          {showPosts && results.posts.length > 0 && (
            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06]">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Posts</span>
              </div>
              <div className="divide-y divide-slate-100/60 dark:divide-white/[0.04]">
                {results.posts.map(p => (
                  <div
                    key={p._id}
                    className={`p-3.5 flex gap-3 cursor-pointer transition-colors ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}
                    onClick={() => onNavigateToProfile && onNavigateToProfile(p.author?.username || p.author?._id || p.author?.id || p.author)}
                  >
                    {p.mediaUrl && p.mediaType === 'image' && (
                      <img
                        src={p.mediaUrl}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        @{p.author?.username}
                      </p>
                      <p className={`text-xs truncate-2-lines leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {p.caption || '(No caption)'}
                      </p>
                      {p.hashtags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.hashtags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onHashtagClick) onHashtagClick(tag);
                              }}
                              className="text-[10px] text-indigo-500 font-semibold hover:underline cursor-pointer"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hashtags */}
          {showHashtags && results.hashtags.length > 0 && (
            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06]">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hashtags</span>
              </div>
              <div className="divide-y divide-slate-100/60 dark:divide-white/[0.04]">
                {results.hashtags.map(h => (
                  <button
                    key={h.tag}
                    onClick={() => onHashtagClick && onHashtagClick(h.tag)}
                    className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/[0.08]' : 'bg-slate-100'}`}>
                      <Hash className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>#{h.tag}</p>
                      <p className="text-xs text-slate-400">{h.count} {h.count === 1 ? 'post' : 'posts'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
