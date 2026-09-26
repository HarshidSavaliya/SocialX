import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Heart, Flame, Smile, Pause, Play } from 'lucide-react';
import { initialStories } from '../data/mockData';

export default function StoryViewerModal({ story, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = initialStories.findIndex(s => s.id === story?.id);
    return idx !== -1 ? idx : 0;
  });
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);

  const activeStory = initialStories[currentIndex] || story;

  // Auto-progress timer
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < initialStories.length - 1) {
            setCurrentIndex(i => i + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2; // 50 ticks * 100ms = 5 seconds
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, onClose]);

  // Reset progress when index changes
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < initialStories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplySent(true);
    setReplyText('');
    setTimeout(() => setReplySent(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-20"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Navigation Arrow Left */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrev}
          className="hidden md:flex absolute left-8 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all z-20"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Navigation Arrow Right */}
      <button
        onClick={handleNext}
        className="hidden md:flex absolute right-8 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all z-20"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Story Stage Container */}
      <div
        className="relative w-full max-w-sm sm:max-w-md h-[90vh] max-h-[780px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between border border-white/15"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >

        {/* Background Image */}
        <img
          src={activeStory.media}
          alt={activeStory.caption}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />

        {/* Top Controls & Segmented Progress Bars */}
        <div className="relative z-10 p-4">
          <div className="flex gap-1.5 mb-3">
            {initialStories.map((s, idx) => (
              <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                  style={{
                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={activeStory.author.avatar}
                alt={activeStory.author.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-400"
              />
              <div>
                <h4 className="text-xs font-bold text-white leading-tight">
                  {activeStory.author.name}
                </h4>
                <p className="text-[10px] text-white/70">
                  {activeStory.time}
                </p>
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); setIsPaused(!isPaused); }}
              className="p-1.5 rounded-full bg-black/40 text-white/80 hover:text-white"
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Bottom Story Reply Bar & Quick Emojis */}
        <div className="relative z-10 p-4 space-y-3">
          {/* Caption */}
          {activeStory.caption && (
            <p className="text-xs sm:text-sm font-medium text-white drop-shadow-md bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              {activeStory.caption}
            </p>
          )}

          {/* Quick Emoji Reaction Pill */}
          <div className="flex items-center justify-center gap-3 py-1">
            {['🔥', '❤️', '👏', '😍', '🙌'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setReplySent(true);
                  setTimeout(() => setReplySent(false), 2000);
                }}
                className="text-xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Message Reply Form */}
          <form onSubmit={handleSendReply} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Reply to ${activeStory.author.name.split(' ')[0]}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 py-2.5 px-4 rounded-full text-xs text-white placeholder-white/60 bg-white/20 backdrop-blur-md border border-white/25 outline-none focus:border-white"
            />
            <button
              type="submit"
              className="p-2.5 rounded-full bg-white text-black hover:bg-slate-200 transition-colors shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {replySent && (
            <div className="text-center text-xs font-semibold text-emerald-400 animate-in fade-in">
              Reply sent to direct messages!
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
