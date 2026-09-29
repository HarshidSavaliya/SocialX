import React, { useState, useEffect } from 'react';
import { Grid, Bookmark, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { userService } from '../services/userService';
import { postService } from '../services/postService';
import ProfileHeader from '../components/ProfileHeader';
import PostCard from '../components/PostCard';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function ProfileView({
  username,
  onBack,
  onNavigateToProfile,
  onHashtagClick,
  onOpenConversation,
  onStartSecretChat
}) {
  const { user: authUser } = useAuth();
  const { isDark } = useTheme();

  // Target username to inspect
  const targetUsername = username || authUser?.username;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfileData = async () => {
      if (!targetUsername) return;

      try {
        setLoading(true);
        setError(null);
        const profileData = await userService.getUserProfile(targetUsername);
        if (isMounted) {
          setProfile(profileData);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Could not load profile');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const loadUserPosts = async () => {
      if (!targetUsername) return;

      try {
        setLoadingPosts(true);
        const res = await postService.getUserPosts(targetUsername, { page: 1, limit: 20 });
        if (isMounted) {
          setPosts(res.posts);
        }
      } catch (err) {
        console.warn('Could not load user posts:', err.message);
      } finally {
        if (isMounted) setLoadingPosts(false);
      }
    };

    loadProfileData();
    loadUserPosts();

    return () => {
      isMounted = false;
    };
  }, [targetUsername]);

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => (p._id || p.id) !== postId));
    setProfile((prev) => (prev ? { ...prev, postsCount: Math.max(0, prev.postsCount - 1) } : prev));
  };

  const handlePostUpdated = (updatedPost) => {
    const updatedId = updatedPost._id || updatedPost.id;
    setPosts((prev) => prev.map((p) => ((p._id || p.id) === updatedId ? updatedPost : p)));
  };

  const mediaPosts = posts.filter((p) => p.mediaUrl);

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className={`h-72 rounded-3xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-slate-200'}`} />
        <LoadingSkeleton count={2} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <EmptyState
          title="User not found"
          description={error || "The profile you are looking for doesn't exist or has been removed."}
          actionText="Back to Feed"
          onAction={onBack}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button if viewing another user */}
      {onBack && (
        <button
          onClick={onBack}
          className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>
      )}

      {/* Profile Header Shell */}
      <ProfileHeader
        profile={profile}
        onProfileUpdated={(updated) => setProfile((prev) => ({ ...prev, ...updated }))}
        onFollowToggle={(isFollowing) => {
          setProfile((prev) => ({
            ...prev,
            isFollowing,
            followersCount: isFollowing ? prev.followersCount + 1 : Math.max(0, prev.followersCount - 1)
          }));
        }}
        onStartSecretChat={onStartSecretChat}
      />

      {/* Profile Navigation Tabs */}
      <div
        className={`flex items-center border-b px-2 text-xs font-bold ${isDark ? 'border-white/10' : 'border-slate-200'
          }`}
      >
        <button
          onClick={() => setActiveTab('posts')}
          className={`py-3 px-5 border-b-2 transition-all ${activeTab === 'posts'
              ? 'border-indigo-500 text-indigo-500'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
        >
          <span>Posts ({posts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`py-3 px-5 border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'media'
              ? 'border-indigo-500 text-indigo-500'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Media ({mediaPosts.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'posts' && (
        <div className="space-y-6">
          {loadingPosts ? (
            <LoadingSkeleton count={2} />
          ) : posts.length === 0 ? (
            <EmptyState
              title="No posts published yet"
              description={`@${profile.username} hasn't posted anything to SocialX yet.`}
            />
          ) : (
            posts.map((post) => (
              <PostCard
                key={post._id || post.id}
                post={post}
                onPostUpdated={handlePostUpdated}
                onPostDeleted={handlePostDeleted}
                onNavigateToProfile={onNavigateToProfile}
                onHashtagClick={onHashtagClick}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'media' && (
        <div>
          {mediaPosts.length === 0 ? (
            <EmptyState
              title="No media uploaded yet"
              description="Photos and videos shared in posts will appear in this visual gallery."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mediaPosts.map((post) => (
                <div
                  key={post._id || post.id}
                  className="aspect-square rounded-2xl overflow-hidden bg-black/10 border border-slate-200 dark:border-white/10 group cursor-pointer"
                >
                  {post.mediaType === 'video' ? (
                    <video src={post.mediaUrl} className="w-full h-full object-cover" />
                  ) : (
                    <img
                      src={post.mediaUrl}
                      alt={post.caption || 'Media'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
