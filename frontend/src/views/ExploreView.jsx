import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Eye, ArrowUpRight, Flame } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { postService } from '../services/postService';
import PostCard from '../components/PostCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';

const FEATURED_REELS = [
  {
    id: 'f1',
    title: 'Safari road trip across Nevada',
    creator: 'Marco Vance',
    views: '12 M Views',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'f2',
    title: 'Alpine trekking & mountain peaks',
    creator: 'Elena Rostova',
    views: '7.2 M Views',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'f3',
    title: 'Sunset over Atlantic wings',
    creator: 'Skyline Airways',
    views: '6.8 M Views',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'f4',
    title: 'Neon cyberpunk alleys in Shinjuku',
    creator: 'Kenji Sato',
    views: '15 M Views',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80'
  }
];

export default function ExploreView({ onNavigateToProfile, onHashtagClick }) {
  const { isDark } = useTheme();
  const [selectedTag, setSelectedTag] = useState('Popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = ['Popular', 'Latest', 'Sports', 'Traveling', 'News', 'Design', 'Architecture'];

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
      selectedTag === 'Popular' ||
      selectedTag === 'Latest' ||
      post.caption?.toLowerCase().includes(selectedTag.toLowerCase()) ||
      post.hashtags?.some((h) => h.toLowerCase().includes(selectedTag.toLowerCase()));

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header: Discover - Find your favorite content */}
      <div
        className={`p-6 sm:p-7 rounded-3xl transition-all duration-300 border ${
          isDark
            ? 'bg-[#15131a]/90 backdrop-blur-xl border-white/[0.08] shadow-lg shadow-black/30'
            : 'bg-white border-stone-200/80 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">
              Discover
            </h1>
            <p className="text-xs text-stone-400 mt-0.5">
              Find your favorite content and viral visual perspectives
            </p>
          </div>

          {/* Search bar */}
          <div
            className={`flex items-center rounded-full px-4 py-2 max-w-sm w-full border ${
              isDark
                ? 'bg-white/[0.04] border-white/10 focus-within:border-amber-500/50'
                : 'bg-stone-100 border-stone-200 focus-within:border-stone-400'
            }`}
          >
            <Search className="w-4 h-4 text-stone-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search creators, topics..."
              className="bg-transparent outline-none text-xs w-full text-stone-900 dark:text-white placeholder-stone-400"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-6 mt-6 border-b border-white/[0.06] overflow-x-auto scrollbar-none pb-1">
          {categories.map((cat) => {
            const isActive = selectedTag === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedTag(cat)}
                className={`text-xs font-bold whitespace-nowrap pb-2 transition-all cursor-pointer relative ${
                  isActive
                    ? 'text-amber-400 font-extrabold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>{cat}</span>
                {isActive && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Featured Visual Cards Carousel (Matches Reference Image) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-5">
          {FEATURED_REELS.map((item) => (
            <div
              key={item.id}
              className="group/reel relative h-48 sm:h-64 rounded-3xl overflow-hidden cursor-pointer border border-white/10 shadow-lg shadow-black/40 hover:scale-[1.02] transition-transform duration-300"
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover/reel:scale-108"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

              {/* View count pill */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-[11px] text-white/90">
                <span className="font-bold drop-shadow-md truncate">{item.views}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended For You Heading */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-extrabold text-stone-900 dark:text-white tracking-tight">
            Recommended For You
          </h2>
        </div>
        <span className="text-[11px] font-semibold text-amber-500">Live stream</span>
      </div>

      {/* Posts Stream */}
      {loading ? (
        <LoadingSkeleton count={3} />
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          title="No posts found"
          description={
            searchQuery || selectedTag !== 'Popular'
              ? 'No posts matched your current search or category filter.'
              : 'There are no posts available to explore yet. Share a post on the main feed!'
          }
          actionText={searchQuery || selectedTag !== 'Popular' ? 'Reset Filters' : 'Refresh'}
          onAction={() => {
            setSearchQuery('');
            setSelectedTag('Popular');
          }}
        />
      ) : (
        <div className="space-y-5">
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
