import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Maximize2,
  Minimize2,
  ScreenShare,
  ShieldCheck,
  Sparkles,
  Signal
} from 'lucide-react';
import { currentUser } from '../data/mockData';

export default function VideoCallModal({ isOpen, onClose, contactName = 'Devon Lane' }) {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callSeconds, setCallSeconds] = useState(248); // 04:08 start
  const [isPipFloating, setIsPipFloating] = useState(true);

  // Call duration counter
  useEffect(() => {
    const timer = setInterval(() => {
      setCallSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const formatCallTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-2 sm:p-6 animate-in fade-in duration-200">

      {/* Video Container Shell */}
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[820px] rounded-3xl overflow-hidden bg-[#0c0d14] border border-white/10 shadow-2xl flex flex-col justify-between">

        {/* =========================================================================
            REMOTE VIDEO STAGE (PRIMARY FOCUS)
            ========================================================================= */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1600&q=80"
            alt="Remote Video"
            className="w-full h-full object-cover"
          />
          {/* Subtle gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60" />
        </div>

        {/* Top Header Bar */}
        <div className="relative z-10 p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white tracking-tight">
              {contactName}
            </span>
            <span className="text-xs text-white/60 font-mono">
              {formatCallTime(callSeconds)}
            </span>
          </div>

          {/* Agora RTC connection quality pill */}
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[11px] text-white/80">
            <Signal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Agora HD 1080p · 60fps</span>
            <span className="text-emerald-400 font-mono text-[10px]">18ms</span>
          </div>
        </div>

        {/* Center Wave / Speaking animation indicator */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto pointer-events-none">
          <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
            <span className="w-1 h-3 bg-indigo-400 rounded-full animate-bounce" />
            <span className="w-1 h-5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.15s]" />
            <span className="w-1 h-4 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.3s]" />
            <span className="w-1 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.45s]" />
            <span className="text-xs text-white/90 font-medium ml-1.5">{contactName} is speaking</span>
          </div>
        </div>

        {/* =========================================================================
            LOCAL VIDEO (PICTURE-IN-PICTURE)
            ========================================================================= */}
        {isPipFloating && (
          <div className="absolute bottom-24 right-5 sm:right-8 z-20 w-36 sm:w-48 h-48 sm:h-64 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-900 group">
            {isVideoOn ? (
              <img
                src={currentUser.avatar}
                alt="Local Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <VideoOff className="w-6 h-6 mb-1" />
                <span>Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] text-white font-medium">
              You
            </div>
          </div>
        )}

        {/* =========================================================================
            BOTTOM CONTROLS DOCK (MINIMALIST PREMIUM DOCK FROM IMAGE 2)
            🎤      📹      🔊      ☎
            ========================================================================= */}
        <div className="relative z-20 p-5 sm:p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 shadow-2xl">

            {/* 🎤 Microphone Toggle */}
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              className={`p-3 sm:p-3.5 rounded-full transition-all ${isMicOn
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                }`}
              title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {/* 📹 Camera Toggle */}
            <button
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={`p-3 sm:p-3.5 rounded-full transition-all ${isVideoOn
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                }`}
              title={isVideoOn ? "Turn Camera Off" : "Turn Camera On"}
            >
              {isVideoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {/* 🔊 Speaker Toggle */}
            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`p-3 sm:p-3.5 rounded-full transition-all ${isSpeakerOn
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-amber-500 text-white'
                }`}
              title={isSpeakerOn ? "Mute Output Audio" : "Unmute Output Audio"}
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* 🖥️ Screen Share */}
            <button
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={`hidden sm:flex p-3 sm:p-3.5 rounded-full transition-all ${isScreenSharing
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              title="Share Screen"
            >
              <ScreenShare className="w-5 h-5" />
            </button>

            {/* ☎️ End Call (Crimson Red Pill Button) */}
            <button
              onClick={onClose}
              className="px-5 py-3 sm:py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold flex items-center gap-2 shadow-lg shadow-rose-600/40 transition-all"
              title="End Video Call"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="text-xs tracking-wider uppercase font-extrabold hidden sm:inline">End</span>
            </button>

          </div>
        </div>

      </div>

    </div>
  );
}
