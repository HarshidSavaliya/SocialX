import React, { useState } from 'react';
import {
  Image as ImageIcon,
  MapPin,
  Globe,
  Users,
  Smile,
  Send,
  X,
  Paperclip,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { currentUser } from '../data/mockData';

export default function CreatePostBox({ onAddPost }) {
  const { isDark } = useTheme();
  const [caption, setCaption] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [audience, setAudience] = useState('Public');
  const [location, setLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);

  const sampleAttachments = [
    {
      name: 'alps_summit_raw.jpg',
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80'
    },
    {
      name: 'cinema_lens_35mm.png',
      url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1000&q=80'
    },
    {
      name: 'kyoto_artisan_roast.jpg',
      url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80'
    }
  ];

  const handleSimulateAttachment = () => {
    // Pick random attachment
    const randomPick = sampleAttachments[Math.floor(Math.random() * sampleAttachments.length)];
    setAttachedFile(randomPick);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!caption.trim() && !attachedFile) return;

    const newPost = {
      id: `post_${Date.now()}`,
      author: {
        name: currentUser.name,
        handle: currentUser.handle,
        avatar: currentUser.avatar,
        isVerified: true
      },
      time: 'Just now',
      category: audience === 'Public' ? 'Social Discussion' : 'Friends Circle',
      caption: caption,
      taggedFriends: [],
      hashtags: caption.match(/#[a-z0-9_]+/gi) || [],
      layoutType: attachedFile ? 'single-photo' : 'text-only',
      images: attachedFile ? [attachedFile.url] : [],
      views: '1',
      likes: 0,
      hasLiked: false,
      commentsCount: 0,
      activeReaction: { emoji: '🔥', text: 'Fresh', count: 1 },
      reactions: [
        { emoji: '🔥', count: 1 },
        { emoji: '😍', count: 0 },
        { emoji: '⚡', count: 0 }
      ],
      socialProof: null,
      comments: []
    };

    onAddPost(newPost);
    setCaption('');
    setAttachedFile(null);
    setLocation('');
    setShowLocationInput(false);
  };

  return (
    <div className={`p-4 sm:p-5 rounded-3xl transition-all duration-300 ${isDark
        ? 'bg-white/[0.04] border border-white/[0.08] shadow-lg shadow-black/20'
        : 'bg-white border border-slate-200/80 shadow-xs'
      }`}>
      {/* Top row: Avatar + Textarea */}
      <div className="flex gap-3 sm:gap-4 items-start">
        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/20 flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <textarea
            rows={2}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Share something or start a thread..."
            className={`w-full bg-transparent resize-none outline-none text-sm leading-relaxed transition-colors ${isDark
                ? 'text-slate-100 placeholder-slate-500'
                : 'text-slate-900 placeholder-slate-400'
              }`}
          />

          {/* Attached file chip from Image 2 */}
          {attachedFile && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Paperclip className="w-3.5 h-3.5" />
              <span className="truncate max-w-[200px]">{attachedFile.name}</span>
              <button
                onClick={() => setAttachedFile(null)}
                className="hover:text-rose-400 ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Optional Location input */}
          {showLocationInput && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <input
                type="text"
                placeholder="Add location (e.g. Zurich, Switzerland)..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={`bg-transparent outline-none border-b border-slate-300 dark:border-white/20 pb-0.5 text-xs ${isDark ? 'text-white' : 'text-slate-800'
                  }`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls row - Combining Image 1 & 2 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3.5 border-t border-slate-100 dark:border-white/[0.06]">

        {/* Left tools */}
        <div className="flex items-center gap-1.5 sm:gap-2">

          {/* Attach Image */}
          <button
            type="button"
            onClick={handleSimulateAttachment}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${attachedFile
                ? 'bg-indigo-500/20 text-indigo-400'
                : isDark
                  ? 'hover:bg-white/[0.06] text-slate-400 hover:text-slate-200'
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
          >
            <ImageIcon className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">Photo</span>
          </button>

          {/* Location */}
          <button
            type="button"
            onClick={() => setShowLocationInput(!showLocationInput)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${showLocationInput
                ? 'bg-rose-500/20 text-rose-400'
                : isDark
                  ? 'hover:bg-white/[0.06] text-slate-400 hover:text-slate-200'
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
          >
            <MapPin className="w-4 h-4 text-rose-500" />
            <span className="hidden sm:inline">Location</span>
          </button>

          {/* Audience Dropdown */}
          <div className="relative">
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className={`text-xs font-medium px-2.5 py-1.5 rounded-full outline-none cursor-pointer appearance-none pr-6 ${isDark
                  ? 'bg-white/[0.05] text-slate-300 border border-white/10 hover:bg-white/[0.08]'
                  : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/80'
                }`}
            >
              <option value="Public">🌐 Anyone can reply</option>
              <option value="Friends">👥 Friends Only</option>
              <option value="Vault">🔒 Encrypted Circle</option>
            </select>
          </div>
        </div>

        {/* Right submit button */}
        <button
          onClick={handleSubmit}
          disabled={!caption.trim() && !attachedFile}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 shadow-sm ${(!caption.trim() && !attachedFile)
              ? 'opacity-40 cursor-not-allowed bg-slate-300 dark:bg-white/10 text-slate-500'
              : isDark
                ? 'bg-white text-slate-950 hover:bg-slate-100 hover:shadow-md'
                : 'bg-slate-900 text-white hover:bg-black hover:shadow-md'
            }`}
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>

      </div>
    </div>
  );
}
