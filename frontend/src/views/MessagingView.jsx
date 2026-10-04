import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Send, ChevronLeft, Check, CheckCheck,
  Lock, Loader2, MessageSquare, Video, Phone,
  Image as ImageIcon, Smile, X, Paperclip
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useVideoCall } from '../context/VideoCallContext';
import { messageService } from '../services/messageService';
import { searchService } from '../services/searchService';
import { formatConversationTime, formatMessageTime } from '../utils/dateTime';
import { getUserAvatar, handleImageError } from '../utils/avatar';

export default function MessagingView({ onOpenSecretChat }) {
  const { isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { socket, onlineUsers } = useSocket() || {};
  const { startCall } = useVideoCall();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [searchConv, setSearchConv] = useState('');
  const [convFilter, setConvFilter] = useState('all');
  const [followingResults, setFollowingResults] = useState([]);
  const [searchingFollowing, setSearchingFollowing] = useState(false);
  const [followingSearchError, setFollowingSearchError] = useState('');
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const prevConvRef = useRef(null);
  const fileInputRef = useRef(null);

  const activeConv = conversations.find(c => c._id === activeConvId);
  const activeOther = activeConv?.otherUser;
  const isOtherOnline = activeOther && onlineUsers?.includes(activeOther._id?.toString());

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingConvs(true);
    try {
      const convs = await messageService.getConversations();
      setConversations(convs);
      if (!activeConvId && convs.length > 0) {
        setActiveConvId(convs[0]._id);
      }
    } catch (e) {
      console.warn('Load conversations error:', e.message);
    } finally {
      setLoadingConvs(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) return;

    // Leave previous room
    if (prevConvRef.current && prevConvRef.current !== activeConvId && socket) {
      socket.emit('conversation:leave', prevConvRef.current);
    }
    prevConvRef.current = activeConvId;

    // Join new room
    if (socket) socket.emit('conversation:join', activeConvId);

    setLoadingMsgs(true);
    setMessages([]);
    setTypingUsers({});

    messageService.getMessages(activeConvId, 1, 50)
      .then(res => setMessages(res.messages || []))
      .catch(e => console.warn('Load messages error:', e.message))
      .finally(() => setLoadingMsgs(false));

    // Mark as read
    messageService.markAsRead(activeConvId).catch(() => { });

    // Update unread count in conversation list
    setConversations(prev =>
      prev.map(c => c._id === activeConvId ? { ...c, unreadCount: 0 } : c)
    );
  }, [activeConvId, socket]);

  // Socket: receive messages + typing
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      const convId = msg.conversation?._id || msg.conversation;
      if (convId === activeConvId) {
        setMessages(prev => {
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        messageService.markAsRead(activeConvId).catch(() => { });
      }
      // Update last message in conversations list
      setConversations(prev =>
        prev.map(c => {
          if (c._id === convId) {
            return {
              ...c,
              lastMessage: msg,
              lastMessageAt: msg.createdAt,
              unreadCount: convId === activeConvId ? 0 : (c.unreadCount || 0) + 1
            };
          }
          return c;
        })
      );
      // If conversation not in list, reload
      setConversations(prev => {
        const exists = prev.find(c => c._id === convId);
        if (!exists) {
          loadConversations();
        }
        return prev;
      });
    };

    const handleTyping = ({ conversationId, userId, name }) => {
      if (conversationId === activeConvId && userId !== user?._id?.toString()) {
        setTypingUsers(prev => ({ ...prev, [userId]: name || 'Someone' }));
      }
    };

    const handleTypingStop = ({ conversationId, userId }) => {
      if (conversationId === activeConvId) {
        setTypingUsers(prev => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    };

    const handleRead = ({ conversationId }) => {
      if (conversationId === activeConvId) {
        setMessages(prev => prev.map(m =>
          m.sender?._id === user?._id ? { ...m, isRead: true } : m
        ));
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing:user', handleTyping);
    socket.on('typing:stop', handleTypingStop);
    socket.on('message:read', handleRead);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing:user', handleTyping);
      socket.off('typing:stop', handleTypingStop);
      socket.off('message:read', handleRead);
    };
  }, [socket, activeConvId, user?._id, loadConversations]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing indicator emit
  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    if (socket && activeConvId) {
      socket.emit('typing:start', { conversationId: activeConvId });
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        socket.emit('typing:stop', { conversationId: activeConvId });
      }, 2000);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEmojiSelect = (emoji) => {
    setMessageInput(prev => prev + emoji);
  };

  // Send message
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if ((!messageInput.trim() && !selectedFile) || !activeOther || sending) return;
    const text = messageInput.trim();
    const fileToSend = selectedFile;

    setMessageInput('');
    clearSelectedFile();
    setSending(true);

    if (socket && activeConvId) {
      socket.emit('typing:stop', { conversationId: activeConvId });
    }
    try {
      const msg = await messageService.sendMessage({
        receiverId: activeOther._id,
        text,
        file: fileToSend
      });
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    } catch (e) {
      console.warn('Send message error:', e.message);
      setMessageInput(text);
    } finally {
      setSending(false);
    }
  };

  // Search for matching users the current user already follows.
  useEffect(() => {
    const query = searchConv.trim();
    let isCurrent = true;
    if (!query) {
      setFollowingResults([]);
      setFollowingSearchError('');
      setSearchingFollowing(false);
      return () => { isCurrent = false; };
    }

    setFollowingSearchError('');
    setSearchingFollowing(true);
    const timer = setTimeout(async () => {
      try {
        const users = await searchService.searchUsers(query, 50);
        if (isCurrent) {
          setFollowingResults(users.filter(userResult => userResult.isFollowing && !userResult.isSelf));
        }
      } catch (error) {
        if (!isCurrent) return;
        console.warn('Search following users error:', error.message);
        setFollowingResults([]);
        setFollowingSearchError(error.message || 'Could not search followed users');
      } finally {
        if (isCurrent) setSearchingFollowing(false);
      }
    }, 350);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [searchConv]);

  const openConversationWith = async (targetUser) => {
    setSearchConv('');
    try {
      const conv = await messageService.createConversation(targetUser._id);
      await loadConversations();
      setActiveConvId(conv._id);
      setMobileView('chat');
    } catch (e) {
      console.warn('Create conversation error:', e.message);
    }
  };

  const filteredConvs = conversations.filter(c => {
    const name = c.otherUser?.name?.toLowerCase() || '';
    const username = c.otherUser?.username?.toLowerCase() || '';
    const matchSearch = name.includes(searchConv.toLowerCase()) || username.includes(searchConv.toLowerCase());
    if (convFilter === 'unread') return matchSearch && c.unreadCount > 0;
    return matchSearch;
  });

  const typingNames = Object.values(typingUsers);

  // ── Shared classes ──────────────────────────────────────────────────
  const cardBorder = isDark ? 'border-white/[0.08]' : 'border-slate-200/80';
  const colBg1 = isDark ? 'bg-white/[0.02]' : 'bg-slate-50/50';

  return (
    <div className={`h-[calc(100vh-7rem)] rounded-3xl overflow-hidden flex flex-col md:flex-row border shadow-sm transition-colors ${isDark ? 'bg-[#12141c]/90 border-white/[0.08]' : 'bg-white border-slate-200/80'}`}>

      {/* ── COLUMN 1: Conversations ───────────────────────────── */}
      <div className={`${mobileView === 'chat' ? 'hidden' : 'flex'} md:flex w-full md:w-80 flex-col border-r flex-shrink-0 ${cardBorder} ${colBg1}`}>
        {/* Header */}
        <div className={`p-4 border-b ${cardBorder}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Messages</h2>
            <div className="flex items-center gap-1.5">
              {onOpenSecretChat && (
                <button
                  onClick={onOpenSecretChat}
                  className={`p-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${isDark ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/25' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}
                  title="Secret Chat"
                >
                  <Lock className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          {/* Search */}
          <div className={`relative flex items-center rounded-xl border ${isDark ? 'bg-white/[0.05] border-white/10' : 'bg-white border-slate-200'}`}>
            <Search className="w-3.5 h-3.5 ml-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations or people you follow..."
              value={searchConv}
              onChange={e => setSearchConv(e.target.value)}
              className={`w-full py-2 pl-2 pr-3 text-xs bg-transparent outline-none ${isDark ? 'text-slate-100 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
            />
          </div>
          {/* Filters */}
          <div className="flex items-center gap-1.5 mt-2.5 text-xs">
            {['all', 'unread'].map(f => (
              <button
                key={f}
                onClick={() => setConvFilter(f)}
                className={`px-3 py-1 rounded-full font-semibold capitalize transition-all ${convFilter === f
                  ? isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {searchConv.trim() && (
          <div className={`max-h-56 overflow-y-auto border-b p-2 ${cardBorder}`}>
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              People you follow
            </p>
            {searchingFollowing ? (
              <p className="px-2 py-3 text-xs text-slate-400">Searching followed people...</p>
            ) : followingSearchError ? (
              <p className="px-2 py-3 text-xs text-rose-500">{followingSearchError}</p>
            ) : followingResults.length > 0 ? (
              <div className="space-y-1">
                {followingResults.map(friend => (
                  <button
                    key={friend._id}
                    onClick={() => openConversationWith(friend)}
                    className={`w-full flex items-center gap-2.5 rounded-xl p-2 text-left transition-colors ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`}
                  >
                    <img
                      src={getUserAvatar(friend)}
                      onError={(e) => handleImageError(e, friend.name)}
                      alt={friend.name}
                      className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {friend.name}
                      </span>
                      <span className="block truncate text-[10px] text-slate-400">@{friend.username}</span>
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-500">Message</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-2 py-3 text-xs text-slate-400">No followed people match this search.</p>
            )}
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-14 rounded-xl animate-pulse ${isDark ? 'bg-white/[0.05]' : 'bg-slate-100'}`} />
              ))}
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-10 text-center px-4">
              <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">
                {conversations.length === 0 ? 'No conversations yet.\nClick + to start messaging.' : 'No conversations found'}
              </p>
            </div>
          ) : (
            filteredConvs.map(conv => {
              const other = conv.otherUser;
              const isOnline = other && onlineUsers?.includes(other._id?.toString());
              const isSelected = conv._id === activeConvId;
              return (
                <div
                  key={conv._id}
                  onClick={() => { setActiveConvId(conv._id); setMobileView('chat'); }}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all border-b ${cardBorder} ${isSelected
                      ? isDark ? 'bg-white/[0.07]' : 'bg-slate-100/90'
                      : isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'
                    }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={getUserAvatar(other)}
                      onError={(e) => handleImageError(e, other?.name)}
                      alt={other?.name}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#12141c]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{other?.name}</h4>
                      <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1">{formatConversationTime(conv.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {conv.lastMessage?.text || 'Start a conversation'}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="flex-shrink-0 min-w-[18px] h-4.5 px-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── COLUMN 2: Active Chat ──────────────────────────────── */}
      <div className={`${mobileView === 'list' ? 'hidden' : 'flex'} md:flex flex-1 flex-col min-w-0`}>
        {!activeConv ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Select a conversation</p>
            <p className="text-xs text-slate-400 mt-1">or click + to start a new one</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className={`px-4 py-3 flex items-center gap-3 border-b ${cardBorder} ${isDark ? 'bg-white/[0.02]' : 'bg-white/90'}`}>
              <button
                onClick={() => setMobileView('list')}
                className="md:hidden p-1 text-slate-400 hover:text-slate-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="relative">
                <img
                  src={getUserAvatar(activeOther)}
                  onError={(e) => handleImageError(e, activeOther?.name)}
                  alt={activeOther?.name}
                  className="w-9 h-9 rounded-full object-cover"
                />
                {isOtherOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#12141c]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {activeOther?.name}
                </h3>
                <p className={`text-[11px] font-medium ${isOtherOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {isOtherOnline ? 'Online' : 'Offline'}
                </p>
              </div>

              {/* Voice Call Action Button */}
              {activeOther && (
                <button
                  onClick={() =>
                    startCall({
                      receiver: activeOther,
                      conversationId: activeConvId,
                      callType: 'audio'
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all shadow-xs cursor-pointer"
                  title="Start Voice Call"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Voice Call</span>
                </button>
              )}

              {/* Video Call Action Button (Agora RTC) */}
              {activeOther && (
                <button
                  onClick={() =>
                    startCall({
                      receiver: activeOther,
                      conversationId: activeConvId,
                      callType: 'video'
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 transition-all shadow-xs cursor-pointer"
                  title="Start Agora Video Call"
                >
                  <Video className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Video Call</span>
                </button>
              )}

              {onOpenSecretChat && (
                <button
                  onClick={onOpenSecretChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all shadow-xs"
                  title="Switch to Secret Chat"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Secret Mode</span>
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex justify-center pt-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-xs text-slate-400">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender?._id === user?._id || msg.sender === user?._id;
                  return (
                    <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 text-sm leading-relaxed shadow-xs ${isMe
                          ? isDark ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-900 text-white rounded-tr-sm'
                          : isDark ? 'bg-white/[0.08] text-slate-100 rounded-tl-sm border border-white/10' : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                        }`}>
                        {/* Media attachment if present */}
                        {msg.mediaUrl && (
                          <div className="mb-2 rounded-xl overflow-hidden max-w-sm">
                            {msg.mediaType === 'video' ? (
                              <video src={msg.mediaUrl} controls className="max-h-60 rounded-xl w-full" />
                            ) : (
                              <img
                                src={msg.mediaUrl}
                                alt="Attachment"
                                className="w-full h-auto object-cover max-h-64 rounded-xl hover:opacity-95 transition-opacity cursor-pointer"
                                onClick={() => window.open(msg.mediaUrl, '_blank')}
                              />
                            )}
                          </div>
                        )}
                        {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 px-1">
                        <span className="text-[10px] text-slate-400">{formatMessageTime(msg.createdAt)}</span>
                        {isMe && (
                          msg.isRead
                            ? <CheckCheck className="w-3 h-3 text-indigo-400" />
                            : <Check className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {typingNames.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className={`flex gap-1 items-center px-3 py-2 rounded-full text-xs text-slate-400 ${isDark ? 'bg-white/[0.05]' : 'bg-slate-100'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.3s]" />
                    <span className="ml-1">{typingNames[0]} is typing...</span>
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Media Preview before send */}
            {filePreview && (
              <div className={`px-4 pt-2.5 pb-1 flex items-center justify-between border-t ${cardBorder} ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <img src={filePreview} alt="Selected file" className="w-14 h-14 object-cover rounded-xl border border-white/20 shadow-xs" />
                    <button
                      type="button"
                      onClick={clearSelectedFile}
                      className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-xs"
                      title="Remove attachment"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-xs text-slate-400 truncate max-w-[200px]">
                    {selectedFile?.name}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Emoji Reaction bar */}
            {showEmojiPicker && (
              <div className={`px-4 py-2 border-t flex items-center gap-2 overflow-x-auto ${cardBorder} ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                {['❤️', '🔥', '👍', '😂', '👏', '🎉', '😍', '🙌', '✨', '💯', '🚀', '😎'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiSelect(emoji)}
                    className="text-base p-1 hover:scale-125 transition-transform rounded-lg hover:bg-white/10"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Message Input */}
            <form
              onSubmit={handleSend}
              className={`p-3 flex items-center gap-2 border-t ${cardBorder} ${isDark ? 'bg-white/[0.02]' : 'bg-white'}`}
            >
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-2.5 rounded-full transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                title="Attach image or video"
              >
                <ImageIcon className="w-4 h-4 text-indigo-400" />
              </button>

              <button
                type="button"
                onClick={() => setShowEmojiPicker(prev => !prev)}
                className={`p-2.5 rounded-full transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'} ${showEmojiPicker ? 'text-amber-400' : ''}`}
                title="Quick emojis"
              >
                <Smile className="w-4 h-4 text-amber-400" />
              </button>

              <input
                type="text"
                placeholder={`Message ${activeOther?.name?.split(' ')[0] || ''}...`}
                value={messageInput}
                onChange={handleInputChange}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
                className={`flex-1 py-2.5 px-4 rounded-full text-sm outline-none transition-colors ${isDark
                    ? 'bg-white/[0.06] text-white placeholder-slate-500 border border-white/10 focus:border-white/20'
                    : 'bg-slate-100 text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-slate-300'
                  }`}
              />
              <button
                type="submit"
                disabled={(!messageInput.trim() && !selectedFile) || sending}
                className={`p-2.5 rounded-full transition-all ${(messageInput.trim() || selectedFile) && !sending
                    ? isDark ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-md cursor-pointer' : 'bg-slate-900 text-white hover:bg-black shadow-md cursor-pointer'
                    : 'opacity-40 cursor-not-allowed bg-slate-200 dark:bg-white/10 text-slate-400'
                  }`}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </>
        )}
      </div>

    </div>
  );
}
