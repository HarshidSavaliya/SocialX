import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Loader2,
  Lock,
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { storyService } from '../../services/storyService';
import { getUserAvatar } from '../../utils/avatar';
import StoryViewersModal from './StoryViewersModal';

function formatStoryTime(dateString) {
  if (!dateString) return '';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function StoryViewerModal({
  isOpen,
  onClose,
  initialUserIndex = 0,
  storyGroups = [],
  onStoryDeleted,
  onStoryViewed,
  onNavigateToProfile
}) {
  const { user: currentUser } = useAuth();

  // Active indices: which user collection & which story inside that collection
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  // Playback states
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const videoRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerStartTimeRef = useRef(null);
  const pausedProgressRef = useRef(0);
  const viewedStoriesTracker = useRef(new Set());

  // Duration for static image stories
  const IMAGE_STORY_DURATION = 5000; // 5 seconds

  // Active user group & active story
  const currentGroup = storyGroups[currentUserIndex] || null;
  const currentStories = currentGroup?.stories || [];
  const currentStory = currentStories[currentStoryIndex] || null;

  const isOwner =
    currentGroup?.isSelf ||
    (currentUser && currentStory && (currentStory.user?._id || currentGroup?.user?._id || currentGroup?.user?.id) === (currentUser._id || currentUser.id));

  const isAdmin = currentUser?.role === 'ADMIN';

  // Initialize or reset when isOpen or initialUserIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentUserIndex(Math.max(0, Math.min(initialUserIndex, storyGroups.length - 1)));
      setCurrentStoryIndex(0);
      setProgress(0);
      pausedProgressRef.current = 0;
      setIsPaused(false);
      setIsMediaLoaded(false);
    }
  }, [isOpen, initialUserIndex, storyGroups.length]);

  // Mark active story as viewed on server
  useEffect(() => {
    if (!isOpen || !currentStory || !currentStory._id) return;

    const storyId = currentStory._id.toString();
    if (!viewedStoriesTracker.current.has(storyId)) {
      viewedStoriesTracker.current.add(storyId);

      // Record view on backend if authenticated and not own story
      if (!isOwner) {
        storyService.viewStory(storyId).catch(() => {});
        if (onStoryViewed) {
          onStoryViewed(storyId, currentUserIndex);
        }
      }
    }
  }, [isOpen, currentStory, isOwner, currentUserIndex, onStoryViewed]);

  // Step to Next Story or Next User
  const handleNextStory = useCallback(() => {
    setProgress(0);
    pausedProgressRef.current = 0;
    setIsMediaLoaded(false);

    if (currentStoryIndex < currentStories.length - 1) {
      // Advance to next story in current user group
      setCurrentStoryIndex((prev) => prev + 1);
    } else if (currentUserIndex < storyGroups.length - 1) {
      // Advance to next user group
      setCurrentUserIndex((prev) => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      // Reached the end of all stories -> close viewer
      onClose();
    }
  }, [currentStoryIndex, currentStories.length, currentUserIndex, storyGroups.length, onClose]);

  // Step to Previous Story or Previous User
  const handlePrevStory = useCallback(() => {
    setProgress(0);
    pausedProgressRef.current = 0;
    setIsMediaLoaded(false);

    if (currentStoryIndex > 0) {
      // Back to previous story in current user group
      setCurrentStoryIndex((prev) => prev - 1);
    } else if (currentUserIndex > 0) {
      // Back to previous user group (last story of previous user)
      const prevUserIndex = currentUserIndex - 1;
      const prevStories = storyGroups[prevUserIndex]?.stories || [];
      setCurrentUserIndex(prevUserIndex);
      setCurrentStoryIndex(Math.max(0, prevStories.length - 1));
    }
  }, [currentStoryIndex, currentUserIndex, storyGroups]);

  // Handle Video Progress Tracking
  const handleVideoTimeUpdate = () => {
    if (videoRef.current && currentStory?.mediaType === 'video') {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      if (duration && !isNaN(duration)) {
        const pct = Math.min(100, (current / duration) * 100);
        setProgress(pct);
      }
    }
  };

  // Image Story Progress Loop
  useEffect(() => {
    if (!isOpen || !currentStory || currentStory.mediaType !== 'image' || !isMediaLoaded || isPaused) {
      return;
    }

    let start = performance.now() - (pausedProgressRef.current / 100) * IMAGE_STORY_DURATION;
    timerStartTimeRef.current = start;

    const tick = (now) => {
      const elapsed = now - start;
      const currentPct = Math.min(100, (elapsed / IMAGE_STORY_DURATION) * 100);
      setProgress(currentPct);
      pausedProgressRef.current = currentPct;

      if (currentPct >= 100) {
        handleNextStory();
      } else {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, currentStory, isMediaLoaded, isPaused, handleNextStory]);

  // Pause / Resume Video & Timer
  useEffect(() => {
    if (videoRef.current && currentStory?.mediaType === 'video') {
      if (isPaused) {
        videoRef.current.pause();
      } else if (isMediaLoaded) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, isMediaLoaded, currentStory]);

  // Tab visibility changes: pause on blur/hidden, resume on visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsPaused(true);
      } else {
        setIsPaused(false);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Keyboard navigation: ArrowLeft, ArrowRight, Space (pause), Escape (close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextStory();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevStory();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNextStory, handlePrevStory, onClose]);

  // Handle Delete Story
  const handleDeleteStory = async () => {
    if (!currentStory?._id || isDeleting) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this story?');
    if (!confirmDelete) return;

    setIsDeleting(true);
    setIsPaused(true);

    try {
      await storyService.deleteStory(currentStory._id);
      if (onStoryDeleted) {
        onStoryDeleted(currentStory._id);
      }

      // If more stories in this group, advance; otherwise next group or close
      if (currentStories.length > 1) {
        if (currentStoryIndex >= currentStories.length - 1) {
          setCurrentStoryIndex((prev) => Math.max(0, prev - 1));
        }
      } else if (storyGroups.length > 1) {
        if (currentUserIndex >= storyGroups.length - 1) {
          setCurrentUserIndex((prev) => Math.max(0, prev - 1));
          setCurrentStoryIndex(0);
        }
      } else {
        onClose();
      }
    } catch (err) {
      alert(err.message || 'Unable to delete story');
    } finally {
      setIsDeleting(false);
      setIsPaused(false);
    }
  };

  if (!isOpen || !currentStory || !currentGroup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-0 sm:p-4 select-none animate-in fade-in duration-200">
      {/* Desktop Previous User Button */}
      {currentUserIndex > 0 && (
        <button
          onClick={handlePrevStory}
          aria-label="Previous story"
          className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-20 p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all hover:scale-105 shadow-xl"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Desktop Next User Button */}
      {(currentUserIndex < storyGroups.length - 1 || currentStoryIndex < currentStories.length - 1) && (
        <button
          onClick={handleNextStory}
          aria-label="Next story"
          className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-20 p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all hover:scale-105 shadow-xl"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Story Stage Container */}
      <div
        className="relative w-full h-full sm:h-[88vh] sm:max-h-[820px] sm:max-w-md sm:rounded-3xl overflow-hidden bg-stone-950 border border-white/10 shadow-2xl flex flex-col justify-between"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Media Player */}
        <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
          {!isMediaLoaded && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-stone-950 text-amber-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-xs text-stone-400">Loading story...</span>
            </div>
          )}

          {currentStory.mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              playsInline
              autoPlay
              muted={isMuted}
              onLoadedData={() => setIsMediaLoaded(true)}
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleNextStory}
              onError={() => setIsMediaLoaded(true)}
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              onLoad={() => setIsMediaLoaded(true)}
              onError={() => setIsMediaLoaded(true)}
              className="w-full h-full object-contain"
            />
          )}

          {/* Gradients for UI readability */}
          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none z-10" />
        </div>

        {/* Tap/Click Zones (Left 35%, Right 35%, Center 30% for hold) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            handlePrevStory();
          }}
          className="absolute left-0 top-20 bottom-20 w-1/3 z-20 cursor-pointer"
          title="Previous"
        />
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleNextStory();
          }}
          className="absolute right-0 top-20 bottom-20 w-1/3 z-20 cursor-pointer"
          title="Next"
        />

        {/* Top Header: Multi-Story Progress Bars + User Info */}
        <div className="relative z-30 p-3.5 sm:p-4 space-y-3">
          {/* Segmented Progress Bars */}
          <div className="flex gap-1.5 items-center">
            {currentStories.map((s, idx) => (
              <div
                key={s._id || s.id || idx}
                className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden"
              >
                <div
                  className="h-full bg-amber-400 transition-all duration-75 ease-linear rounded-full"
                  style={{
                    width:
                      idx < currentStoryIndex
                        ? '100%'
                        : idx === currentStoryIndex
                        ? `${progress}%`
                        : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* User Details & Action Controls */}
          <div className="flex items-center justify-between">
            <div
              onClick={() => {
                if (onNavigateToProfile && currentGroup.user?.username) {
                  onClose();
                  onNavigateToProfile(currentGroup.user.username);
                }
              }}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="p-0.5 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500">
                <img
                  src={getUserAvatar(currentGroup.user)}
                  alt={currentGroup.user?.name}
                  className="w-9 h-9 rounded-full object-cover border border-black group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-white tracking-tight group-hover:text-amber-300 transition-colors">
                    {currentGroup.user?.name || currentGroup.user?.username}
                  </h4>
                  {currentStory.privacy === 'followers' && (
                    <span className="p-0.5 rounded bg-white/20 text-stone-300" title="Followers Only">
                      <Lock className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-stone-300">
                  <span>@{currentGroup.user?.username}</span>
                  <span>•</span>
                  <span>{formatStoryTime(currentStory.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Right Header Buttons */}
            <div className="flex items-center gap-1.5 z-40">
              {/* Audio toggle for video stories */}
              {currentStory.mediaType === 'video' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                  className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white transition-colors backdrop-blur-md"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}

              {/* Pause/Resume Toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused(!isPaused);
                }}
                aria-label={isPaused ? 'Resume story' : 'Pause story'}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white transition-colors backdrop-blur-md"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>

              {/* Delete Button (Owner or Admin) */}
              {(isOwner || isAdmin) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteStory();
                  }}
                  disabled={isDeleting}
                  aria-label="Delete story"
                  title="Delete this story"
                  className="p-2 rounded-full bg-black/40 hover:bg-rose-500/80 text-white/90 hover:text-white transition-colors backdrop-blur-md"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                aria-label="Close story"
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white transition-colors backdrop-blur-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Caption & Viewers Button (for owner) */}
        <div className="relative z-30 p-4 space-y-3">
          {currentStory.caption && (
            <p className="text-sm font-medium text-white drop-shadow-lg leading-snug px-1">
              {currentStory.caption}
            </p>
          )}

          {/* Owner Viewers Button */}
          {isOwner && (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused(true);
                  setShowViewersModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-md border border-white/15 transition-all shadow-md group"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>
                  {currentStory.viewersCount !== undefined
                    ? `${currentStory.viewersCount} ${
                        currentStory.viewersCount === 1 ? 'view' : 'views'
                      }`
                    : 'Viewers'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Story Viewers Modal Drawer */}
      <StoryViewersModal
        isOpen={showViewersModal}
        onClose={() => {
          setShowViewersModal(false);
          setIsPaused(false);
        }}
        storyId={currentStory?._id}
        onNavigateToProfile={onNavigateToProfile}
      />
    </div>
  );
}
