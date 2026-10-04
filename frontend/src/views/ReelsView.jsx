import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clapperboard,
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  Music,
  X,
  Loader2,
  Bookmark,
  Sparkles,
  Command,
  AlertCircle,
  RefreshCw,
  Film
} from 'lucide-react';
import { postService } from '../services/postService';
import { likeService } from '../services/likeService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getUserAvatar, handleImageError } from '../utils/avatar';
import FollowButton from '../components/FollowButton';
import CommentSection from '../components/CommentSection';

export default function ReelsView({ onNavigateToProfile, onHashtagClick, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  // Reels feed state
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [videoPlaybackError, setVideoPlaybackError] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Playback & UI states
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [heartBurst, setHeartBurst] = useState(false);
  const [showShortcutsPill, setShowShortcutsPill] = useState(true);

  // Refs
  const videoRef = useRef(null);
  const progressBarRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  const wheelThrottleRef = useRef(null);
  const touchStartY = useRef(null);
  const isLikingRef = useRef(false);

  // View tracking: ensure each reel is only tracked once per session after 2s watch time
  const viewedReelsRef = useRef(new Set());
  const viewTimerRef = useRef(null);

  const showToast = useCallback((text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(''), 2500);
  }, []);

  // 1. Initial Load from Backend (Real database only, NO fake fallback)
  const loadInitialReels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setVideoPlaybackError(false);

      const res = await postService.getFeed({
        filter: 'reels',
        limit: 8
      });

      const videoPosts = res.items || res.posts || [];
      setReels(videoPosts);
      setNextCursor(res.nextCursor || null);
      setHasMore(Boolean(res.hasMore));
      setCurrentIndex(0);
    } catch (err) {
      console.error('Reels load error:', err);
      setError(err.message || 'Unable to load reels. Please check your connection.');
      setReels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialReels();
  }, [loadInitialReels]);

  // 2. Load next page using cursor pagination
  const loadMoreReels = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor) return;

    try {
      setLoadingMore(true);
      const res = await postService.getFeed({
        filter: 'reels',
        limit: 8,
        cursor: nextCursor
      });

      const newPosts = res.items || res.posts || [];
      if (newPosts.length > 0) {
        setReels((prev) => {
          const existingIds = new Set(prev.map((r) => (r._id || r.id).toString()));
          const filtered = newPosts.filter((p) => !existingIds.has((p._id || p.id).toString()));
          return [...prev, ...filtered];
        });
        setNextCursor(res.nextCursor || null);
        setHasMore(Boolean(res.hasMore));
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.warn('Load more reels error:', err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextCursor]);

  const currentReel = reels[currentIndex] || null;

  // 3. Navigation Handlers
  const handleNext = useCallback(() => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (hasMore && !loadingMore && nextCursor) {
      // Near end of current page: fetch more
      loadMoreReels();
    }
  }, [currentIndex, reels.length, hasMore, loadingMore, nextCursor, loadMoreReels]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Pre-fetch next page when approaching end of current reel list
  useEffect(() => {
    if (reels.length > 0 && currentIndex >= reels.length - 3 && hasMore && !loadingMore && nextCursor) {
      loadMoreReels();
    }
  }, [currentIndex, reels.length, hasMore, loadingMore, nextCursor, loadMoreReels]);

  // 4. Video Playback Lifecycle: Update source, reset, and autoplay when currentIndex changes
  useEffect(() => {
    setVideoPlaybackError(false);
    if (progressBarRef.current) {
      progressBarRef.current.style.width = '0%';
    }
    setHeartBurst(false);

    if (viewTimerRef.current) {
      clearTimeout(viewTimerRef.current);
      viewTimerRef.current = null;
    }

    if (videoRef.current && currentReel?.mediaUrl) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = isMuted;

      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            // Autoplay rejected (e.g. browser policy)
            setIsPlaying(false);
          });
      }
    } else {
      setIsPlaying(false);
    }

    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
    };
  }, [currentIndex, currentReel?._id, currentReel?.mediaUrl, isMuted]);

  // Sync mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // 5. Controlled View Count Tracking (Threshold: >= 2 seconds watched)
  const handleVideoPlay = () => {
    setIsPlaying(true);
    const reelId = currentReel?._id || currentReel?.id;
    if (reelId && !viewedReelsRef.current.has(reelId.toString())) {
      if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
      viewTimerRef.current = setTimeout(() => {
        viewedReelsRef.current.add(reelId.toString());
        postService.recordView(reelId);
      }, 2000); // 2 second engagement threshold
    }
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    if (viewTimerRef.current) {
      clearTimeout(viewTimerRef.current);
      viewTimerRef.current = null;
    }
  };

  const handleVideoError = () => {
    setVideoPlaybackError(true);
    setIsPlaying(false);
  };

  // Play / Pause toggle
  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 500);
  };

  // Distinguish Single Click (Play/Pause) vs Double Click (Like)
  const handleVideoClick = () => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      handleDoubleTapLike();
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        handleTogglePlay();
      }, 250);
    }
  };

  // 6. Optimistic Like Handling (Scoped by reelId, no localStorage pollution)
  const handleToggleLike = async () => {
    if (!currentReel) return;
    const reelId = currentReel._id || currentReel.id;

    if (!isAuthenticated) {
      showToast('Please log in to like reels.');
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (isLikingRef.current) return;
    isLikingRef.current = true;

    const wasLiked = Boolean(currentReel.hasLiked);
    const newLikedState = !wasLiked;
    const originalCount = currentReel.likesCount || 0;
    const newCount = wasLiked ? Math.max(0, originalCount - 1) : originalCount + 1;

    // 1. Optimistic UI update by exact reelId
    setReels((prev) =>
      prev.map((r) =>
        (r._id || r.id) === reelId
          ? { ...r, hasLiked: newLikedState, likesCount: newCount }
          : r
      )
    );

    try {
      const result = wasLiked
        ? await likeService.unlikePost(reelId)
        : await likeService.likePost(reelId);

      if (result && typeof result.likesCount === 'number') {
        setReels((prev) =>
          prev.map((r) =>
            (r._id || r.id) === reelId
              ? { ...r, hasLiked: result.isLiked ?? newLikedState, likesCount: result.likesCount }
              : r
          )
        );
      }
    } catch (err) {
      console.warn('Like toggle sync error:', err.message);
      // Rollback on failure
      setReels((prev) =>
        prev.map((r) =>
          (r._id || r.id) === reelId
            ? { ...r, hasLiked: wasLiked, likesCount: originalCount }
            : r
        )
      );
      showToast('Could not update like. Please try again.');
    } finally {
      isLikingRef.current = false;
    }
  };

  const handleDoubleTapLike = () => {
    setHeartBurst(true);
    setTimeout(() => setHeartBurst(false), 800);
    if (!currentReel?.hasLiked) {
      handleToggleLike();
    }
  };

  // 7. Real Bookmark / Save Handler
  const handleToggleSave = async () => {
    if (!currentReel) return;
    const reelId = currentReel._id || currentReel.id;

    if (!isAuthenticated) {
      showToast('Please log in to save reels.');
      if (onOpenAuth) onOpenAuth();
      return;
    }

    const wasSaved = Boolean(currentReel.isSaved);
    const newSaved = !wasSaved;

    // Optimistic update
    setReels((prev) =>
      prev.map((r) => ((r._id || r.id) === reelId ? { ...r, isSaved: newSaved } : r))
    );

    try {
      if (wasSaved) {
        await postService.unsavePost(reelId);
        showToast('Removed from saved collection');
      } else {
        await postService.savePost(reelId);
        showToast('Saved to your collection');
      }
    } catch (err) {
      // Rollback
      setReels((prev) =>
        prev.map((r) => ((r._id || r.id) === reelId ? { ...r, isSaved: wasSaved } : r))
      );
      showToast('Could not update save state.');
    }
  };

  // Share handler
  const handleShare = () => {
    if (!currentReel) return;
    const reelId = currentReel._id || currentReel.id;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/#reel-${reelId}`);
      showToast('Reel link copied to clipboard!');
    }
  };

  // 8. Progress Bar Direct DOM Update (Zero React Rerenders on timeupdate)
  const handleTimeUpdate = () => {
    if (!videoRef.current || !progressBarRef.current) return;
    const duration = videoRef.current.duration || 1;
    const current = videoRef.current.currentTime || 0;
    const percentage = Math.min(100, Math.max(0, (current / duration) * 100));
    progressBarRef.current.style.width = `${percentage}%`;
  };

  // 9. Wheel Scroll Navigation with Throttling
  const handleWheel = (e) => {
    if (showComments || wheelThrottleRef.current) return;

    if (e.deltaY > 35) {
      wheelThrottleRef.current = setTimeout(() => {
        wheelThrottleRef.current = null;
      }, 400);
      handleNext();
    } else if (e.deltaY < -35) {
      wheelThrottleRef.current = setTimeout(() => {
        wheelThrottleRef.current = null;
      }, 400);
      handlePrev();
    }
  };

  // 10. Touch Swipe Gesture Detection
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null || showComments) return;
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    touchStartY.current = null;

    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
  };

  // 11. Keyboard Accessible Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        if (e.key === 'Escape' && showComments) setShowComments(false);
        return;
      }

      if (e.key === 'Escape' && showComments) {
        e.preventDefault();
        setShowComments(false);
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleToggleLike();
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setShowComments((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, showComments]);

  // Loading skeleton
  if (loading && reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[560px] text-stone-400 gap-3 animate-in fade-in duration-300">
        <Loader2 className="w-9 h-9 animate-spin text-amber-500" />
        <span className="text-xs font-bold tracking-wide">Loading SocialX Reels...</span>
      </div>
    );
  }

  // Error State with Retry
  if (error && reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[520px] text-center p-6 space-y-4 max-w-sm mx-auto animate-in fade-in duration-300">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-stone-900 dark:text-white">Unable to load reels</h3>
          <p className="text-xs text-stone-400 mt-1">{error}</p>
        </div>
        <button
          onClick={loadInitialReels}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-all shadow-md active:scale-95"
          aria-label="Retry loading reels"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  // Empty State: No reels found in database
  if (!loading && reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[520px] text-center p-6 space-y-4 max-w-md mx-auto animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
          <Film className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-black text-stone-900 dark:text-white">No reels yet</h3>
          <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">
            Create your first reel and share it with the SocialX community.
          </p>
        </div>
        <button
          onClick={loadInitialReels}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-700 dark:text-white transition-all"
          aria-label="Refresh reels"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Feed</span>
        </button>
      </div>
    );
  }

  const authorAvatar = getUserAvatar(currentReel?.author);
  const isSaved = Boolean(currentReel?.isSaved);
  const isLastReel = currentIndex === reels.length - 1 && !hasMore;

  return (
    <div
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative max-w-4xl mx-auto flex flex-col items-center select-none py-2 outline-none"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 z-50 px-4 py-2 rounded-full text-xs font-bold bg-stone-900/90 text-white border border-white/20 shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
          {toastMessage}
        </div>
      )}

      {/* Main Reels Viewport Container with Navigation Controls */}
      <div className="flex items-center gap-4 sm:gap-6 justify-center w-full">
        {/* Centered 9:16 Frame */}
        <div className="relative w-full max-w-[390px] h-[calc(100vh-10rem)] min-h-[560px] max-h-[760px] rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/10 group flex items-center justify-center">

          {/* Single Active Video Element */}
          {currentReel?.mediaUrl && !videoPlaybackError ? (
            <video
              ref={videoRef}
              src={currentReel.mediaUrl}
              poster={currentReel.thumbnailUrl || undefined}
              playsInline
              preload="metadata"
              muted={isMuted}
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              onEnded={handleNext}
              onError={handleVideoError}
              onTimeUpdate={handleTimeUpdate}
              onClick={handleVideoClick}
              className="relative z-10 w-full h-full object-cover cursor-pointer"
            />
          ) : (
            <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <p className="text-xs font-bold text-stone-300">Video playback unavailable</p>
              <button
                onClick={() => {
                  setVideoPlaybackError(false);
                  if (videoRef.current) {
                    videoRef.current.load();
                    videoRef.current.play().catch(() => {});
                  }
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition-all"
                aria-label="Retry video"
              >
                Retry Playback
              </button>
            </div>
          )}

          {/* Center Play / Pause Indicator */}
          {showPlayIcon && (
            <div className="absolute z-30 inset-0 flex items-center justify-center pointer-events-none animate-in zoom-in-75 fade-in duration-150">
              <div className="w-16 h-16 rounded-full bg-black/60 text-white backdrop-blur-md flex items-center justify-center shadow-xl">
                {isPlaying ? (
                  <Play className="w-8 h-8 fill-white ml-1" />
                ) : (
                  <Pause className="w-8 h-8 fill-white" />
                )}
              </div>
            </div>
          )}

          {/* Double-tap Beating Heart Animation */}
          {heartBurst && (
            <div className="absolute z-40 inset-0 flex items-center justify-center pointer-events-none animate-in zoom-in-50 duration-200">
              <Heart className="w-24 h-24 text-rose-500 fill-rose-500 animate-bounce drop-shadow-[0_0_30px_rgba(244,63,94,0.9)]" />
            </div>
          )}

          {/* Top Header Overlay */}
          <div className="absolute top-0 inset-x-0 z-20 p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Clapperboard className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-black tracking-tight drop-shadow-md">
                Reels
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 uppercase tracking-wider ml-1">
                {currentIndex + 1} / {reels.length}
              </span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => setIsMuted((prev) => !prev)}
              className="p-2 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md text-white transition-all hover:scale-105 active:scale-95"
              aria-label={isMuted ? 'Unmute reel' : 'Mute reel'}
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>
          </div>

          {/* Bottom Left Creator & Caption Overlay */}
          <div className="absolute bottom-0 inset-x-0 z-20 p-4 pb-5 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white space-y-2.5 pr-16 pointer-events-none">
            {/* Creator Badge & Follow */}
            <div className="flex items-center gap-2.5 pointer-events-auto">
              <div
                onClick={() => {
                  const target =
                    currentReel?.author?.username ||
                    currentReel?.author?._id ||
                    currentReel?.author?.id;
                  if (target && onNavigateToProfile) onNavigateToProfile(target);
                }}
                className="flex items-center gap-2 cursor-pointer group/author"
              >
                <img
                  src={authorAvatar}
                  onError={(e) => handleImageError(e, currentReel?.author?.name)}
                  alt={currentReel?.author?.name || 'User'}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-400"
                />
                <div>
                  <h4 className="text-xs font-bold group-hover/author:underline flex items-center gap-1 drop-shadow-md">
                    <span>{currentReel?.author?.name}</span>
                    <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
                  </h4>
                  <p className="text-[10px] text-stone-300">
                    @{currentReel?.author?.username}
                  </p>
                </div>
              </div>

              {/* Follow Button */}
              {user && (user.id || user._id) !== (currentReel?.author?._id || currentReel?.author?.id) && (
                <FollowButton
                  userId={currentReel?.author?._id || currentReel?.author?.id}
                  initialFollowing={false}
                  size="sm"
                  className="ml-2 scale-90"
                />
              )}
            </div>

            {/* Reel Caption */}
            {currentReel?.caption && (
              <p className="text-xs text-stone-100 leading-relaxed line-clamp-2 drop-shadow-md pointer-events-auto">
                {currentReel.caption}
              </p>
            )}

            {/* Audio Track Ticker */}
            <div className="flex items-center gap-2 text-[11px] text-amber-300 font-semibold pointer-events-auto">
              <Music className="w-3 h-3 animate-bounce" />
              <span className="truncate max-w-[200px]">
                Original Sound • @{currentReel?.author?.username || 'SocialX'}
              </span>
            </div>
          </div>

          {/* Right Action Rail (Like, Comment, Save, Share) */}
          <div className="absolute right-3 bottom-16 z-30 flex flex-col items-center gap-4 text-white">
            {/* Like */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleToggleLike}
                className={`p-3 rounded-full backdrop-blur-md transition-all active:scale-75 hover:scale-110 shadow-lg ${
                  currentReel?.hasLiked
                    ? 'bg-rose-500 text-white ring-4 ring-rose-500/30'
                    : 'bg-black/50 hover:bg-black/75 text-white'
                }`}
                aria-label={currentReel?.hasLiked ? 'Unlike reel' : 'Like reel'}
                title="Like reel (Press L or double-click)"
              >
                <Heart
                  className={`w-5 h-5 transition-transform ${
                    currentReel?.hasLiked ? 'fill-white stroke-white scale-110' : ''
                  }`}
                />
              </button>
              <span className="text-[11px] font-black drop-shadow-md">
                {currentReel?.likesCount || 0}
              </span>
            </div>

            {/* Comments */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setShowComments((prev) => !prev)}
                className="p-3 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md transition-all active:scale-90 hover:scale-110 shadow-lg text-white"
                aria-label="Open comments"
                title="View & post comments (Press C)"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              <span className="text-[11px] font-black drop-shadow-md">
                {currentReel?.commentsCount || 0}
              </span>
            </div>

            {/* Bookmark / Save */}
            <button
              onClick={handleToggleSave}
              className={`p-3 rounded-full backdrop-blur-md transition-all active:scale-90 hover:scale-110 shadow-lg ${
                isSaved
                  ? 'bg-amber-400 text-stone-950'
                  : 'bg-black/50 hover:bg-black/75 text-white'
              }`}
              aria-label={isSaved ? 'Remove bookmark' : 'Bookmark reel'}
              title="Bookmark reel"
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="p-3 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md transition-all active:scale-90 hover:scale-110 shadow-lg text-white"
              aria-label="Share reel"
              title="Share reel"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* Spinning Audio Disc */}
            <div
              className={`w-9 h-9 rounded-full border-2 border-white/40 bg-stone-900 overflow-hidden shadow-xl p-1 flex items-center justify-center ${
                isPlaying ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '4s' }}
            >
              <img
                src={authorAvatar}
                alt="Audio cover"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </div>

          {/* Bottom Progress Bar: Direct DOM Ref update */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20 z-30">
            <div
              ref={progressBarRef}
              className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 transition-all duration-75"
              style={{ width: '0%' }}
            />
          </div>

          {/* End of Feed Overlay if on last reel */}
          {isLastReel && (
            <div className="absolute bottom-3 left-4 right-16 z-30 pointer-events-none">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-900/80 text-amber-400 border border-amber-400/20">
                You've reached the end of reels
              </span>
            </div>
          )}
        </div>

        {/* Desktop Up / Down Navigation Buttons */}
        <div className="hidden sm:flex flex-col gap-3">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`p-3 rounded-full transition-all border shadow-lg ${
              currentIndex === 0
                ? 'opacity-30 cursor-not-allowed bg-stone-200 dark:bg-white/5 border-transparent text-stone-400'
                : isDark
                ? 'bg-[#15131a] hover:bg-amber-500 text-white hover:text-stone-950 border-white/10'
                : 'bg-white hover:bg-amber-400 text-stone-900 border-stone-200'
            }`}
            aria-label="Previous reel"
            title="Previous reel (ArrowUp / PageUp)"
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          <button
            onClick={handleNext}
            disabled={isLastReel}
            className={`p-3 rounded-full transition-all border shadow-lg ${
              isLastReel
                ? 'opacity-30 cursor-not-allowed bg-stone-200 dark:bg-white/5 border-transparent text-stone-400'
                : isDark
                ? 'bg-[#15131a] hover:bg-amber-500 text-white hover:text-stone-950 border-white/10'
                : 'bg-white hover:bg-amber-400 text-stone-900 border-stone-200'
            }`}
            aria-label="Next reel"
            title="Next reel (ArrowDown / PageDown)"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Interactive Commands Hint Pill */}
      {showShortcutsPill && (
        <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-stone-500 dark:text-stone-400 shadow-sm animate-in fade-in duration-300">
          <Command className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Commands:</span>
          <span><kbd className="px-1 py-0.5 rounded bg-white dark:bg-white/10 border border-stone-300 dark:border-white/10 font-mono text-[10px]">L</kbd> Like</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 rounded bg-white dark:bg-white/10 border border-stone-300 dark:border-white/10 font-mono text-[10px]">C</kbd> Comments</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 rounded bg-white dark:bg-white/10 border border-stone-300 dark:border-white/10 font-mono text-[10px]">↑/↓</kbd> Scroll</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 rounded bg-white dark:bg-white/10 border border-stone-300 dark:border-white/10 font-mono text-[10px]">Space</kbd> Play/Pause</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 rounded bg-white dark:bg-white/10 border border-stone-300 dark:border-white/10 font-mono text-[10px]">M</kbd> Mute</span>
          <button
            onClick={() => setShowShortcutsPill(false)}
            className="ml-1 p-0.5 hover:text-stone-800 dark:hover:text-white"
            aria-label="Hide shortcuts"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Lazy Loaded Comments Drawer / Modal */}
      {showComments && currentReel && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowComments(false);
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            className={`w-full max-w-md h-[70vh] sm:h-[520px] rounded-t-3xl sm:rounded-3xl border flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200 ${
              isDark
                ? 'bg-[#14161f] border-white/10 text-white'
                : 'bg-white border-stone-200 text-stone-900'
            }`}
          >
            {/* Header */}
            <div className="p-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold">
                  Comments ({currentReel.commentsCount || 0})
                </h3>
              </div>
              <button
                onClick={() => setShowComments(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
                aria-label="Close comments"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List & Interactive Input */}
            <div className="flex-1 overflow-y-auto p-4">
              <CommentSection
                postId={currentReel._id || currentReel.id}
                postOwnerId={currentReel.author?._id || currentReel.author?.id}
                onNavigateToProfile={onNavigateToProfile}
                onCommentCountChange={(count) => {
                  setReels((prev) =>
                    prev.map((r) =>
                      (r._id || r.id) === (currentReel._id || currentReel.id)
                        ? { ...r, commentsCount: count }
                        : r
                    )
                  );
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
