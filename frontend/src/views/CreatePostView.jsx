import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Image as ImageIcon,
  Video,
  Hash,
  Smile,
  X,
  Loader2,
  Globe,
  CheckCircle,
  AlertCircle,
  Send,
  Plus
} from 'lucide-react';
import { postService } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getUserAvatar, handleImageError } from '../utils/avatar';

const POPULAR_HASHTAGS = [
  'technology',
  'design',
  'travel',
  'vibes',
  'photography',
  'coding',
  'art',
  'community',
  'music',
  'fitness'
];

const EMOJI_LIST = [
  '😀', '😂', '😍', '🔥', '✨', '🚀', '💯', '👏',
  '🎉', '🙌', '😎', '💡', '🌟', '❤️', '🥳', '📸',
  '💪', '☕', '🌈', '⚡', '🎯', '🏖️', '🎧', '🍕'
];

export default function CreatePostView({ onPostCreated, onCancel }) {
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('none'); // 'image' | 'video' | 'none'
  const [mediaInfo, setMediaInfo] = useState(null); // { size, name, type }

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const handleSelectFile = (file) => {
    if (!file) return;

    // Check size limit: max 50MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError('File size exceeds the 50MB maximum limit.');
      return;
    }

    const isVid = file.mimetype?.startsWith('video/') || file.type?.startsWith('video/');
    const isImg = file.mimetype?.startsWith('image/') || file.type?.startsWith('image/');

    if (!isVid && !isImg) {
      setError('Please upload a supported image (JPEG, PNG, WebP, GIF) or video (MP4, WebM, MOV).');
      return;
    }

    setError(null);
    setMediaFile(file);
    setMediaType(isVid ? 'video' : 'image');
    setMediaInfo({
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: file.type
    });

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
    setMediaInfo(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleSelectFile(file);
  };

  const handleAddHashtag = (tagToAdd) => {
    const clean = tagToAdd.replace(/^#+/, '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!clean) return;
    if (!hashtags.includes(clean)) {
      setHashtags((prev) => [...prev, clean]);
    }
    setTagInput('');
  };

  const handleRemoveHashtag = (tagToRemove) => {
    setHashtags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      handleAddHashtag(tagInput);
    }
  };

  const handleInsertEmoji = (emoji) => {
    setCaption((prev) => prev + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!isAuthenticated) {
      setError('You must be logged in to create a post.');
      return;
    }

    if (!caption.trim() && !mediaFile) {
      setError('Please add a caption or attach a photo/video before publishing.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      if (caption.trim()) formData.append('caption', caption.trim());
      if (hashtags.length > 0) {
        formData.append('hashtags', hashtags.join(','));
      }
      if (mediaFile) {
        formData.append('media', mediaFile);
      }

      const createdPost = await postService.createPost(formData);

      setSuccess(true);
      setTimeout(() => {
        if (onPostCreated) {
          onPostCreated(createdPost);
        }
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to create post. Please try again.');
      setIsSubmitting(false);
    }
  };

  const userAvatar = getUserAvatar(user);
  const charCount = caption.length;
  const MAX_CHARS = 2000;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Navigation & Breadcrumb Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onCancel}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border ${
            isDark
              ? 'bg-[#15131a] hover:bg-[#1f1c27] text-stone-300 border-white/[0.08]'
              : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200 shadow-xs'
          }`}
        >
          <ArrowLeft className="w-4 h-4 text-amber-500" />
          <span>Back to Feed</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span className="font-semibold text-stone-500">SocialX Feed</span>
          <span>/</span>
          <span className="text-amber-500 font-bold">New Post</span>
        </div>
      </div>

      {/* Main Composer Card */}
      <div
        className={`p-5 sm:p-7 rounded-3xl border transition-all ${
          isDark
            ? 'bg-[#15131a]/95 backdrop-blur-xl border-white/[0.08] shadow-2xl shadow-black/40'
            : 'bg-white border-stone-200/90 shadow-xl shadow-stone-200/50'
        }`}
      >
        {/* Header: User Profile Badge & Audience Selector */}
        <div className="flex items-center justify-between pb-5 border-b border-stone-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <img
              src={userAvatar}
              onError={(e) => handleImageError(e, user?.name)}
              alt={user?.name || 'User'}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-amber-500/40"
            />
            <div>
              <h3 className="text-sm font-black text-stone-900 dark:text-white tracking-tight">
                {user?.name || 'Creator'}
              </h3>
              <p className="text-xs text-stone-400">@{user?.username || 'user'}</p>
            </div>
          </div>

          {/* Privacy / Audience Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              isDark
                ? 'bg-white/[0.04] text-stone-300 border-white/10'
                : 'bg-stone-100 text-stone-700 border-stone-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-amber-500" />
            <span>Public Post</span>
          </div>
        </div>

        {/* Error & Success Alerts */}
        {error && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Post published successfully! Redirecting to feed...</span>
          </div>
        )}

        {/* Main Textarea */}
        <div className="mt-4 relative">
          <textarea
            ref={textareaRef}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={5}
            placeholder="What's happening? Share thoughts, news, milestones, or stories with the community..."
            className={`w-full p-4 rounded-2xl text-sm leading-relaxed outline-none transition-all resize-y min-h-[140px] ${
              isDark
                ? 'bg-white/[0.03] text-white placeholder-stone-500 border border-white/[0.08] focus:border-amber-500/50 focus:bg-white/[0.05]'
                : 'bg-stone-50 text-stone-900 placeholder-stone-400 border border-stone-200 focus:border-amber-500 focus:bg-white'
            }`}
          />

          {/* Character Counter & Emoji Trigger */}
          <div className="flex items-center justify-between mt-2 px-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-stone-400">Characters:</span>
              <span
                className={`font-bold ${
                  isOverLimit
                    ? 'text-rose-500'
                    : charCount > 1800
                    ? 'text-amber-500'
                    : 'text-stone-400'
                }`}
              >
                {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
            </div>

            {/* Quick Emoji Trigger */}
            <div className="relative" ref={emojiPickerRef}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                  showEmojiPicker
                    ? 'bg-amber-400 text-stone-950 font-bold'
                    : isDark
                    ? 'text-stone-400 hover:text-white hover:bg-white/10'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200'
                }`}
              >
                <Smile className="w-3.5 h-3.5" />
                <span>Emojis</span>
              </button>

              {/* Emoji Picker Popup */}
              {showEmojiPicker && (
                <div
                  className={`absolute right-0 bottom-8 z-30 p-3 rounded-2xl border shadow-2xl w-64 ${
                    isDark
                      ? 'bg-[#1a1724] border-white/15 shadow-black/80'
                      : 'bg-white border-stone-200 shadow-stone-400/30'
                  }`}
                >
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Quick Emojis
                  </p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleInsertEmoji(emoji)}
                        className="p-1.5 text-lg hover:scale-125 transition-transform rounded-lg hover:bg-white/10 active:scale-95"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Media Upload & Preview Zone */}
        <div className="mt-5 space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
            Media Attachment (Photo / Video)
          </label>

          {mediaPreview ? (
            /* Selected Media Preview Card */
            <div className="relative rounded-2xl overflow-hidden border border-stone-200 dark:border-white/10 bg-black/40 group">
              {mediaType === 'video' ? (
                <video
                  src={mediaPreview}
                  controls
                  className="w-full max-h-80 object-contain mx-auto"
                />
              ) : (
                <img
                  src={mediaPreview}
                  alt="Media preview"
                  className="w-full max-h-80 object-cover mx-auto"
                />
              )}

              {/* Media Overlay Badge & Clear Button */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-black/70 text-white backdrop-blur-md uppercase tracking-wider">
                  {mediaType} • {mediaInfo?.size}
                </span>
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="p-1.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
                  title="Remove media"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Drag & Drop Upload Zone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-amber-400 bg-amber-400/10 scale-[1.01]'
                  : isDark
                  ? 'border-white/10 hover:border-amber-500/40 hover:bg-white/[0.02]'
                  : 'border-stone-300 hover:border-amber-500 hover:bg-stone-50'
              }`}
              onClick={() => imageInputRef.current?.click()}
            >
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-orange-500/15 text-orange-400 flex items-center justify-center">
                  <Video className="w-6 h-6" />
                </div>
              </div>

              <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                Drag and drop your photo or video here
              </h4>
              <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                Supports high-resolution PNG, JPG, WebP, GIF, or MP4 video up to 50MB
              </p>

              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    imageInputRef.current?.click();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-all"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    videoInputRef.current?.click();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 border border-orange-500/30 transition-all"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Upload Video</span>
                </button>
              </div>
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleSelectFile(e.target.files?.[0])}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleSelectFile(e.target.files?.[0])}
          />
        </div>

        {/* Hashtags Section */}
        <div className="mt-5 space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
            Hashtags & Topics
          </label>

          {/* Active Hashtag Badges */}
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-400 border border-amber-500/30 shadow-xs"
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveHashtag(tag)}
                    className="hover:text-rose-400 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Tag Input */}
          <div
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border transition-all ${
              isDark
                ? 'bg-white/[0.03] border-white/[0.08] focus-within:border-amber-500/50'
                : 'bg-stone-50 border-stone-200 focus-within:border-amber-500'
            }`}
          >
            <Hash className="w-4 h-4 text-amber-500" />
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              placeholder="Type a hashtag and press Enter or comma (e.g. design)..."
              className="flex-1 text-xs bg-transparent outline-none text-stone-900 dark:text-white placeholder-stone-400"
            />
            {tagInput.trim() && (
              <button
                type="button"
                onClick={() => handleAddHashtag(tagInput)}
                className="p-1 rounded-lg bg-amber-400 text-stone-950 hover:brightness-110 text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Popular Tag Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] text-stone-400 font-medium">Trending:</span>
            {POPULAR_HASHTAGS.map((tag) => {
              const isSelected = hashtags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    isSelected ? handleRemoveHashtag(tag) : handleAddHashtag(tag)
                  }
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all ${
                    isSelected
                      ? 'bg-amber-400 text-stone-950 font-bold'
                      : isDark
                      ? 'bg-white/[0.04] text-stone-400 hover:text-white hover:bg-white/10'
                      : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 pt-5 border-t border-stone-100 dark:border-white/[0.06] flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
              isDark
                ? 'text-stone-400 hover:text-white hover:bg-white/5'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Cancel / Discard
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (!caption.trim() && !mediaFile) || isOverLimit}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black tracking-wide transition-all shadow-lg active:scale-95 ${
              isSubmitting || (!caption.trim() && !mediaFile) || isOverLimit
                ? 'bg-stone-300 dark:bg-white/10 text-stone-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 text-stone-950 hover:brightness-110 shadow-amber-500/25'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-stone-950 stroke-[2.5]" />
                <span>Publish Post</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
