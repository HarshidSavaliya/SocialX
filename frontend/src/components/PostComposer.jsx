import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Video,
  Hash,
  Send,
  X,
  Loader2,
  Sparkles,
  Paperclip
} from 'lucide-react';
import { postService } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function PostComposer({ onPostCreated, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [showHashtagsInput, setShowHashtagsInput] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('none');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const handleSelectFile = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50MB limit.');
      return;
    }

    setMediaFile(file);
    setMediaType(type);
    setError(null);

    // Create object URL for local preview
    const previewUrl = URL.createObjectURL(file);
    setMediaPreview(previewUrl);
  };

  const handleRemoveMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType('none');
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      if (onOpenAuth) onOpenAuth();
      else alert('Please log in to create a post.');
      return;
    }

    if (!caption.trim() && !mediaFile) {
      setError('Please provide a caption or attach media.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (caption.trim()) formData.append('caption', caption.trim());
      if (hashtags.trim()) formData.append('hashtags', hashtags.trim());
      if (mediaFile) formData.append('media', mediaFile);

      const createdPost = await postService.createPost(formData);

      // Reset state
      setCaption('');
      setHashtags('');
      setShowHashtagsInput(false);
      handleRemoveMedia();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);

      if (onPostCreated) {
        onPostCreated(createdPost);
      }
    } catch (err) {
      setError(err.message || 'Could not create post. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const userAvatar =
    user?.profileImage ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl transition-all duration-300 border ${isDark
          ? 'bg-white/[0.04] border-white/[0.08] shadow-lg shadow-black/20'
          : 'bg-white border-slate-200/80 shadow-xs'
        }`}
    >
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={(e) => handleSelectFile(e, 'image')}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={(e) => handleSelectFile(e, 'video')}
        accept="video/mp4,video/quicktime,video/webm,video/mpeg"
        className="hidden"
      />

      {/* Top area: Avatar + Input */}
      <div className="flex gap-3 sm:gap-4 items-start">
        <img
          src={userAvatar}
          alt={user?.name || 'User'}
          className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/20 flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <textarea
            rows={2}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={isUploading}
            placeholder={
              isAuthenticated
                ? `Share something on SocialX, ${user?.name ? user.name.split(' ')[0] : ''}...`
                : 'Log in to share your thoughts and media with SocialX...'
            }
            className={`w-full bg-transparent resize-none outline-none text-xs sm:text-sm leading-relaxed transition-colors ${isDark
                ? 'text-slate-100 placeholder-slate-500'
                : 'text-slate-900 placeholder-slate-400'
              }`}
          />

          {/* Optional Hashtag input row */}
          {showHashtagsInput && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-500">
              <Hash className="w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Enter hashtags (e.g. #travel #design #mern)..."
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                className={`flex-1 bg-transparent outline-none border-b pb-0.5 text-xs ${isDark ? 'border-white/20 text-white' : 'border-slate-300 text-slate-800'
                  }`}
              />
            </div>
          )}

          {/* Media Preview Card */}
          {mediaPreview && (
            <div className="mt-3 relative rounded-2xl overflow-hidden max-h-60 border border-slate-200 dark:border-white/10 group">
              {mediaType === 'video' ? (
                <video src={mediaPreview} controls className="w-full h-48 object-cover rounded-xl" />
              ) : (
                <img src={mediaPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
              )}
              <button
                type="button"
                onClick={handleRemoveMedia}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition-colors"
                title="Remove media"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error or Success banners */}
      {error && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 text-rose-500 text-xs font-semibold">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
          Post published successfully to the SocialX feed!
        </div>
      )}

      {/* Bottom controls row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mt-3.5 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Image Upload */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${mediaType === 'image'
                ? 'bg-emerald-500/20 text-emerald-400'
                : isDark
                  ? 'hover:bg-white/[0.06] text-slate-400 hover:text-slate-200'
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
          >
            <ImageIcon className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">Image</span>
          </button>

          {/* Video Upload */}
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={isUploading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${mediaType === 'video'
                ? 'bg-indigo-500/20 text-indigo-400'
                : isDark
                  ? 'hover:bg-white/[0.06] text-slate-400 hover:text-slate-200'
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
          >
            <Video className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Video</span>
          </button>

          {/* Hashtag trigger */}
          <button
            type="button"
            onClick={() => setShowHashtagsInput(!showHashtagsInput)}
            disabled={isUploading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${showHashtagsInput
                ? 'bg-purple-500/20 text-purple-400'
                : isDark
                  ? 'hover:bg-white/[0.06] text-slate-400 hover:text-slate-200'
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
          >
            <Hash className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">Hashtag</span>
          </button>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isUploading || (!caption.trim() && !mediaFile)}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 shadow-sm ${!caption.trim() && !mediaFile
              ? 'opacity-40 cursor-not-allowed bg-slate-300 dark:bg-white/10 text-slate-500'
              : isDark
                ? 'bg-white text-slate-950 hover:bg-slate-100'
                : 'bg-slate-900 text-white hover:bg-black'
            }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Publishing...</span>
            </>
          ) : (
            <>
              <span>Post</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
