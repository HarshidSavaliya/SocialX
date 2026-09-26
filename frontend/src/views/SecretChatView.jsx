import React, { useState, useEffect } from 'react';
import {
  Lock,
  ShieldCheck,
  Flame,
  Eye,
  EyeOff,
  Clock,
  Send,
  AlertTriangle,
  Trash2,
  KeyRound,
  Fingerprint,
  CheckCircle2,
  ChevronDown,
  XCircle,
  FileLock
} from 'lucide-react';
import { secretChatInitialMessages } from '../data/mockData';

export default function SecretChatView({ onExit }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [timerDuration, setTimerDuration] = useState('30s');
  const [messages, setMessages] = useState(secretChatInitialMessages);
  const [inputText, setInputText] = useState('');
  const [viewOnceRevealed, setViewOnceRevealed] = useState(false);
  const [viewOnceCountdown, setViewOnceCountdown] = useState(5);
  const [viewOnceBurned, setViewOnceBurned] = useState(false);
  const [deleteOnExitEnabled, setDeleteOnExitEnabled] = useState(true);

  // PIN Unlock logic
  const handlePinInput = (digit) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin === '1234') {
        setTimeout(() => setIsUnlocked(true), 150);
      } else if (nextPin.length === 4) {
        setPinError(true);
        setTimeout(() => {
          setPin('');
          setPinError(false);
        }, 800);
      }
    }
  };

  const handleInstantUnlock = () => {
    setPin('1234');
    setIsUnlocked(true);
  };

  // View-once countdown timer
  useEffect(() => {
    let timer;
    if (viewOnceRevealed && !viewOnceBurned) {
      timer = setInterval(() => {
        setViewOnceCountdown((prev) => {
          if (prev <= 1) {
            setViewOnceBurned(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [viewOnceRevealed, viewOnceBurned]);

  const handleRevealViewOnce = () => {
    if (!viewOnceBurned && !viewOnceRevealed) {
      setViewOnceRevealed(true);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      id: `sec_${Date.now()}`,
      sender: 'Alex Rivera',
      text: inputText,
      isMe: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      expiresIn: timerDuration
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');
  };

  const handleWipeAndExit = () => {
    if (deleteOnExitEnabled) {
      setMessages([]);
    }
    onExit();
  };

  // If locked, render PIN Screen
  if (!isUnlocked) {
    return (
      <div className="h-[calc(100vh-6.5rem)] rounded-3xl overflow-hidden flex flex-col items-center justify-center p-6 bg-[#0a0c12] border border-white/[0.08] shadow-2xl relative">
        <div className="absolute inset-0 bg-radial from-emerald-950/20 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-xs w-full flex flex-col items-center text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 shadow-lg shadow-emerald-500/10">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">
            Secret Vault Locked
          </h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            Enter 4-digit security PIN to access zero-knowledge encrypted channels.
          </p>

          {/* PIN Indicators */}
          <div className="flex gap-4 mb-8">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${pinError
                    ? 'bg-rose-500 scale-110'
                    : pin.length > idx
                      ? 'bg-emerald-400 scale-110 shadow-sm shadow-emerald-400'
                      : 'bg-white/20'
                  }`}
              />
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handlePinInput(num.toString())}
                className="h-12 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] active:bg-emerald-500/20 text-white font-semibold text-lg border border-white/5 transition-all"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => setPin('')}
              className="h-12 rounded-2xl bg-white/[0.03] text-slate-400 text-xs font-semibold hover:bg-white/[0.06] transition-all"
            >
              Clear
            </button>
            <button
              onClick={() => handlePinInput('0')}
              className="h-12 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-semibold text-lg border border-white/5 transition-all"
            >
              0
            </button>
            <button
              onClick={handleInstantUnlock}
              className="h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 border border-emerald-500/30 transition-all flex items-center justify-center gap-1"
            >
              <Fingerprint className="w-4 h-4" />
              <span>Bypass</span>
            </button>
          </div>

          <div className="flex items-center justify-between w-full text-[11px] text-slate-400 px-2">
            <span>Demo PIN: <strong className="text-white">1234</strong></span>
            <button
              onClick={handleInstantUnlock}
              className="text-emerald-400 hover:underline font-medium"
            >
              One-click unlock
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Unlocked Secret Chat UI
  return (
    <div className="h-[calc(100vh-6.5rem)] rounded-3xl overflow-hidden flex flex-col bg-[#0a0c12] border border-emerald-500/20 shadow-2xl relative">

      {/* Top Security Banner */}
      <div className="p-3 sm:px-6 bg-gradient-to-r from-emerald-950/40 via-[#0e111a] to-emerald-950/40 border-b border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0a0c12]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Devon Lane <span className="text-emerald-400 font-normal">· Secret Channel</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                AES-256
              </span>
            </div>
            <p className="text-[11px] text-emerald-400/80 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Zero-Log Session · Signal Ephemeral Keys</span>
            </p>
          </div>
        </div>

        {/* Controls: Disappearing timer picker & lock now */}
        <div className="flex items-center gap-2">

          {/* Disappearing Timer Picker */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] text-slate-400 hidden sm:inline">Timer:</span>
            <select
              value={timerDuration}
              onChange={(e) => setTimerDuration(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-amber-400 font-bold text-xs"
            >
              <option value="5s" className="bg-[#12141c] text-white">5s</option>
              <option value="30s" className="bg-[#12141c] text-white">30s</option>
              <option value="5m" className="bg-[#12141c] text-white">5 min</option>
              <option value="1h" className="bg-[#12141c] text-white">1 hour</option>
              <option value="24h" className="bg-[#12141c] text-white">24 hours</option>
            </select>
          </div>

          {/* Delete on exit toggle */}
          <button
            onClick={() => setDeleteOnExitEnabled(!deleteOnExitEnabled)}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${deleteOnExitEnabled
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-white/5 text-slate-400 border-white/10'
              }`}
            title="Auto-destroy conversation upon closing"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete on Exit</span>
          </button>

          {/* Close & Wipe */}
          <button
            onClick={handleWipeAndExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Exit & Wipe</span>
          </button>
        </div>
      </div>

      {/* Security notice warning */}
      <div className="bg-emerald-950/20 border-b border-emerald-500/15 px-4 py-2 flex items-center justify-between text-[11px] text-emerald-300">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>Restricted Mode: Screenshot alerts active, message forwarding disabled, view-once media self-destructs.</span>
        </div>
        <span className="hidden sm:inline opacity-70">SocialX Privacy Guard v2.4</span>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

        {messages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="text-center my-3">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {msg.text}
                </span>
              </div>
            );
          }

          // View Once Media Card
          if (msg.isViewOnce) {
            return (
              <div key={msg.id} className="flex flex-col items-start max-w-sm">
                <div className="p-4 rounded-2xl bg-white/[0.05] border border-amber-500/30 backdrop-blur-md w-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" />
                      <span>View-Once Photo</span>
                    </span>
                    {viewOnceRevealed && !viewOnceBurned && (
                      <span className="text-xs font-black text-rose-400 animate-pulse">
                        Expires in {viewOnceCountdown}s
                      </span>
                    )}
                  </div>

                  {viewOnceBurned ? (
                    <div className="p-6 rounded-xl bg-black/40 border border-rose-500/30 flex flex-col items-center justify-center text-center">
                      <XCircle className="w-8 h-8 text-rose-500 mb-1" />
                      <span className="text-xs font-bold text-rose-400">Media Burned</span>
                      <p className="text-[10px] text-slate-500 mt-1">This photo has vanished from all memory cache.</p>
                    </div>
                  ) : !viewOnceRevealed ? (
                    <button
                      onClick={handleRevealViewOnce}
                      className="w-full p-6 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 flex flex-col items-center justify-center text-center transition-all group"
                    >
                      <Eye className="w-8 h-8 text-amber-400 group-hover:scale-110 transition-transform mb-2" />
                      <span className="text-xs font-bold text-white">Tap to Reveal View-Once Media</span>
                      <span className="text-[10px] text-slate-400 mt-1">Self-destructs 5 seconds after opening</span>
                    </button>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-white/15 relative">
                      <img src={msg.mediaUrl} alt="Classified" className="w-full h-48 object-cover" />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/80 text-rose-400 text-xs font-black border border-rose-500/40">
                        {viewOnceCountdown}s
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.time}</span>
              </div>
            );
          }

          // Regular secret chat message
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-md rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed border ${msg.isMe
                  ? 'bg-emerald-950/50 text-emerald-100 border-emerald-500/30 rounded-tr-xs'
                  : 'bg-white/[0.06] text-slate-100 border-white/10 rounded-tl-xs'
                }`}>
                <p>{msg.text}</p>
                {msg.expiresIn && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-400/90 mt-1.5 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>Disappears in {msg.expiresIn}</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.time}</span>
            </div>
          );
        })}

      </div>

      {/* Secret Message Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 sm:p-4 bg-[#0e111a] border-t border-emerald-500/20 flex items-center gap-2"
      >
        <div className="p-2 rounded-full text-emerald-400">
          <FileLock className="w-4 h-4" />
        </div>

        <input
          type="text"
          placeholder="Send self-destructing encrypted message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 py-2.5 px-4 rounded-full text-xs sm:text-sm bg-white/[0.05] border border-white/10 focus:border-emerald-500/50 outline-none text-white placeholder-slate-500"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-black font-bold transition-all shadow-md shadow-emerald-500/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
