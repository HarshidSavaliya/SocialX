import React, { useState, useEffect, useRef } from 'react';
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
  Send,
  Loader2,
  Bookmark,
  Sparkles,
  Command,
  Info
} from 'lucide-react';
import { postService } from '../services/postService';
import { likeService } from '../services/likeService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getUserAvatar, handleImageError } from '../utils/avatar';
import FollowButton from '../components/FollowButton';
import CommentSection from '../components/CommentSection';

// High-quality vertical video fallback reels stream
const CURATED_REELS = [
  {
    _id: 'reel_turtle',
    id: 'reel_turtle',
    caption: 'Gliding through coral reefs in crystal clear waters 🐢🌊 #ocean #wildlife #nature #vibes',
    mediaUrl: 'https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4',
    mediaType: 'video',
    author: {
      _id: '6abb5dd434c7b0523c4719aa',
      name: 'Alex Rivera',
      username: 'alexrivera',
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
    },
    likesCount: 2,
    commentsCount: 2,
    hasLiked: false,
    musicTitle: 'Deep Blue • Original Sound',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'reel_horses',
    id: 'reel_horses',
    caption: 'Majestic horses running through winter snow 🐎❄️ Serenity at its finest! #horses #winter #mountains',
    mediaUrl: 'https://res.cloudinary.com/demo/video/upload/snow_horses.mp4',
    mediaType: 'video',
    author: {
      _id: '6abb5dd434c7b0523c4719ac',
      name: 'Devon Lane',
      username: 'devonlane',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
    },
    likesCount: 2,
    commentsCount: 2,
    hasLiked: false,
    musicTitle: 'Northern Winds • Acoustic Chill',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'reel_dog',
    id: 'reel_dog',
    caption: 'Pure joy on a sunny afternoon in the park 🐶☀️ Can never get enough of this energy! #dogs #pets #happiness',
    mediaUrl: 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
    mediaType: 'video',
    author: {
      _id: '6abb5dd434c7b0523c4719ab',
      name: 'George Lobko',
      username: 'georgelobko',
      profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'
    },
    likesCount: 2,
    commentsCount: 2,
    hasLiked: false,
    musicTitle: 'Sunny Days • Upbeat Groove',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'reel_elephants',
    id: 'reel_elephants',
    caption: 'Encounter with giants during sunset safari in Serengeti 🐘🌅 #safari #wildlife #africa #travel',
    mediaUrl: 'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
    mediaType: 'video',
    author: {
      _id: '6abb5dd434c7b0523c4719ad',
      name: 'Jane Cooper',
      username: 'janecooper',
      profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80'
    },
    likesCount: 2,
    commentsCount: 2,
    hasLiked: false,
    musicTitle: 'African Horizon • Ambient Percussion',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'reel_flower',
    id: 'reel_flower',
    caption: 'Botanical blossom macro time-lapse in 4K 🌸✨ Nature is the ultimate artist! #macro #nature #flowers #art',
    mediaUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    mediaType: 'video',
    author: {
      _id: '6abb5dd434c7b0523c4719ae',
      name: 'Vitaliy Boyko',
      username: 'vitaliyboyko',
      profileImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80'
    },
    likesCount: 2,
    commentsCount: 2,
    hasLiked: false,
    musicTitle: 'Bloom • Lo-Fi Piano Meditation',
    createdAt: new Date().toISOString()
  }
];

export default function ReelsView({ onNavigateToProfile, onHashtagClick }) {
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [progress, setProgress] = useState(0);
  const [savedReels, setSavedReels] = useState(new Set());
  const [toastMessage, setToastMessage] = useState('');
  const [heartBurst, setHeartBurst] = useState(false);
  const [showShortcutsPill, setShowShortcutsPill] = useState(true);

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  const wheelThrottleRef = useRef(null);
  const touchStartY = useRef(null);

  // 1. Fetch live user video posts from DB (with reels filter) and merge/fallback with curated reels
  useEffect(() => {
    let isMounted = true;
    const loadReels = async () => {
      try {
        setLoading(true);
        // Try dedicated reels filter first
        const res = await postService.getFeed({ filter: 'reels', limit: 50 });
        const dbVideoPosts = (res.posts || []).filter(
          (p) => p.mediaType === 'video' || (p.mediaUrl && p.mediaUrl.match(/\.(mp4|webm|mov)/i))
        );

        if (isMounted) {
          if (dbVideoPosts.length > 0) {
            setReels(dbVideoPosts);
          } else {
            // Fallback to all feed posts filter
            const fallbackRes = await postService.getFeed({ page: 1, limit: 30 });
            const fallbackVideos = (fallbackRes.posts || []).filter(
              (p) => p.mediaType === 'video' || (p.mediaUrl && p.mediaUrl.match(/\.(mp4|webm|mov)/i))
            );
            setReels(fallbackVideos.length > 0 ? fallbackVideos : CURATED_REELS);
          }
        }
      } catch (err) {
        console.warn('Could not load video posts:', err.message);
        if (isMounted) {
          setReels(CURATED_REELS);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadReels();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentReel = reels[currentIndex] || CURATED_REELS[0];

  // 2. Play current video when reel index changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = isMuted;
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
    setProgress(0);
    setHeartBurst(false);
  }, [currentIndex]);

  // 3. Keep mute state in sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // 4. Keyboard arrow navigation and interactive hotkeys (Commands)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept while user is typing in comment input or textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        if (e.key === 'Escape' && showComments) {
          setShowComments(false);
        }
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
  }, [currentIndex, reels.length, showComments, currentReel, isMuted, isPlaying]);

  const handleNext = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Loop back to start
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Play / Pause toggle
  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 600);
  };

  // Single click vs Double Click / Double Tap on video
  const handleVideoClick = () => {
    if (clickTimeoutRef.current) {
      // Double click detected!
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      handleDoubleTapLike();
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        handleTogglePlay();
      }, 260);
    }
  };

  // Double tap to like with animated heart burst
  const handleDoubleTapLike = () => {
    setHeartBurst(true);
    setTimeout(() => setHeartBurst(false), 900);

    if (!currentReel?.hasLiked) {
      handleToggleLike();
    }
  };

  // Mouse wheel scroll navigation
  const handleWheel = (e) => {
    if (showComments) return; // Allow normal scrolling inside comment drawer
    if (wheelThrottleRef.current) return;

    if (e.deltaY > 35) {
      wheelThrottleRef.current = setTimeout(() => {
        wheelThrottleRef.current = null;
      }, 450);
      handleNext();
    } else if (e.deltaY < -35) {
      wheelThrottleRef.current = setTimeout(() => {
        wheelThrottleRef.current = null;
      }, 450);
      handlePrev();
    }
  };

  // Touch gesture swipe detection
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null || showComments) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;
    touchStartY.current = null;

    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const duration = videoRef.current.duration || 1;
    const current = videoRef.current.currentTime || 0;
    setProgress((current / duration) * 100);
  };

  // Like action handler with optimistic UI and resilient backend sync
  const handleToggleLike = async () => {
    if (!currentReel) return;
    const reelId = currentReel._id || currentReel.id;
    const isMock = typeof reelId === 'string' && reelId.startsWith('reel_');
    const wasLiked = Boolean(currentReel.hasLiked);
    const newLikedState = !wasLiked;
    const newCount = wasLiked
      ? Math.max(0, (currentReel.likesCount || 0) - 1)
      : (currentReel.likesCount || 0) + 1;

    // 1. Optimistic state update
    setReels((prev) =>
      prev.map((r, i) =>
        i === currentIndex
          ? {
              ...r,
              hasLiked: newLikedState,
              likesCount: newCount
            }
          : r
      )
    );

    // 2. Save in localStorage for persistent offline/guest experience
    try {
      const storedLikes = JSON.parse(localStorage.getItem('socialx_liked_reels') || '{}');
      storedLikes[reelId] = newLikedState;
      localStorage.setItem('socialx_liked_reels', JSON.stringify(storedLikes));
    } catch (e) {
      // Ignored
    }

    // 3. Sync with backend if authentic post
    if (!isMock && isAuthenticated) {
      try {
        let result;
        if (wasLiked) {
          result = await likeService.unlikePost(reelId);
        } else {
          result = await likeService.likePost(reelId);
        }

        if (result && typeof result.likesCount === 'number') {
          setReels((prev) =>
            prev.map((r, i) =>
              i === currentIndex
                ? {
                    ...r,
                    hasLiked: result.isLiked ?? result.liked ?? newLikedState,
                    likesCount: result.likesCount
                  }
                : r
            )
          );
        }
      } catch (err) {
        console.warn('Like toggle sync error:', err.message);
        // Rollback state on error
        setReels((prev) =>
          prev.map((r, i) =>
            i === currentIndex
              ? {
                  ...r,
                  hasLiked: wasLiked,
                  likesCount: wasLiked ? (r.likesCount || 0) + 1 : Math.max(0, (r.likesCount || 0) - 1)
                }
              : r
          )
        );
        showToast('Could not update like. Please try again.');
      }
    } else if (!isAuthenticated) {
      showToast(newLikedState ? 'Liked reel!' : 'Unliked');
    }
  };

  const handleToggleSave = () => {
    if (!currentReel) return;
    const id = currentReel._id || currentReel.id;
    setSavedReels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast('Removed from saved reels');
      } else {
        next.add(id);
        showToast('Saved to your collection');
      }
      return next;
    });
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.origin + '#reel-' + (currentReel?._id || ''));
      showToast('Reel link copied to clipboard!');
    }
  };

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const authorAvatar = getUserAvatar(currentReel?.author);
  const isSaved = savedReels.has(currentReel?._id || currentReel?.id);

  if (loading && reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-stone-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-xs font-bold">Loading SocialX Reels...</span>
      </div>
    );
  }

  return (
    <div
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative max-w-4xl mx-auto flex flex-col items-center select-none py-2 outline-none"
    >
      {/* Keyframe animation style for Heart Burst & Polish */}
      <style>{`
        @keyframes heartBurstAnim {
          0% { transform: scale(0.2); opacity: 0; }
          40% { transform: scale(1.35); opacity: 1; }
          75% { transform: scale(1.1); opacity: 0.95; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-heart-burst {
          animation: heartBurstAnim 0.85s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 z-50 px-4 py-2 rounded-full text-xs font-bold bg-stone-900/90 text-white border border-white/20 shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
          {toastMessage}
        </div>
      )}

      {/* Main Reels Viewport Container with Navigation */}
      <div className="flex items-center gap-4 sm:gap-6 justify-center w-full">
        {/* REEL PLAYER (Centered 9:16 Frame) */}
        <div
          ref={containerRef}
          className="relative w-full max-w-[390px] h-[calc(100vh-10rem)] min-h-[560px] max-h-[760px] rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/10 group flex items-center justify-center"
        >
          {/* Background Blurred Ambient Glow */}
          <div
            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-125"
            style={{ backgroundImage: `url(${currentReel?.mediaUrl})` }}
          />

          {/* Main Video Element */}
          <video
            ref={videoRef}
            src={currentReel?.mediaUrl}
            playsInline
            loop
            muted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onClick={handleVideoClick}
            className="relative z-10 w-full h-full object-cover cursor-pointer"
          />

          {/* Center Play / Pause Indicator Overlay */}
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

          {/* Double-tap Floating Beating Heart Animation */}
          {heartBurst && (
            <div className="absolute z-40 inset-0 flex items-center justify-center pointer-events-none">
              <div className="animate-heart-burst flex items-center justify-center">
                <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.9)]" />
              </div>
            </div>
          )}

          {/* Top Header Bar Overlay */}
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

            {/* Sound Toggle (Mute / Unmute) */}
            <button
              onClick={() => setIsMuted((prev) => !prev)}
              className="p-2 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md text-white transition-all hover:scale-105 active:scale-95"
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

              {/* Follow Button if viewing someone else */}
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
            <p className="text-xs text-stone-100 leading-relaxed line-clamp-2 drop-shadow-md pointer-events-auto">
              {currentReel?.caption}
            </p>

            {/* Audio Track Marquee / Ticker */}
            <div className="flex items-center gap-2 text-[11px] text-amber-300 font-semibold pointer-events-auto">
              <Music className="w-3 h-3 animate-bounce" />
              <span className="truncate max-w-[200px]">
                {currentReel?.musicTitle || `Original Sound • @${currentReel?.author?.username}`}
              </span>
            </div>
          </div>

          {/* Right Action Rail (Like, Comment, Share, Save) */}
          <div className="absolute right-3 bottom-16 z-30 flex flex-col items-center gap-4 text-white">
            {/* Like Action */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleToggleLike}
                className={`p-3 rounded-full backdrop-blur-md transition-all active:scale-75 hover:scale-110 shadow-lg ${
                  currentReel?.hasLiked
                    ? 'bg-rose-500 text-white ring-4 ring-rose-500/30'
                    : 'bg-black/50 hover:bg-black/75 text-white'
                }`}
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

            {/* Comment Action */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setShowComments((prev) => !prev)}
                className="p-3 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md transition-all active:scale-90 hover:scale-110 shadow-lg text-white"
                title="View & post comments (Press C)"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              <span className="text-[11px] font-black drop-shadow-md">
                {currentReel?.commentsCount || 0}
              </span>
            </div>

            {/* Bookmark / Save Action */}
            <button
              onClick={handleToggleSave}
              className={`p-3 rounded-full backdrop-blur-md transition-all active:scale-90 hover:scale-110 shadow-lg ${
                isSaved
                  ? 'bg-amber-400 text-stone-950'
                  : 'bg-black/50 hover:bg-black/75 text-white'
              }`}
              title="Save reel"
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>

            {/* Share Action */}
            <button
              onClick={handleShare}
              className="p-3 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md transition-all active:scale-90 hover:scale-110 shadow-lg text-white"
              title="Share reel"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* Spinning Vinyl Audio Disc */}
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

          {/* Bottom Progress Bar */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20 z-30">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Desktop Up / Down Controls */}
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
            title="Previous reel (ArrowUp / PageUp)"
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          <button
            onClick={handleNext}
            className={`p-3 rounded-full transition-all border shadow-lg ${
              isDark
                ? 'bg-[#15131a] hover:bg-amber-500 text-white hover:text-stone-950 border-white/10'
                : 'bg-white hover:bg-amber-400 text-stone-900 border-stone-200'
            }`}
            title="Next reel (ArrowDown / PageDown)"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Helpful Interactive Reel Commands Chip / Pill */}
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
          <span><kbd className="px-1 py-0.5 rounded bg-white dark:bg-white/10 border border-stone-300 dark:border-white/10 font-mono text-[10px]">Space</kbd> Pause</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 rounded bg-white dark:bg-white/10 border border-stone-300 dark:border-white/10 font-mono text-[10px]">M</kbd> Mute</span>
          <button
            onClick={() => setShowShortcutsPill(false)}
            className="ml-1 p-0.5 hover:text-stone-800 dark:hover:text-white"
            title="Hide shortcuts"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Interactive Comments Drawer / Modal */}
      {showComments && (
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
            {/* Drawer Header */}
            <div className="p-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold">
                  Comments ({currentReel?.commentsCount || 0})
                </h3>
              </div>
              <button
                onClick={() => setShowComments(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List & Posting Input */}
            <div className="flex-1 overflow-y-auto p-4">
              <CommentSection
                postId={currentReel?._id || currentReel?.id}
                postOwnerId={currentReel?.author?._id || currentReel?.author?.id}
                onNavigateToProfile={onNavigateToProfile}
                onCommentCountChange={(count) => {
                  setReels((prev) =>
                    prev.map((r, i) =>
                      i === currentIndex ? { ...r, commentsCount: count } : r
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
