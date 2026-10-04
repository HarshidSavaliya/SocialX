import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getUserAvatar } from '../utils/avatar';
import { storyService } from '../services/storyService';
import StoryUploadModal from './stories/StoryUploadModal';
import StoryViewerModal from './stories/StoryViewerModal';

export default function StoriesBar({ onOpenAuth, onNavigateToProfile }) {
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  const [storyGroups, setStoryGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeUserIndex, setActiveUserIndex] = useState(0);

  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Fetch real stories from backend
  const fetchStories = async () => {
    if (!isAuthenticated) {
      setStoryGroups([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await storyService.getFeed();
      setStoryGroups(data || []);
    } catch (err) {
      console.warn('Could not load stories feed:', err.message);
      setStoryGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, [isAuthenticated]);

  // Check scroll bounds for desktop navigation buttons
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [storyGroups]);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const amount = direction === 'left' ? -260 : 260;
      scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  // Find own active stories group if exists
  const ownGroup = storyGroups.find((g) => g.isSelf);
  const otherGroups = storyGroups.filter((g) => !g.isSelf);

  // Handle clicking "Your Story" circle
  const handleOwnStoryClick = () => {
    if (!isAuthenticated) {
      onOpenAuth?.();
      return;
    }

    if (ownGroup && ownGroup.stories.length > 0) {
      const ownIdx = storyGroups.findIndex((g) => g.isSelf);
      setActiveUserIndex(ownIdx >= 0 ? ownIdx : 0);
      setViewerOpen(true);
    } else {
      setShowUploadModal(true);
    }
  };

  // Handle clicking another user's story circle
  const handleUserStoryClick = (group) => {
    const idx = storyGroups.findIndex(
      (g) => (g.user?._id || g.user?.id) === (group.user?._id || group.user?.id)
    );
    if (idx !== -1) {
      setActiveUserIndex(idx);
      setViewerOpen(true);
    }
  };

  const handleStoryCreated = () => {
    fetchStories();
  };

  const handleStoryDeleted = () => {
    fetchStories();
  };

  const handleStoryViewed = (storyId, userIdx) => {
    setStoryGroups((prevGroups) =>
      prevGroups.map((g, idx) => {
        if (idx !== userIdx) return g;
        const updatedStories = g.stories.map((s) =>
          s._id === storyId ? { ...s, hasViewed: true } : s
        );
        const hasUnviewed = updatedStories.some((s) => !s.hasViewed);
        return { ...g, stories: updatedStories, hasUnviewed };
      })
    );
  };

  return (
    <>
      <div
        className={`relative p-3.5 sm:p-4 rounded-3xl transition-all duration-300 border ${
          isDark
            ? 'bg-[#15131a]/85 backdrop-blur-xl border-white/[0.08] shadow-lg shadow-black/30'
            : 'bg-white border-stone-200/80 shadow-xs'
        }`}
      >
        {/* Scroll Left Button (Desktop) */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            aria-label="Scroll stories left"
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-stone-900/80 hover:bg-stone-900 text-white backdrop-blur-md shadow-lg transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Scroll Right Button (Desktop) */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            aria-label="Scroll stories right"
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-stone-900/80 hover:bg-stone-900 text-white backdrop-blur-md shadow-lg transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Stories Horizontal Tray */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex items-center gap-3.5 sm:gap-4 overflow-x-auto scrollbar-none py-1 select-none scroll-smooth"
        >
          {/* Item 1: Your Story Button */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0 group">
            <div className="relative">
              {ownGroup && ownGroup.stories.length > 0 ? (
                // Has Active Story: Vibrant Story Ring
                <div
                  onClick={handleOwnStoryClick}
                  className="p-[2.5px] rounded-full bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-600 shadow-sm shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all duration-300 group-hover:scale-105 cursor-pointer"
                >
                  <div className="p-[2px] rounded-full bg-[#15131a]">
                    <img
                      src={getUserAvatar(user)}
                      alt="Your Story"
                      className="w-13 h-13 sm:w-15 sm:h-15 rounded-full object-cover"
                    />
                  </div>
                </div>
              ) : (
                // No Active Story: Dashed circle with Add trigger
                <div
                  onClick={handleOwnStoryClick}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] transition-transform duration-300 group-hover:scale-105 border-2 border-dashed cursor-pointer ${
                    isDark ? 'border-amber-500/40 group-hover:border-amber-400' : 'border-amber-500/50'
                  }`}
                >
                  <img
                    src={getUserAvatar(user)}
                    alt="Add Story"
                    className="w-full h-full rounded-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              )}

              {/* Plus Badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isAuthenticated) onOpenAuth?.();
                  else setShowUploadModal(true);
                }}
                title="Add to story"
                aria-label="Add to story"
                className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-stone-950 flex items-center justify-center shadow-md font-bold text-xs ring-2 ring-[#15131a] hover:scale-110 transition-transform cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>

            <span
              onClick={handleOwnStoryClick}
              className={`text-[11px] font-medium tracking-tight truncate max-w-[68px] cursor-pointer ${
                isDark ? 'text-stone-300 group-hover:text-amber-400' : 'text-stone-600'
              }`}
            >
              {ownGroup && ownGroup.stories.length > 0 ? 'Your Story' : 'Add Story'}
            </span>
          </div>

          {/* Creators Stories */}
          {loading ? (
            <div className="flex items-center gap-3.5 py-2 px-2 text-stone-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Loading stories...</span>
            </div>
          ) : otherGroups.length === 0 ? null : (
            otherGroups.map((group) => {
              const hasUnviewed = group.hasUnviewed;

              return (
                <div
                  key={group.user?._id || group.user?.id}
                  onClick={() => handleUserStoryClick(group)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group"
                >
                  {/* Story Ring: Gradient if unviewed, subtle border if viewed */}
                  <div
                    className={`p-[2.5px] rounded-full transition-all duration-300 group-hover:scale-105 ${
                      hasUnviewed
                        ? 'bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 shadow-sm shadow-amber-500/25 group-hover:shadow-amber-500/50'
                        : isDark
                        ? 'p-[2px] border border-white/20 bg-transparent'
                        : 'p-[2px] border border-stone-300 bg-transparent'
                    }`}
                  >
                    <div className="p-[2px] rounded-full bg-[#15131a]">
                      <img
                        src={getUserAvatar(group.user)}
                        alt={group.user?.name}
                        className="w-13 h-13 sm:w-15 sm:h-15 rounded-full object-cover transition-transform group-hover:scale-102"
                      />
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-medium tracking-tight truncate max-w-[68px] ${
                      isDark ? 'text-stone-300 group-hover:text-amber-400' : 'text-stone-700'
                    }`}
                  >
                    {group.user?.username || group.user?.name}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Upload Story Modal */}
      <StoryUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onStoryCreated={handleStoryCreated}
      />

      {/* Story Viewer Modal */}
      <StoryViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        initialUserIndex={activeUserIndex}
        storyGroups={storyGroups}
        onStoryDeleted={handleStoryDeleted}
        onStoryViewed={handleStoryViewed}
        onNavigateToProfile={onNavigateToProfile}
      />
    </>
  );
}
