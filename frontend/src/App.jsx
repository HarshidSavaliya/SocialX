import React, { useState, useEffect, lazy, Suspense } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { VideoCallProvider } from './context/VideoCallContext';

// Components
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import PostComposer from './components/PostComposer';
import PostCard from './components/PostCard';
import LoadingSkeleton from './components/LoadingSkeleton';
import EmptyState from './components/EmptyState';
import AuthModal from './components/AuthModal';
import BottomMobileNav from './components/BottomMobileNav';
import VideoCallManager from './components/VideoCall/VideoCallManager';

// Views (Eager for standard social workflow, lazy for heavy administrative & isolated modules)
import ProfileView from './views/ProfileView';
import MessagingView from './views/MessagingView';
import SearchView from './views/SearchView';
import NotificationsView from './views/NotificationsView';
import ExploreView from './views/ExploreView';

// Route-level code splitting (PART 26: Performance Optimization)
const AdminView = lazy(() => import('./views/AdminView'));
const SecretChatView = lazy(() => import('./views/SecretChatView'));

// API Services
import { postService } from './services/postService';
import { Sparkles, Hash, X, RefreshCw } from 'lucide-react';

function SocialXMain() {
  const { isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();

  // Navigation states: 'feed' | 'profile' | 'messages' | 'search' | 'notifications' | 'explore'
  const [activeView, setActiveView] = useState('feed');
  const [targetUsername, setTargetUsername] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Feed states
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, hasNextPage: false });
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedFilter, setFeedFilter] = useState('all'); // 'all' | 'friends'
  const [activeHashtag, setActiveHashtag] = useState(null);

  // Load feed on mount and when filter / hashtag changes
  const loadFeed = async (page = 1, append = false) => {
    try {
      if (page === 1) setLoadingFeed(true);
      else setLoadingMore(true);

      const res = await postService.getFeed({
        page,
        limit: 10,
        filter: feedFilter
      });

      let fetchedPosts = res.posts;

      // Client-side hashtag filter if active
      if (activeHashtag) {
        const cleanTag = activeHashtag.toLowerCase();
        fetchedPosts = fetchedPosts.filter((p) =>
          p.hashtags?.some((t) => t.toLowerCase() === cleanTag || t.toLowerCase() === `#${cleanTag}`)
        );
      }

      setPosts((prev) => (append ? [...prev, ...fetchedPosts] : fetchedPosts));
      setPagination(res.pagination);
    } catch (err) {
      console.warn('Could not load feed:', err.message);
    } finally {
      setLoadingFeed(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (activeView === 'feed') {
      loadFeed(1, false);
    }
  }, [activeView, feedFilter, activeHashtag, isAuthenticated]);

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostUpdated = (updatedPost) => {
    const updatedId = updatedPost._id || updatedPost.id;
    setPosts((prev) => prev.map((p) => ((p._id || p.id) === updatedId ? updatedPost : p)));
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => (p._id || p.id) !== postId));
  };

  const handleNavigateToProfile = (username) => {
    setTargetUsername(username);
    setActiveView('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHashtagClick = (tag) => {
    setActiveHashtag(tag);
    setActiveView('feed');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenConversation = (targetUserIdOrConvId) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setActiveView('messages');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenSearch = () => {
    setActiveView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenNotifications = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setActiveView('notifications');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [secretChatConvId, setSecretChatConvId] = useState(null);

  const handleOpenSecretChat = (convId = null) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setSecretChatConvId(convId);
    setActiveView('secret-chat');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAdmin = () => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      setShowAuthModal(true);
      return;
    }
    setActiveView('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-500 font-sans relative overflow-x-hidden ${isDark ? 'bg-[#0a0c12] text-slate-100' : 'bg-[#edf1f8] text-slate-900'
        }`}
    >
      {/* Ambient Atmospheric Backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {isDark ? (
          <>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-amber-500/8 via-rose-500/4 to-transparent rounded-full blur-[140px] transform translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-indigo-600/6 rounded-full blur-[120px]" />
          </>
        ) : (
          <>
            <div className="absolute top-0 right-1/4 w-[700px] h-[500px] bg-gradient-to-b from-indigo-100/60 via-purple-100/40 to-transparent rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-10 w-[600px] h-[400px] bg-slate-200/50 rounded-full blur-[90px]" />
          </>
        )}
      </div>

      {/* Main Top Header */}
      <Header
        onOpenCreatePost={() => {
          if (!isAuthenticated) setShowAuthModal(true);
          else {
            setActiveView('feed');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onOpenAuth={() => setShowAuthModal(true)}
        onNavigateHome={() => {
          setActiveView('feed');
          setTargetUsername(null);
          setActiveHashtag(null);
        }}
        onNavigateToMyProfile={() => {
          if (user?.username) handleNavigateToProfile(user.username);
        }}
        onSearchHashtag={(tag) => handleHashtagClick(tag)}
        onOpenSearch={handleOpenSearch}
        onOpenNotifications={handleOpenNotifications}
        onOpenConversation={handleOpenConversation}
        onOpenAdmin={handleOpenAdmin}
        onOpenSecretChat={() => handleOpenSecretChat(null)}
      />

      {/* Main Desktop Container */}
      <main className="relative z-10 max-w-[1440px] mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Sidebar */}
          <div className="hidden lg:block flex-shrink-0">
            <div className="sticky top-24">
              <LeftSidebar
                activeView={activeView}
                setActiveView={(view) => {
                  if (view === 'secret-chat') {
                    handleOpenSecretChat(null);
                  } else if (view === 'admin') {
                    handleOpenAdmin();
                  } else {
                    setActiveView(view);
                    if (view === 'feed') {
                      setTargetUsername(null);
                      setActiveHashtag(null);
                    }
                  }
                }}
                onOpenAuth={() => setShowAuthModal(true)}
                onNavigateToMyProfile={() => {
                  if (user?.username) handleNavigateToProfile(user.username);
                }}
              />
            </div>
          </div>

          {/* Full-width view for real-time messaging, Secret Chat, or Admin */}
          {activeView === 'messages' ? (
            <div className="flex-1 w-full min-w-0">
              <MessagingView onOpenSecretChat={() => handleOpenSecretChat(null)} />
            </div>
          ) : activeView === 'secret-chat' ? (
            <div className="flex-1 w-full min-w-0">
              <Suspense fallback={<div className="p-6"><LoadingSkeleton count={3} /></div>}>
                <SecretChatView
                  initialConversationId={secretChatConvId}
                  onExit={() => {
                    setActiveView('feed');
                    setSecretChatConvId(null);
                  }}
                />
              </Suspense>
            </div>
          ) : activeView === 'admin' ? (
            <div className="flex-1 w-full min-w-0">
              <Suspense fallback={<div className="p-6"><LoadingSkeleton count={3} /></div>}>
                <AdminView onNavigateToProfile={handleNavigateToProfile} />
              </Suspense>
            </div>
          ) : (
            <>
              {/* Center Main Stage */}
              <div className="flex-1 w-full max-w-2xl mx-auto space-y-6">
                {/* VIEW A: FEED */}
                {activeView === 'feed' && (
                  <>
                    {/* Feed Header with Sub-tabs & Hashtag filter */}
                    <div
                      className={`p-4 rounded-3xl flex flex-wrap items-center justify-between gap-3 border ${isDark
                          ? 'bg-white/[0.03] border-white/[0.08]'
                          : 'bg-white border-slate-200/80 shadow-xs'
                        }`}
                    >
                      <div>
                        <h1 className="text-lg font-black tracking-tight">SocialX Feed</h1>
                        <p className="text-[11px] text-slate-400">
                          {feedFilter === 'friends'
                            ? 'Posts from creators you follow'
                            : 'Connected global social stream'}
                        </p>
                      </div>

                      {/* Sub-tabs pills */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setFeedFilter('all')}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${feedFilter === 'all'
                              ? isDark
                                ? 'bg-white text-slate-950'
                                : 'bg-slate-900 text-white'
                              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                          All Posts
                        </button>
                        <button
                          onClick={() => {
                            if (!isAuthenticated) setShowAuthModal(true);
                            else setFeedFilter('friends');
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${feedFilter === 'friends'
                              ? isDark
                                ? 'bg-white text-slate-950'
                                : 'bg-slate-900 text-white'
                              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                          Following Only
                        </button>
                      </div>
                    </div>

                    {/* Active Hashtag Filter Chip */}
                    {activeHashtag && (
                      <div className="flex items-center justify-between px-4 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5" />
                          <span>Filtering by {activeHashtag}</span>
                        </div>
                        <button
                          onClick={() => setActiveHashtag(null)}
                          className="hover:text-indigo-200 flex items-center gap-1 text-[11px]"
                        >
                          <span>Clear filter</span>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Create Post Box (PostComposer) */}
                    <PostComposer
                      onPostCreated={handlePostCreated}
                      onOpenAuth={() => setShowAuthModal(true)}
                    />

                    {/* Feed Posts Stream */}
                    {loadingFeed ? (
                      <LoadingSkeleton count={3} />
                    ) : posts.length === 0 ? (
                      <EmptyState
                        title="Your feed is quiet right now"
                        description={
                          feedFilter === 'friends'
                            ? "You aren't following anyone who has posted yet. Check out the suggestions rail!"
                            : 'No posts match this filter. Be the first to share something with SocialX!'
                        }
                        actionText={feedFilter === 'friends' ? 'Show All Posts' : 'Refresh Feed'}
                        onAction={() => {
                          setFeedFilter('all');
                          setActiveHashtag(null);
                          loadFeed(1, false);
                        }}
                      />
                    ) : (
                      <div className="space-y-6">
                        {posts.map((post) => (
                          <PostCard
                            key={post._id || post.id}
                            post={post}
                            onPostUpdated={handlePostUpdated}
                            onPostDeleted={handlePostDeleted}
                            onNavigateToProfile={handleNavigateToProfile}
                            onHashtagClick={handleHashtagClick}
                          />
                        ))}

                        {/* Pagination / Load More Button */}
                        {pagination.hasNextPage && (
                          <div className="pt-4 text-center">
                            <button
                              onClick={() => loadFeed(pagination.page + 1, true)}
                              disabled={loadingMore}
                              className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm ${isDark
                                  ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                                  : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                                }`}
                            >
                              {loadingMore ? 'Loading more posts...' : 'Load More Posts'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* VIEW B: USER PROFILE */}
                {activeView === 'profile' && (
                  <ProfileView
                    username={targetUsername || user?.username}
                    onBack={() => {
                      setActiveView('feed');
                      setTargetUsername(null);
                    }}
                    onNavigateToProfile={handleNavigateToProfile}
                    onHashtagClick={handleHashtagClick}
                    onOpenConversation={handleOpenConversation}
                    onStartSecretChat={(conv) => handleOpenSecretChat(conv._id)}
                  />
                )}

                {/* VIEW C: SEARCH */}
                {activeView === 'search' && (
                  <SearchView
                    onNavigateToProfile={handleNavigateToProfile}
                    onHashtagClick={handleHashtagClick}
                    onOpenConversation={handleOpenConversation}
                  />
                )}

                {/* VIEW D: NOTIFICATIONS */}
                {activeView === 'notifications' && (
                  <NotificationsView
                    onNavigate={(notification) => {
                      if (
                        (notification.type === 'MESSAGE' ||
                          notification.type === 'VIDEO_CALL' ||
                          notification.type === 'MISSED_VIDEO_CALL') &&
                        notification.relatedConversation
                      ) {
                        handleOpenConversation(notification.relatedConversation);
                      } else if (notification.type === 'FOLLOW' && notification.sender?.username) {
                        handleNavigateToProfile(notification.sender.username);
                      } else if (
                        (notification.type === 'VIDEO_CALL' ||
                          notification.type === 'MISSED_VIDEO_CALL') &&
                        notification.sender?.username
                      ) {
                        handleNavigateToProfile(notification.sender.username);
                      }
                    }}
                  />
                )}

                {/* VIEW E: EXPLORE */}
                {activeView === 'explore' && (
                  <ExploreView
                    onNavigateToProfile={handleNavigateToProfile}
                    onHashtagClick={handleHashtagClick}
                  />
                )}
              </div>

              {/* Right Sidebar */}
              <div className="hidden lg:block flex-shrink-0">
                <div className="sticky top-24">
                  <RightSidebar
                    onNavigateUser={handleNavigateToProfile}
                    onHashtagClick={handleHashtagClick}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Auth Modal (Sign In / Register / Demo) */}
      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <BottomMobileNav
        activeView={activeView}
        setActiveView={(view) => {
          if ((view === 'profile' || view === 'messages') && !isAuthenticated) {
            setShowAuthModal(true);
            return;
          }
          setActiveView(view);
          if (view === 'profile') setTargetUsername(user?.username);
        }}
        onOpenCreatePost={() => {
          if (!isAuthenticated) setShowAuthModal(true);
          else {
            setActiveView('feed');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <VideoCallProvider>
            <SocialXMain />
            <VideoCallManager />
          </VideoCallProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
