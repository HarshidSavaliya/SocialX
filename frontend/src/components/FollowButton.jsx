import React, { useState } from 'react';
import { Check, UserPlus } from 'lucide-react';
import { followService } from '../services/followService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function FollowButton({
  userId,
  initialFollowing = false,
  onToggle,
  size = 'md',
  className = ''
}) {
  const { isAuthenticated, user } = useAuth();
  const { isDark } = useTheme();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);

  // Don't show follow button for oneself
  if (user && user.id === userId) {
    return null;
  }

  const handleFollowToggle = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      alert('Please log in to follow creators.');
      return;
    }

    if (isLoading) return;

    const previousState = isFollowing;
    setIsLoading(true);

    // Optimistic UI update
    setIsFollowing(!previousState);

    try {
      if (previousState) {
        await followService.unfollowUser(userId);
      } else {
        await followService.followUser(userId);
      }

      if (onToggle) {
        onToggle(!previousState);
      }
    } catch (error) {
      // Revert optimistic state on failure
      setIsFollowing(previousState);
      alert(error.message || 'Could not update follow status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-3 py-1 text-[11px]'
      : size === 'lg'
        ? 'px-6 py-2 text-sm'
        : 'px-3.5 py-1.5 text-xs';

  return (
    <button
      onClick={handleFollowToggle}
      disabled={isLoading}
      className={`rounded-full font-bold transition-all duration-200 flex items-center justify-center gap-1.5 select-none ${sizeClasses} ${isFollowing
          ? isDark
            ? 'bg-white/10 hover:bg-rose-500/20 text-stone-200 hover:text-rose-400 border border-white/15 hover:border-rose-500/30'
            : 'bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-600 border border-stone-200 hover:border-rose-200'
          : isDark
            ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 font-extrabold hover:brightness-110 shadow-xs'
            : 'bg-stone-900 text-white hover:bg-black shadow-xs'
        } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
    >
      {isLoading ? (
        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : isFollowing ? (
        <>
          <Check className="w-3 h-3 text-emerald-500" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="w-3 h-3" />
          <span>Follow</span>
        </>
      )}
    </button>
  );
}
