import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { shareService } from '../services/shareService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ShareButton({ postId, initialSharesCount = 0, onShareSuccess }) {
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const [sharesCount, setSharesCount] = useState(initialSharesCount);
  const [isSharing, setIsSharing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleShare = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      alert('Please log in to share posts.');
      return;
    }

    if (isSharing) return;

    setIsSharing(true);
    try {
      const res = await shareService.sharePost(postId);
      const newCount = res.sharesCount !== undefined ? res.sharesCount : sharesCount + 1;
      setSharesCount(newCount);
      setShowFeedback(true);

      if (onShareSuccess) {
        onShareSuccess(newCount);
      }

      setTimeout(() => setShowFeedback(false), 2500);
    } catch (error) {
      alert(error.message || 'Could not share post. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        disabled={isSharing}
        className={`flex items-center gap-1.5 text-xs font-semibold transition-all duration-150 select-none group ${isDark
            ? 'text-slate-400 hover:text-white'
            : 'text-slate-600 hover:text-slate-900'
          } ${isSharing ? 'opacity-60 cursor-not-allowed' : ''}`}
        title="Share Post"
      >
        <Share2 className="w-4 h-4 transition-transform duration-150 group-hover:scale-115 text-indigo-400" />
        <span className="hidden sm:inline">Share</span>
        {sharesCount > 0 && <span className="opacity-80">({sharesCount})</span>}
      </button>

      {showFeedback && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-lg flex items-center gap-1 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 z-30">
          <Check className="w-3 h-3" />
          <span>Shared to network!</span>
        </div>
      )}
    </div>
  );
}
