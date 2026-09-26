import React, { useState, useEffect } from 'react';
import { X, Loader2, Hash } from 'lucide-react';
import { postService } from '../services/postService';
import { useTheme } from '../context/ThemeContext';

export default function EditPostModal({ isOpen, post, onClose, onPostUpdated }) {
  const { isDark } = useTheme();

  const [caption, setCaption] = useState(post?.caption || '');
  const [hashtags, setHashtags] = useState((post?.hashtags || []).join(' '));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (post) {
      setCaption(post.caption || '');
      setHashtags((post.hashtags || []).join(' '));
      setError(null);
    }
  }, [post]);

  if (!isOpen || !post) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!caption.trim() && !post.mediaUrl) {
      setError('Post must have either a caption or media.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await postService.editPost(post._id || post.id, {
        caption: caption.trim(),
        hashtags: hashtags.trim()
      });

      if (onPostUpdated) {
        onPostUpdated(updated);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Could not update post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg rounded-3xl overflow-hidden border shadow-2xl transition-all ${isDark ? 'bg-[#14161f] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-base">Edit Post</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
              Caption
            </label>
            <textarea
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's on your mind?..."
              className={`w-full p-3 rounded-2xl text-xs sm:text-sm bg-transparent outline-none resize-none border ${isDark
                  ? 'border-white/10 text-white placeholder-slate-500 focus:border-indigo-400'
                  : 'border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-indigo-500" />
              <span>Hashtags (space or comma separated)</span>
            </label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#travel #photography #tech"
              className={`w-full p-2.5 rounded-xl text-xs sm:text-sm bg-transparent outline-none border ${isDark
                  ? 'border-white/10 text-white placeholder-slate-500 focus:border-indigo-400'
                  : 'border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                }`}
            />
          </div>

          {post.mediaUrl && (
            <div className="rounded-xl overflow-hidden max-h-48 border border-slate-200 dark:border-white/10 relative">
              {post.mediaType === 'video' ? (
                <video src={post.mediaUrl} controls className="w-full h-44 object-cover" />
              ) : (
                <img src={post.mediaUrl} alt="Attached" className="w-full h-44 object-cover" />
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-full text-xs font-semibold ${isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
