import React, { useState, useEffect } from 'react';
import { Search, Compass, TrendingUp, Sparkles, Hash, ArrowUpRight, Filter } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { postService } from '../services/postService';
import PostCard from '../components/PostCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';

export default function ExploreView({ onNavigateToProfile, onHashtagClick }) {
  const { isDark } = useTheme();
  const [selectedTag, setSelectedTag] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Technology', 'Photography', 'Design', 'Architecture', 'Cinema'];

  const trendingTopics = [
    { tag: 'technology', label: '#technology', category: 'Computing & AI', posts: 'Real-time sync' },
    { tag: 'design', label: '#design', category: 'Creative & UI', posts: 'Visual excellence' },
    { tag: 'photography', label: '#photography', category: 'Media & Arts', posts: 'Cloudinary CDN' },
    { tag: 'socialx', label: '#socialx', category: 'Platform', posts: 'Agora & WebRTC' }
  ];

  // Fetch real posts from MongoDB via API
  useEffect(() => {
    let isMounted = true;
    const fetchExplorePosts = async () => {
      try {
        setLoading(true);
        const res = await postService.getFeed({ page: 1, limit: 20 });
        if (isMounted) {
          setPosts(res.posts || []);
        }
      } catch (err) {
        console.warn('Explore feed load error:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchExplorePosts();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePostUpdated = (updatedPost) => {
    const updatedId = updatedPost._id || updatedPost.id;
    setPosts((prev) => prev.map((p) => ((p._id || p.id) === updatedId ? updatedPost : p)));
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => (p._id || p.id) !== postId));
  };

  // Filter posts based on search input and selected category/tag
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      !searchQuery ||
      post.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.hashtags?.some((h) => h.toLowerCase().includes(searchQuery.toLowerCase())) ||
      post.author?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author?.username?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedTag === 'All' ||
      post.caption?.toLowerCase().includes(selectedTag.toLowerCase()) ||
      post.hashtags?.some((h) => h.toLowerCase().includes(selectedTag.toLowerCase()));

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Search */}
      <div
        className={`p-6 sm:p-8 rounded-3xl transition-all duration-300 relative overflow-hidden border ${
          isDark
            ? 'bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-[#12141c] border-white/[0.08]'
            : 'bg-gradient-to-r from-indigo-50 via-purple-50 to-white border-indigo-100 shadow-xs'
        }`}
      >
        <div className="max-w-xl">
          <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            <span>Discover & Perspectives</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Explore Curated Perspectives
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">
            Discover community posts, media shared across SocialX, and trending discussions.
          </p>

          {/* Search bar */}
          <div
            className={`flex items-center rounded-full px-4 py-2.5 max-w-md ${
              isDark ? 'bg-white/10 border border-white/15' : 'bg-white border border-slate-200 shadow-xs'
            }`}
          >
            <Search className="w-4 h-4 text-slate-400 mr-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics, creators, or keywords..."
              className="bg-transparent outline-none text-xs sm:text-sm w-full text-slate-800 dark:text-white placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedTag(cat)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedTag === cat
                ? isDark
                  ? 'bg-white text-slate-900 font-bold'
                  : 'bg-slate-900 text-white font-bold'
                : isDark
                ? 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/10'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Trending Topics Grid */}
      <div
        className={`p-5 rounded-3xl border ${
          isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2 mb-3.5">
          <TrendingUp className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Trending Across SocialX
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {trendingTopics.map((topic, i) => (
            <div
              key={i}
              onClick={() => {
                if (onHashtagClick) {
                  onHashtagClick(topic.tag);
                } else {
                  setSearchQuery(topic.tag);
                }
              }}
              className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                isDark ? 'hover:bg-white/[0.05] bg-white/[0.02]' : 'hover:bg-slate-50 bg-slate-50/50'
              }`}
            >
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">{topic.category}</span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{topic.label}</h4>
                <span className="text-[11px] text-indigo-500 font-medium">{topic.posts}</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Posts Stream */}
      {loading ? (
        <LoadingSkeleton count={3} />
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          title="No posts found"
          description={
            searchQuery || selectedTag !== 'All'
              ? 'No posts matched your current search or category filter.'
              : 'There are no posts available to explore yet. Share a post on the main feed!'
          }
          actionText={searchQuery || selectedTag !== 'All' ? 'Reset Filters' : 'Refresh'}
          onAction={() => {
            setSearchQuery('');
            setSelectedTag('All');
          }}
        />
      ) : (
        <div className="space-y-6">
          {filteredPosts.map((post) => (
            <PostCard
              key={post._id || post.id}
              post={post}
              onPostUpdated={handlePostUpdated}
              onPostDeleted={handlePostDeleted}
              onNavigateToProfile={onNavigateToProfile}
              onHashtagClick={onHashtagClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
