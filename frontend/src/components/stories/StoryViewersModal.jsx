import React, { useState, useEffect } from 'react';
import { X, Eye, Loader2, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { storyService } from '../../services/storyService';
import { getUserAvatar } from '../../utils/avatar';

function formatViewedTime(dateString) {
  if (!dateString) return 'Just now';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function StoryViewersModal({ isOpen, onClose, storyId, onNavigateToProfile }) {
  const { isDark } = useTheme();
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !storyId) return;

    let isMounted = true;
    setLoading(true);
    setError('');

    storyService
      .getViewers(storyId)
      .then((data) => {
        if (isMounted) {
          setViewers(data?.viewers || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Unable to load viewers');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, storyId]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden max-h-[70vh] flex flex-col transition-all ${
          isDark
            ? 'bg-[#15131a] border-white/10 text-stone-100'
            : 'bg-white border-stone-200 text-stone-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 flex items-center justify-between border-b ${
            isDark ? 'border-white/10' : 'border-stone-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold tracking-tight">
              Viewers ({viewers.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close viewers list"
            className={`p-1.5 rounded-full transition-colors ${
              isDark ? 'hover:bg-white/10 text-stone-400 hover:text-white' : 'hover:bg-stone-100 text-stone-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewers List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-white/[0.04]">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-400">
              <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
              <span className="text-xs">Loading viewers...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-xs text-rose-500 px-4">
              {error}
            </div>
          ) : viewers.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-stone-400 px-4">
              <Eye className="w-8 h-8 opacity-30 text-amber-400" />
              <p className="text-xs font-semibold">No views yet</p>
              <p className="text-[11px] text-stone-500 max-w-[200px]">
                When other users view your story, they will be listed here.
              </p>
            </div>
          ) : (
            viewers.map((item) => (
              <div
                key={item.id || item._id}
                onClick={() => {
                  if (onNavigateToProfile && item.username) {
                    onClose();
                    onNavigateToProfile(item.username);
                  }
                }}
                className={`p-2.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={getUserAvatar(item)}
                    alt={item.name}
                    className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-amber-500/30"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{item.name}</p>
                    <p className="text-[10px] text-stone-400 truncate">@{item.username}</p>
                  </div>
                </div>
                <span className="text-[10px] text-stone-400 shrink-0">
                  {formatViewedTime(item.viewedAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
