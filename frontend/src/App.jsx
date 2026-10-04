import React, { useState, useEffect, lazy, Suspense } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
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
import StoriesBar from './components/StoriesBar';
import BottomMobileNav from './components/BottomMobileNav';
import VideoCallManager from './components/VideoCall/VideoCallManager';

// Views (Eager for standard social workflow, lazy for heavy administrative & isolated modules)
import ProfileView from './views/ProfileView';
import MessagingView from './views/MessagingView';
import SearchView from './views/SearchView';
import NotificationsView from './views/NotificationsView';
import ReelsView from './views/ReelsView';
import CreatePostView from './views/CreatePostView';

// Route-level code splitting (PART 26: Performance Optimization)
const AdminView = lazy(() => import('./views/AdminView'));
const SecretChatView = lazy(() => import('./views/SecretChatView'));

// API Services
import { postService } from './services/postService';
import { Sparkles, Hash, X, RefreshCw, ShieldCheck } from 'lucide-react';

function SocialXMain() {
  const { isDark } = useTheme();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { socket } = useSocket() || {};
  const [secretInviteNotification, setSecretInviteNotification] = useState(null);

  // Navigation states: 'feed' | 'profile' | 'messages' | 'search' | 'notifications' | 'reels' | 'admin' | 'create-post'
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
    if (!isAuthenticated) {
      setLoadingFeed(false);
      return;
    }
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
    if (activeView === 'feed' && isAuthenticated) {
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

  const handleNavigateToProfile = (target) => {
    let clean = '';
    if (typeof target === 'string') {
      clean = target.trim().replace(/^@+/, '');
    } else if (target && typeof target === 'object') {
      clean = (target.username || target._id || target.id || '').toString().trim().replace(/^@+/, '');
    }
    if (!clean) return;
    setTargetUsername(clean);
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

  useEffect(() => {
    if (!socket || !isAuthenticated) return;
    const handleSecretInviteReceived = (data) => {
      setSecretInviteNotification(data);
    };
    socket.on('secret:invite:received', handleSecretInviteReceived);
    return () => {
      socket.off('secret:invite:received', handleSecretInviteReceived);
    };
  }, [socket, isAuthenticated]);

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

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0c0a0f]' : 'bg-[#f7f5f2]'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center animate-pulse">
            <Sparkles className="w-6 h-6 text-amber-500" />
          </div>
          <p className="text-xs text-stone-400 font-semibold tracking-wide">Loading SocialX...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-500 font-sans relative overflow-x-hidden ${isDark ? 'bg-[#0c0a0f] text-stone-100' : 'bg-[#f7f5f2] text-stone-900'
        }`}
    >
      {/* Ambient Atmospheric Backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {isDark ? (
          <>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-transparent rounded-full blur-[140px] transform translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-amber-600/6 rounded-full blur-[130px]" />
          </>
        ) : (
          <>
            <div className="absolute top-0 right-1/4 w-[700px] h-[500px] bg-gradient-to-b from-amber-100/40 via-orange-50/30 to-transparent rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-10 w-[600px] h-[400px] bg-stone-200/50 rounded-full blur-[90px]" />
          </>
        )}
      </div>

      {/* Main Top Header */}
      <Header
        onOpenCreatePost={() => {
          if (!isAuthenticated) setShowAuthModal(true);
          else {
            setActiveView('create-post');
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
          const target = user?.username || user?._id || user?.id || 'me';
          handleNavigateToProfile(target);
        }}
        onNavigateToProfile={handleNavigateToProfile}
        onSearchHashtag={(tag) => handleHashtagClick(tag)}
        onOpenSearch={handleOpenSearch}
        onOpenNotifications={handleOpenNotifications}
        onOpenConversation={handleOpenConversation}
        onOpenAdmin={handleOpenAdmin}
        onOpenSecretChat={() => handleOpenSecretChat(null)}
      />

      {/* Main Desktop Container: Gated if not authenticated */}
      {!isAuthenticated ? (
        <div className="relative z-10 max-w-lg mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center min-h-[calc(100vh-6rem)]">
          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3 shadow-xs">
              🔒 Member Access Required
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tight">
              Sign In to SocialX
            </h1>
            <p className="text-xs text-stone-400 max-w-xs mx-auto mt-1.5 leading-relaxed">
              Sign in or create an account to view your home feed, post updates, and chat with friends.
            </p>
          </div>
          <AuthModal
            isOpen={true}
            embedded={true}
            allowClose={false}
            onClose={() => {}}
          />
        </div>
      ) : (
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
                  const target = user?.username || user?._id || user?.id || 'me';
                  handleNavigateToProfile(target);
                }}
              />
            </div>
          </div>

          {/* Full-width view for real-time messaging, Secret Chat, or Admin */}
          {activeView === 'messages' ? (
            <div className="flex-1 w-full min-w-0">
              <MessagingView
                onOpenSecretChat={() => handleOpenSecretChat(null)}
                onNavigateToProfile={handleNavigateToProfile}
              />
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
              <div className="flex-1 w-full max-w-2xl mx-auto space-y-5">
                {/* VIEW A: FEED */}
                {activeView === 'feed' && (
                  <>
                    {/* Top Stories Row (Matching Reference Design) */}
                    <StoriesBar
                      onOpenAuth={() => setShowAuthModal(true)}
                      onNavigateToProfile={handleNavigateToProfile}
                    />

                    {/* Feed Header with Sub-tabs & Hashtag filter */}
                    <div
                      className={`p-4 rounded-3xl flex flex-wrap items-center justify-between gap-3 border transition-all ${isDark
                          ? 'bg-[#15131a]/90 backdrop-blur-xl border-white/[0.08] shadow-lg shadow-black/30'
                          : 'bg-white border-stone-200/80 shadow-xs'
                        }`}
                    >
                      <div>
                        <h1 className="text-lg font-black tracking-tight text-stone-900 dark:text-white">SocialX Feed</h1>
                        <p className="text-[11px] text-stone-400">
                          {feedFilter === 'friends'
                            ? 'Posts from creators you follow'
                            : 'Connected global social stream'}
                        </p>
                      </div>

                      {/* Sub-tabs pills */}
                      <div className="flex items-center gap-1.5 p-1 rounded-full bg-stone-100 dark:bg-white/[0.04]">
                        <button
                          onClick={() => setFeedFilter('all')}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all ${feedFilter === 'all'
                              ? isDark
                                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 shadow-sm shadow-amber-500/20'
                                : 'bg-stone-900 text-white shadow-xs'
                              : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                            }`}
                        >
                          All Posts
                        </button>
                        <button
                          onClick={() => {
                            if (!isAuthenticated) setShowAuthModal(true);
                            else setFeedFilter('friends');
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all ${feedFilter === 'friends'
                              ? isDark
                                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 shadow-sm shadow-amber-500/20'
                                : 'bg-stone-900 text-white shadow-xs'
                              : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                            }`}
                        >
                          Following Only
                        </button>
                      </div>
                    </div>

                    {/* Active Hashtag Filter Chip */}
                    {activeHashtag && (
                      <div className="flex items-center justify-between px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-amber-400" />
                          <span>Filtering by {activeHashtag}</span>
                        </div>
                        <button
                          onClick={() => setActiveHashtag(null)}
                          className="hover:text-amber-200 flex items-center gap-1 text-[11px]"
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
                    username={targetUsername || user?.username || user?._id || user?.id || 'me'}
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
                      } else {
                        const target =
                          notification.sender?.username ||
                          notification.sender?._id ||
                          notification.sender?.id ||
                          notification.sender;
                        if (target) handleNavigateToProfile(target);
                      }
                    }}
                  />
                )}

                {/* VIEW E: REELS */}
                {activeView === 'reels' && (
                  <ReelsView
                    onNavigateToProfile={handleNavigateToProfile}
                    onHashtagClick={handleHashtagClick}
                    onOpenAuth={() => setShowAuthModal(true)}
                  />
                )}



                {/* VIEW F: CREATE POST */}
                {activeView === 'create-post' && (
                  <CreatePostView
                    onPostCreated={handlePostCreated}
                    onCancel={() => {
                      setActiveView('feed');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
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
      )}

      {/* Auth Modal (Sign In / Register / Demo) */}
      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}

      {/* Secret Chat Invitation Banner */}
      {secretInviteNotification && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-sm bg-gradient-to-r from-[#0d1f18] to-[#12131a] border border-emerald-500/40 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl animate-in slide-in-from-top-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-400">Secret Mode Invite</p>
            <p className="text-xs text-stone-200 truncate">
              @{secretInviteNotification.fromUser?.username || 'A friend'} invited you to Secret Chat!
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                handleOpenSecretChat(secretInviteNotification.conversationId);
                setSecretInviteNotification(null);
              }}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-xl transition-all shadow-md shadow-emerald-500/20"
            >
              Join
            </button>
            <button
              onClick={() => setSecretInviteNotification(null)}
              className="p-1 text-stone-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
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
            setActiveView('create-post');
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
