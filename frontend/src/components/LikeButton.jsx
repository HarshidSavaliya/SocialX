import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { likeService } from '../services/likeService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LikeButton({
  postId,
  initialHasLiked = false,
  initialLikesCount = 0,
  onToggle
}) {
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const [hasLiked, setHasLiked] = useState(initialHasLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleLikeToggle = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      alert('Please log in to like posts.');
      return;
    }

    if (isLoading) return;

    const previousLiked = hasLiked;
    const previousCount = likesCount;
    const nextLiked = !previousLiked;
    const nextCount = nextLiked ? previousCount + 1 : Math.max(0, previousCount - 1);

    // Optimistic UI update
    setHasLiked(nextLiked);
    setLikesCount(nextCount);
    setIsLoading(true);

    try {
      if (nextLiked) {
        const res = await likeService.likePost(postId);
        if (res && res.likesCount !== undefined) {
          setLikesCount(res.likesCount);
        }
      } else {
        const res = await likeService.unlikePost(postId);
        if (res && res.likesCount !== undefined) {
          setLikesCount(res.likesCount);
        }
      }

      if (onToggle) {
        onToggle(nextLiked, nextCount);
      }
    } catch (error) {
      // Revert optimistic UI on error
      setHasLiked(previousLiked);
      setLikesCount(previousCount);
      alert(error.message || 'Could not update like. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLikeToggle}
      disabled={isLoading}
      className={`flex items-center gap-1.5 text-xs font-semibold transition-all duration-150 select-none group ${hasLiked
          ? 'text-rose-500 scale-105'
          : isDark
            ? 'text-slate-400 hover:text-white'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      title={hasLiked ? 'Unlike' : 'Like'}
    >
      <Heart
        className={`w-4 h-4 transition-transform duration-150 group-hover:scale-115 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''
          }`}
      />
      <span>{likesCount}</span>
    </button>
  );
}
