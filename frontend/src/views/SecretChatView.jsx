import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Lock,
  ShieldCheck,
  Flame,
  Eye,
  Clock,
  Send,
  AlertTriangle,
  Trash2,
  Fingerprint,
  XCircle,
  ArrowLeft,
  Image,
  X,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { secretChatService } from '../services/secretChatService';
import { getUserAvatar, handleImageError } from '../utils/avatar';

export default function SecretChatView({
  initialConversationId = null,
  onExit = () => {}
}) {
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const { socket } = useSocket() || {};

  // Conversations list & active selection
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(initialConversationId);
  const [activeConv, setActiveConv] = useState(null);
  const [loadingConvs, setLoadingConvs] = useState(true);

  // Authentication & PIN state per conversation
  // Map of convId -> secretToken
  const [secretTokens, setSecretTokens] = useState({});
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Chat messages & typing
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  // Settings & Modals
  const [showExitModal, setShowExitModal] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [viewOnceActiveItem, setViewOnceActiveItem] = useState(null); // { id, url, type, countdown }

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const prevConvRef = useRef(null);

  // Check if currently unlocked
  const activeSecretToken = activeConvId ? secretTokens[activeConvId] : null;
  const isUnlocked = Boolean(activeSecretToken);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, otherUserTyping]);

  // Load all active secret conversations
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingConvs(true);
      const list = await secretChatService.getSecretConversations();
      setConversations(list);

      if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0]._id);
        setActiveConv(list[0]);
      } else if (activeConvId) {
        const found = list.find((c) => c._id === activeConvId);
        if (found) setActiveConv(found);
      }
    } catch (err) {
      console.warn('Failed to load secret conversations:', err.message);
    } finally {
      setLoadingConvs(false);
    }
  }, [isAuthenticated, activeConvId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Handle active conversation switch
  const handleSelectConversation = (conv) => {
    if (activeConvId !== conv._id) {
      setActiveConvId(conv._id);
      setActiveConv(conv);
      setPinInput('');
      setPinError('');
      setMessages([]);
      setSelectedMedia(null);
      setMediaPreview(null);
    }
  };

  // Socket room join & listeners
  useEffect(() => {
    if (!socket || !activeConvId || !isUnlocked) return;

    // Leave previous secret room
    if (prevConvRef.current && prevConvRef.current !== activeConvId) {
      socket.emit('secret:conversation:leave', prevConvRef.current);
    }
    prevConvRef.current = activeConvId;

    // Join dedicated secret room
    socket.emit('secret:conversation:join', activeConvId);

    // Listen for new secret messages
    const handleNewSecretMessage = (newMsg) => {
      if (newMsg.conversation === activeConvId || newMsg.conversation?._id === activeConvId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
      }
    };

    // Listen for view-once burn events
    const handleViewOnceBurn = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, viewed: true, mediaUrl: null, mediaPublicId: null }
            : m
        )
      );
    };

    // Listen for server-side auto-delete prune events
    const handlePruned = ({ deletedIds }) => {
      if (deletedIds && deletedIds.length > 0) {
        setMessages((prev) => prev.filter((m) => !deletedIds.includes(m._id)));
      }
    };

    // Listen for conversation wiped/closed
    const handleWiped = () => {
      setMessages([]);
      loadConversations();
    };

    // Listen for typing events
    const handleTyping = ({ userId }) => {
      if (userId !== user?.id) {
        setOtherUserTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setOtherUserTyping(false), 2000);
      }
    };

    const handleStopTyping = ({ userId }) => {
      if (userId !== user?.id) {
        setOtherUserTyping(false);
      }
    };

    socket.on('secret:message:new', handleNewSecretMessage);
    socket.on('secret:message:view', handleViewOnceBurn);
    socket.on('secret:messages:pruned', handlePruned);
    socket.on('secret:conversation:wiped', handleWiped);
    socket.on('secret:typing:user', handleTyping);
    socket.on('secret:typing:stop', handleStopTyping);

    return () => {
      socket.emit('secret:conversation:leave', activeConvId);
      socket.off('secret:message:new', handleNewSecretMessage);
      socket.off('secret:message:view', handleViewOnceBurn);
      socket.off('secret:messages:pruned', handlePruned);
      socket.off('secret:conversation:wiped', handleWiped);
      socket.off('secret:typing:user', handleTyping);
      socket.off('secret:typing:stop', handleStopTyping);
    };
  }, [socket, activeConvId, isUnlocked, user?.id, loadConversations]);

  // Load messages once unlocked with secretToken
  useEffect(() => {
    if (!activeConvId || !activeSecretToken) return;

    let isMounted = true;
    const fetchSecretMessages = async () => {
      try {
        setLoadingMsgs(true);
        const msgs = await secretChatService.getMessages(activeConvId, activeSecretToken);
        if (isMounted) setMessages(msgs);
      } catch (err) {
        console.warn('Could not load secret messages:', err.message);
      } finally {
        if (isMounted) setLoadingMsgs(false);
      }
    };

    fetchSecretMessages();

    return () => {
      isMounted = false;
    };
  }, [activeConvId, activeSecretToken]);

  // PIN Keypad input
  const handlePinDigit = (digit) => {
    if (pinInput.length < 6) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setPinError('');
    }
  };

  // Submit PIN for verification
  const handleVerifyPinSubmit = async (e) => {
    if (e) e.preventDefault();
    if (pinInput.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }

    try {
      setVerifyingPin(true);
      setPinError('');
      const res = await secretChatService.verifyPin(activeConvId, pinInput);

      // Store secretToken in state for this conversation session
      setSecretTokens((prev) => ({
        ...prev,
        [activeConvId]: res.secretToken
      }));
      setActiveConv(res.conversation);
      setPinInput('');
    } catch (err) {
      setPinError(err.message || 'Incorrect security PIN. Access denied.');
      setPinInput('');
    } finally {
      setVerifyingPin(false);
    }
  };

  // Quick unlock for testing
  const handleDemoUnlock = () => {
    setPinInput('1234');
    setTimeout(() => {
      secretChatService
        .verifyPin(activeConvId, '1234')
        .then((res) => {
          setSecretTokens((prev) => ({ ...prev, [activeConvId]: res.secretToken }));
          setActiveConv(res.conversation);
          setPinInput('');
        })
        .catch((err) => setPinError(err.message));
    }, 100);
  };

  // Media file select
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('File size exceeds 50MB limit');
      return;
    }

    setSelectedMedia(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  // Send Secret Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedMedia) || isSending || !activeSecretToken) return;

    try {
      setIsSending(true);
      const formData = new FormData();
      if (inputText.trim()) formData.append('text', inputText.trim());
      if (selectedMedia) formData.append('media', selectedMedia);
      if (isViewOnce) formData.append('isViewOnce', 'true');

      const newMsg = await secretChatService.sendMessage(
        activeConvId,
        activeSecretToken,
        formData
      );

      setMessages((prev) => {
        if (prev.some((m) => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });

      setInputText('');
      setSelectedMedia(null);
      setMediaPreview(null);
      setIsViewOnce(false);

      if (socket) {
        socket.emit('secret:typing:stop', { conversationId: activeConvId });
      }
    } catch (err) {
      alert(err.message || 'Failed to send secret message');
    } finally {
      setIsSending(false);
    }
  };

  // Handle typing input
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socket || !activeConvId) return;

    socket.emit('secret:typing:start', { conversationId: activeConvId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('secret:typing:stop', { conversationId: activeConvId });
    }, 1500);
  };

  // View-once open trigger
  const handleOpenViewOnce = async (msg) => {
    if (msg.viewed) return;

    try {
      // Invalidate on backend immediately
      await secretChatService.viewOnceMedia(msg._id);

      // Show in modal with 5 second countdown
      setViewOnceActiveItem({
        id: msg._id,
        url: msg.mediaUrl,
        type: msg.messageType,
        countdown: 5
      });

      // Update local state to viewed
      setMessages((prev) =>
        prev.map((m) => (m._id === msg._id ? { ...m, viewed: true, mediaUrl: null } : m))
      );
    } catch (err) {
      alert(err.message || 'Could not reveal media');
    }
  };

  // Countdown timer for active view-once popup
  useEffect(() => {
    if (!viewOnceActiveItem) return;

    const interval = setInterval(() => {
      setViewOnceActiveItem((prev) => {
        if (!prev) return null;
        if (prev.countdown <= 1) {
          clearInterval(interval);
          return null; // Close popup once countdown finishes
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [viewOnceActiveItem]);

  // Update Auto-Delete Limit
  const handleUpdateLimit = async (limit) => {
    try {
      const updated = await secretChatService.updateSettings(activeConvId, activeSecretToken, {
        autoDeleteLimit: limit
      });
      setActiveConv(updated);
      // Reload messages in case oldest messages were pruned
      const msgs = await secretChatService.getMessages(activeConvId, activeSecretToken);
      setMessages(msgs);
    } catch (err) {
      alert(err.message || 'Could not update auto-delete limit');
    }
  };

  // Exit & Wipe conversation
  const handleExitAndWipe = async () => {
    try {
      setIsWiping(true);
      await secretChatService.exitSecretChat(activeConvId, activeSecretToken);

      // Clear local secret token
      setSecretTokens((prev) => {
        const next = { ...prev };
        delete next[activeConvId];
        return next;
      });

      setShowExitModal(false);
      onExit();
    } catch (err) {
      alert(err.message || 'Failed to wipe secret chat');
    } finally {
      setIsWiping(false);
    }
  };

  const otherParticipant = activeConv?.participants?.find(
    (p) => p._id !== user?.id && p._id?.toString() !== user?.id?.toString()
  );

  return (
    <div className="h-[calc(100vh-6.5rem)] rounded-3xl overflow-hidden flex flex-col lg:flex-row bg-[#08090e] border border-emerald-500/20 shadow-2xl relative">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial from-emerald-950/20 via-transparent to-transparent pointer-events-none" />

      {/* ======================================================== */}
      {/* SIDEBAR: Active Secret Conversations List                */}
      {/* ======================================================== */}
      <div className="w-full lg:w-72 border-r border-emerald-500/15 flex flex-col bg-[#0b0d14]/90 backdrop-blur-md">
        <div className="p-4 border-b border-emerald-500/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs tracking-tight text-white">Secret Vaults</span>
          </div>
          <button
            onClick={onExit}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Exit Secret Mode"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConvs ? (
            <div className="p-4 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              <Lock className="w-6 h-6 mx-auto mb-2 text-slate-600" />
              <span>No secret chats active. Visit a profile to start one!</span>
            </div>
          ) : (
            conversations.map((c) => {
              const other = c.participants?.find((p) => p._id !== user?.id);
              const isSelected = c._id === activeConvId;
              const isUnlockedHere = Boolean(secretTokens[c._id]);

              return (
                <button
                  key={c._id}
                  onClick={() => handleSelectConversation(c)}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all ${
                    isSelected
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-white'
                      : 'hover:bg-white/5 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={getUserAvatar(other)}
                      onError={(e) => handleImageError(e, other?.name)}
                      alt={other?.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="truncate">
                      <span className="font-bold text-xs block text-slate-200 truncate">
                        {other?.name || 'Private Contact'}
                      </span>
                      <span className="text-[10px] text-slate-500">@{other?.username}</span>
                    </div>
                  </div>

                  {isUnlockedHere ? (
                    <span className="text-[10px] font-bold text-emerald-400 px-1.5 py-0.5 rounded-full bg-emerald-500/10">
                      Unlocked
                    </span>
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MAIN VAULT AREA: PIN SCREEN OR UNLOCKED CHAT             */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col relative z-10 min-w-0 overflow-hidden">
        {/* CASE A: NO CONVERSATION SELECTED */}
        {!activeConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <Lock className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-white">Select a Secret Chat</h3>
            <p className="text-xs text-slate-500 mt-1">
              Choose an active secret conversation or start one from any user's profile.
            </p>
          </div>
        ) : !isUnlocked ? (
          /* CASE B: PIN VERIFICATION SCREEN */
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="max-w-xs w-full flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-xl shadow-emerald-500/10 animate-pulse">
                <Lock className="w-8 h-8" />
              </div>

              <h2 className="text-lg font-black text-white tracking-tight">
                Secret Vault Locked
              </h2>
              <p className="text-xs text-slate-400 mt-1 mb-6 leading-relaxed">
                Enter your security PIN to decrypt messages with{' '}
                <strong className="text-white">@{otherParticipant?.username || 'contact'}</strong>.
              </p>

              {/* PIN Bullets Display */}
              <div className="flex gap-3 mb-6">
                {[0, 1, 2, 3, 4, 5].slice(0, Math.max(4, pinInput.length)).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                      pinError
                        ? 'bg-rose-500 scale-110 shadow-sm shadow-rose-500'
                        : pinInput.length > idx
                        ? 'bg-emerald-400 scale-110 shadow-sm shadow-emerald-400'
                        : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>

              {/* Error feedback */}
              {pinError && (
                <div className="mb-4 text-xs font-bold text-rose-400 flex items-center gap-1.5 animate-bounce">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{pinError}</span>
                </div>
              )}

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2.5 w-full mb-5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePinDigit(num.toString())}
                    className="h-11 rounded-2xl bg-white/[0.04] hover:bg-white/[0.1] active:bg-emerald-500/20 text-white font-semibold text-lg border border-white/5 transition-all shadow-xs"
                  >
                    {num}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setPinInput('')}
                  className="h-11 rounded-2xl bg-white/[0.02] text-slate-400 text-xs font-semibold hover:bg-white/[0.06] transition-all"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => handlePinDigit('0')}
                  className="h-11 rounded-2xl bg-white/[0.04] hover:bg-white/[0.1] text-white font-semibold text-lg border border-white/5 transition-all"
                >
                  0
                </button>

                <button
                  type="button"
                  onClick={handleVerifyPinSubmit}
                  disabled={verifyingPin || pinInput.length < 4}
                  className="h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-black font-bold text-xs transition-all flex items-center justify-center shadow-md shadow-emerald-500/20"
                >
                  {verifyingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unlock'}
                </button>
              </div>

              <div className="flex items-center justify-between w-full text-[11px] text-slate-400 px-1">
                <span>PIN: 4-6 digits</span>
                <button
                  onClick={handleDemoUnlock}
                  className="text-emerald-400 hover:underline font-bold flex items-center gap-1"
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>Try Demo PIN (1234)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* CASE C: UNLOCKED ACTIVE SECRET CHAT */
          <>
            {/* Header */}
            <div className="p-3 sm:px-6 bg-[#0e111a] border-b border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={getUserAvatar(otherParticipant)}
                    onError={(e) => handleImageError(e, otherParticipant?.name)}
                    alt={otherParticipant?.name}
                    className="w-10 h-10 rounded-2xl object-cover ring-2 ring-emerald-500/40"
                  />
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#0e111a]" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {otherParticipant?.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      🔒 Secret Chat
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-400/80 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>PIN Hashed · Ephemeral Isolation</span>
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {/* Auto Delete Picker */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] text-slate-400 hidden sm:inline">Limit:</span>
                  <select
                    value={activeConv?.autoDeleteLimit || 20}
                    onChange={(e) => handleUpdateLimit(Number(e.target.value))}
                    className="bg-transparent outline-none cursor-pointer text-amber-400 font-bold text-xs"
                  >
                    <option value={20} className="bg-[#12141c] text-white">20 msgs</option>
                    <option value={50} className="bg-[#12141c] text-white">50 msgs</option>
                    <option value={100} className="bg-[#12141c] text-white">100 msgs</option>
                  </select>
                </div>

                {/* Exit & Delete Button */}
                <button
                  onClick={() => setShowExitModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Exit & Wipe</span>
                </button>
              </div>
            </div>

            {/* Security Notice Banner */}
            <div className="bg-emerald-950/30 border-b border-emerald-500/15 px-4 py-2 flex items-center justify-between text-[11px] text-emerald-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>Zero-Forwarding Mode: Forward and Share actions restricted. View-once media self-destructs upon opening.</span>
              </div>
              <span className="hidden sm:inline font-mono opacity-60">R.10 Ephemeral Channel</span>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {loadingMsgs ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 rounded-2xl bg-white/5 animate-pulse max-w-sm" />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mb-2" />
                  <span className="text-xs font-bold text-slate-300">Private Secret Session Active</span>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                    Messages are protected, isolated from standard chat logs, and auto-delete when limit is reached.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender?._id === user?.id || msg.sender === user?.id;

                  // 1. View-Once Media Message
                  if (msg.isViewOnce) {
                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="p-4 rounded-3xl bg-white/[0.04] border border-amber-500/30 backdrop-blur-md max-w-xs w-full shadow-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5" />
                              <span>View-Once {msg.messageType === 'video' ? 'Video' : 'Photo'}</span>
                            </span>
                            {msg.viewed && (
                              <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                <span>Burned</span>
                              </span>
                            )}
                          </div>

                          {msg.viewed ? (
                            <div className="p-4 rounded-2xl bg-black/40 border border-rose-500/20 text-center">
                              <XCircle className="w-6 h-6 text-rose-500 mx-auto mb-1" />
                              <span className="text-xs font-bold text-rose-400 block">Media Burned</span>
                              <p className="text-[10px] text-slate-500 mt-0.5">Asset permanently destroyed on server.</p>
                            </div>
                          ) : isMe ? (
                            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center text-xs text-slate-400">
                              <span>Sent as view-once. Awaiting receiver reveal.</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenViewOnce(msg)}
                              className="w-full p-5 rounded-2xl bg-black/50 hover:bg-black/70 border border-white/10 flex flex-col items-center justify-center text-center transition-all group"
                            >
                              <Eye className="w-7 h-7 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
                              <span className="text-xs font-bold text-white">Tap to Reveal View-Once Media</span>
                              <span className="text-[10px] text-slate-400 mt-0.5">Destroys 5 seconds after opening</span>
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  }

                  // 2. Regular Secret Message (Text or Media)
                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-md rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed border shadow-md ${
                          isMe
                            ? 'bg-emerald-950/60 text-emerald-100 border-emerald-500/40 rounded-tr-xs'
                            : 'bg-white/[0.06] text-slate-100 border-white/10 rounded-tl-xs'
                        }`}
                      >
                        {/* Media display if any */}
                        {msg.mediaUrl && (
                          <div className="mb-2 rounded-xl overflow-hidden border border-white/10 max-h-60 bg-black/30">
                            {msg.messageType === 'video' ? (
                              <video src={msg.mediaUrl} controls className="w-full h-full object-cover" />
                            ) : (
                              <img src={msg.mediaUrl} alt="Secret Media" className="w-full h-full object-cover" />
                            )}
                          </div>
                        )}

                        {msg.content && <p className="whitespace-pre-line">{msg.content}</p>}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}

              {/* Real-time typing bubble */}
              {otherUserTyping && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 italic">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>@{otherParticipant?.username} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Media Preview before sending */}
            {mediaPreview && (
              <div className="px-4 py-2 bg-[#0a0c12] border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 border border-white/10">
                    {selectedMedia?.type.startsWith('video/') ? (
                      <video src={mediaPreview} className="w-full h-full object-cover" />
                    ) : (
                      <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{selectedMedia?.name}</span>
                    <button
                      onClick={() => setIsViewOnce(!isViewOnce)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all mt-1 ${
                        isViewOnce
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      {isViewOnce ? '👁 View Once Active' : 'Normal Media'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedMedia(null);
                    setMediaPreview(null);
                    setIsViewOnce(false);
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 sm:p-4 bg-[#0e111a] border-t border-emerald-500/20 flex items-center gap-2"
            >
              {/* Media File Attachment Trigger */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-2.5 rounded-full border transition-all ${
                  selectedMedia
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
                }`}
                title="Attach photo or video"
              >
                <Image className="w-4 h-4" />
              </button>

              {/* View Once Toggle Button */}
              {selectedMedia && (
                <button
                  type="button"
                  onClick={() => setIsViewOnce(!isViewOnce)}
                  className={`p-2.5 rounded-full border transition-all ${
                    isViewOnce
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  }`}
                  title="Toggle view-once mode"
                >
                  <Flame className="w-4 h-4" />
                </button>
              )}

              <input
                type="text"
                placeholder="Send self-destructing secret message..."
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 py-2.5 px-4 rounded-full text-xs sm:text-sm bg-white/[0.05] border border-white/10 focus:border-emerald-500/50 outline-none text-white placeholder-slate-500 transition-colors"
              />

              <button
                type="submit"
                disabled={(!inputText.trim() && !selectedMedia) || isSending}
                className="p-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 text-black font-bold transition-all shadow-md shadow-emerald-500/20"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* ACTIVE VIEW-ONCE POPUP (Burns upon countdown expiration) */}
      {/* ======================================================== */}
      {viewOnceActiveItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-150">
          <div className="max-w-md w-full rounded-3xl overflow-hidden border border-amber-500/40 bg-[#0e111a] shadow-2xl relative">
            <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4" />
                <span>View-Once Media Revealed</span>
              </span>

              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                Burns in {viewOnceActiveItem.countdown}s
              </span>
            </div>

            <div className="p-2 flex items-center justify-center bg-black/50">
              {viewOnceActiveItem.type === 'video' ? (
                <video src={viewOnceActiveItem.url} autoPlay controls className="max-h-[60vh] w-full object-contain rounded-2xl" />
              ) : (
                <img src={viewOnceActiveItem.url} alt="View Once" className="max-h-[60vh] w-full object-contain rounded-2xl" />
              )}
            </div>

            <div className="p-3 text-center text-[11px] text-slate-400 border-t border-white/5">
              <span>This media has been permanently erased from cloud storage.</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONFIRMATION MODAL: EXIT & WIPE                          */}
      {/* ======================================================== */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl space-y-4 ${
              isDark ? 'bg-[#14161f] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">Exit Secret Chat?</h3>
                <span className="text-xs text-slate-400">Irreversible Deletion</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Exiting will execute the configured <strong>delete-on-exit</strong> policy: all secret messages and Cloudinary media in this session will be permanently erased, and the private channel will be closed.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold"
                disabled={isWiping}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExitAndWipe}
                disabled={isWiping}
                className="px-5 py-2 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md flex items-center gap-1.5"
              >
                {isWiping && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Exit & Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
