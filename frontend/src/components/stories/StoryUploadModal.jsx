import React, { useState, useRef } from 'react';
import { X, Upload, Image, Video, Globe, Users, Loader2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { storyService } from '../../services/storyService';

export default function StoryUploadModal({ isOpen, onClose, onStoryCreated }) {
  const { isDark } = useTheme();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video'
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState('public'); // 'public' | 'followers'
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile) => {
    setErrorMsg('');
    if (!selectedFile) return;

    // Validate size (30MB max)
    const maxSize = 30 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setErrorMsg('File size exceeds the 30MB limit.');
      return;
    }

    // Validate type
    const isImage = selectedFile.type.startsWith('image/');
    const isVideo = selectedFile.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setErrorMsg('Please select a valid image (JPEG, PNG, WEBP) or video (MP4, WEBM, MOV).');
      return;
    }

    setFile(selectedFile);
    setMediaType(isVideo ? 'video' : 'image');

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl('');
    setCaption('');
    setPrivacy('public');
    setErrorMsg('');
    setIsUploading(false);
  };

  const handleClose = () => {
    if (isUploading) return;
    handleReset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a photo or video for your story.');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('caption', caption.trim());
      formData.append('privacy', privacy);

      const created = await storyService.createStory(formData);
      handleReset();
      onStoryCreated(created);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Unable to upload story. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all ${
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
          <div>
            <h3 className="text-base font-bold tracking-tight">Create a Story</h3>
            <p className="text-[11px] text-stone-400">Share a moment that disappears after 24 hours</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            aria-label="Close story creation"
            className={`p-2 rounded-full transition-colors ${
              isDark ? 'hover:bg-white/10 text-stone-400 hover:text-white' : 'hover:bg-stone-100 text-stone-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Media Picker / Preview */}
          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                isDragging
                  ? 'border-amber-400 bg-amber-500/10'
                  : isDark
                  ? 'border-white/10 hover:border-amber-500/40 bg-white/[0.02]'
                  : 'border-stone-200 hover:border-amber-500/40 bg-stone-50/50'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-stone-950 shadow-lg shadow-amber-500/20">
                <Upload className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">Choose a photo or video</p>
                <p className="text-xs text-stone-400 mt-0.5">Drag & drop or click to browse</p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-stone-400 pt-1">
                <span className="flex items-center gap-1">
                  <Image className="w-3.5 h-3.5 text-amber-400" /> JPG, PNG, WEBP
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-orange-400" /> MP4, WEBM (Up to 30MB)
                </span>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[340px] border border-white/10 group">
              {mediaType === 'video' ? (
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  className="w-full max-h-[340px] object-contain rounded-2xl"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Story preview"
                  className="w-full max-h-[340px] object-contain rounded-2xl"
                />
              )}
              <button
                type="button"
                onClick={handleReset}
                disabled={isUploading}
                title="Change media"
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors shadow-lg backdrop-blur-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
            className="hidden"
          />

          {/* Caption Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-400">Story Caption (Optional)</label>
            <div className="relative">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 200))}
                placeholder="Add a moment or thoughts..."
                maxLength={200}
                disabled={isUploading}
                className={`w-full px-4 py-2.5 rounded-2xl text-xs outline-none border transition-all ${
                  isDark
                    ? 'bg-white/[0.04] border-white/10 focus:border-amber-400 text-white placeholder-stone-500'
                    : 'bg-stone-50 border-stone-200 focus:border-amber-500 text-stone-900 placeholder-stone-400'
                }`}
              />
              <span className="absolute right-3 top-2.5 text-[10px] text-stone-400">
                {caption.length}/200
              </span>
            </div>
          </div>

          {/* Privacy Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-400">Who can see this story?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrivacy('public')}
                disabled={isUploading}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                  privacy === 'public'
                    ? 'border-amber-400 bg-amber-500/10 text-amber-400'
                    : isDark
                    ? 'border-white/10 text-stone-400 hover:border-white/20'
                    : 'border-stone-200 text-stone-600 hover:border-stone-300'
                }`}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <div>
                  <p className="text-xs font-bold">Public</p>
                  <p className="text-[10px] opacity-75">Anyone on SocialX</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrivacy('followers')}
                disabled={isUploading}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                  privacy === 'followers'
                    ? 'border-amber-400 bg-amber-500/10 text-amber-400'
                    : isDark
                    ? 'border-white/10 text-stone-400 hover:border-white/20'
                    : 'border-stone-200 text-stone-600 hover:border-stone-300'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <div>
                  <p className="text-xs font-bold">Followers Only</p>
                  <p className="text-[10px] opacity-75">Only your followers</p>
                </div>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                isDark ? 'text-stone-400 hover:text-white' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || isUploading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 shadow-md shadow-amber-500/20 hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sharing Story...</span>
                </>
              ) : (
                <span>Share to Story</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
