import React, { useState } from 'react';
import { X, Image as ImageIcon, MapPin, Globe, Paperclip, Send } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { currentUser } from '../data/mockData';

export default function CreatePostModal({ isOpen, onClose, onAddPost }) {
  const { isDark } = useTheme();
  const [caption, setCaption] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [audience, setAudience] = useState('Public');

  if (!isOpen) return null;

  const sampleImages = [
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80'
  ];

  const handleAttachRandom = () => {
    const pick = sampleImages[Math.floor(Math.random() * sampleImages.length)];
    setAttachedImage(pick);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!caption.trim() && !attachedImage) return;

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
      layoutType: attachedImage ? 'single-photo' : 'text-only',
      images: attachedImage ? [attachedImage] : [],
      views: '1',
      likes: 0,
      hasLiked: false,
      commentsCount: 0,
      activeReaction: { emoji: '🔥', text: 'Fresh', count: 1 },
      reactions: [
        { emoji: '🔥', count: 1 },
        { emoji: '😍', count: 0 }
      ],
      comments: []
    };

    onAddPost(newPost);
    setCaption('');
    setAttachedImage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">

      <div className={`w-full max-w-lg rounded-3xl overflow-hidden border shadow-2xl transition-all ${isDark ? 'bg-[#14161f] border-white/10' : 'bg-white border-slate-200'
        }`}>

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/[0.08] flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Create SocialX Post
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-5 space-y-4">

          <div className="flex items-center gap-3">
            <img src={currentUser.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{currentUser.name}</h4>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className={`text-[11px] font-semibold rounded-full px-2 py-0.5 outline-none cursor-pointer mt-0.5 ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}
              >
                <option value="Public">🌐 Anyone can view</option>
                <option value="Friends">👥 Friends Only</option>
              </select>
            </div>
          </div>

          <textarea
            rows={4}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's inspiring you today? Share a story, project, or thought..."
            className={`w-full bg-transparent resize-none outline-none text-sm leading-relaxed ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
          />

          {/* Attached Image Preview */}
          {attachedImage && (
            <div className="relative rounded-2xl overflow-hidden max-h-56 border border-black/10 dark:border-white/10">
              <img src={attachedImage} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setAttachedImage(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Attachment options bar */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAttachRandom}
                className={`p-2 rounded-full text-xs flex items-center gap-1.5 transition-colors ${attachedImage
                    ? 'text-indigo-400 bg-indigo-500/10'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
              >
                <ImageIcon className="w-4 h-4 text-emerald-500" />
                <span className="text-xs">Attach Media</span>
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!caption.trim() && !attachedImage}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all shadow-md ${(!caption.trim() && !attachedImage)
                  ? 'opacity-40 cursor-not-allowed bg-slate-300 dark:bg-white/10 text-slate-500'
                  : isDark
                    ? 'bg-white text-slate-950 hover:bg-slate-100'
                    : 'bg-slate-900 text-white hover:bg-black'
                }`}
            >
              Post Now
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
