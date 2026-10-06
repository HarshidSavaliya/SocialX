import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Send, ChevronLeft, Check, CheckCheck,
  Lock, Loader2, MessageSquare, Video, Phone,
  Image as ImageIcon, Smile, X, Paperclip,
  MoreVertical, CornerUpLeft, CornerUpRight, Download,
  Star, CheckSquare, Trash2, Copy, Plus
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useVideoCall } from '../context/VideoCallContext';
import { messageService } from '../services/messageService';
import { searchService } from '../services/searchService';
import { formatConversationTime, formatMessageTime } from '../utils/dateTime';
import { getUserAvatar, handleImageError } from '../utils/avatar';

export default function MessagingView({ onOpenSecretChat, onNavigateToProfile }) {
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
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Message Actions & Context Menu States
  const [activeMenu, setActiveMenu] = useState(null); // { msg, top, left, isMe }
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardingMsg, setForwardingMsg] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [convToDelete, setConvToDelete] = useState(null);
  const [deletingConv, setDeletingConv] = useState(false);
  const [toastText, setToastText] = useState('');

  const showToast = useCallback((text) => {
    setToastText(text);
    setTimeout(() => setToastText(''), 2500);
  }, []);

  // Close context menu on outside click or resize
  useEffect(() => {
    const handleClose = () => setActiveMenu(null);
    if (activeMenu) {
      window.addEventListener('click', handleClose);
      window.addEventListener('resize', handleClose);
      return () => {
        window.removeEventListener('click', handleClose);
        window.removeEventListener('resize', handleClose);
      };
    }
  }, [activeMenu]);

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
  }, [isAuthenticated, activeConvId]);

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
    setNextCursor(null);
    setHasMore(false);
    setTypingUsers({});

    messageService.getMessages(activeConvId, { limit: 30 })
      .then(res => {
        setMessages(res.messages || []);
        setNextCursor(res.nextCursor || null);
        setHasMore(Boolean(res.hasMore));
      })
      .catch(e => console.warn('Load messages error:', e.message))
      .finally(() => setLoadingMsgs(false));

    // Mark as read
    messageService.markAsRead(activeConvId).catch(() => { });

    // Update unread count in conversation list
    setConversations(prev =>
      prev.map(c => c._id === activeConvId ? { ...c, unreadCount: 0 } : c)
    );
  }, [activeConvId, socket]);

  // Load older messages via cursor pagination
  const handleLoadOlder = async () => {
    if (!nextCursor || loadingOlder || !activeConvId) return;
    setLoadingOlder(true);
    try {
      const res = await messageService.getMessages(activeConvId, { cursor: nextCursor, limit: 30 });
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m._id));
        const newOlder = (res.messages || []).filter(m => !existingIds.has(m._id));
        return [...newOlder, ...prev];
      });
      setNextCursor(res.nextCursor || null);
      setHasMore(Boolean(res.hasMore));
    } catch (e) {
      console.warn('Load older messages error:', e.message);
    } finally {
      setLoadingOlder(false);
    }
  };

  // Socket: receive messages + typing
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      const convId = msg.conversation?._id || msg.conversation;
      if (convId === activeConvId) {
        setMessages(prev => {
          if (prev.some(m => m._id === msg._id || (msg.clientMessageId && m.clientMessageId === msg.clientMessageId))) {
            return prev.map(m => (msg.clientMessageId && m.clientMessageId === msg.clientMessageId ? msg : m));
          }
          return [...prev, msg];
        });
        messageService.markAsRead(activeConvId).catch(() => { });
      }
      // Update last message in conversations list & move to top
      setConversations(prev => {
        const target = prev.find(c => c._id === convId);
        if (!target) {
          setTimeout(() => loadConversations(), 0);
          return prev;
        }
        const updated = {
          ...target,
          lastMessage: msg,
          lastMessageAt: msg.createdAt,
          unreadCount: convId === activeConvId ? 0 : (target.unreadCount || 0) + 1
        };
        return [updated, ...prev.filter(c => c._id !== convId)];
      });
    };

    const handleTyping = ({ conversationId, userId, name }) => {
      const myId = (user?._id || user?.id)?.toString();
      if (conversationId === activeConvId && userId?.toString() !== myId) {
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
        const myId = (user?._id || user?.id)?.toString();
        setMessages(prev => prev.map(m => {
          const sId = (m.sender?._id || m.sender?.id || m.sender)?.toString();
          return (sId && myId && sId === myId) ? { ...m, isRead: true } : m;
        }));
      }
    };

    const handleReactionUpdate = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    };

    const handleDeletedMessage = ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    };

    const handleConversationDeleted = ({ conversationId }) => {
      setConversations(prev => {
        const next = prev.filter(c => c._id !== conversationId);
        if (activeConvId === conversationId) {
          setActiveConvId(next.length > 0 ? next[0]._id : null);
        }
        return next;
      });
      if (activeConvId === conversationId) {
        setMessages([]);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing:user', handleTyping);
    socket.on('typing:stop', handleTypingStop);
    socket.on('message:read', handleRead);
    socket.on('message:reaction', handleReactionUpdate);
    socket.on('message:deleted', handleDeletedMessage);
    socket.on('conversation:deleted', handleConversationDeleted);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing:user', handleTyping);
      socket.off('typing:stop', handleTypingStop);
      socket.off('message:read', handleRead);
      socket.off('message:reaction', handleReactionUpdate);
      socket.off('message:deleted', handleDeletedMessage);
      socket.off('conversation:deleted', handleConversationDeleted);
    };
  }, [socket, activeConvId, user?._id, user?.id, loadConversations]);

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

  // Context Menu opener with boundary-safe coordinates
  const handleOpenContextMenu = (e, msg, isMe) => {
    e.stopPropagation();
    if (activeMenu?.msg?._id === msg._id) {
      setActiveMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 196;
    const menuHeight = 290;

    // Viewport clamping against header (~75px) and screen edges
    const spaceAbove = rect.top - 75;
    const spaceBelow = window.innerHeight - rect.bottom - 20;

    let top;
    if (spaceAbove >= menuHeight || spaceAbove > spaceBelow) {
      // Position above button
      top = Math.max(75, rect.top - menuHeight - 6);
    } else {
      // Position below button
      top = Math.min(window.innerHeight - menuHeight - 12, rect.bottom + 6);
    }

    let left = isMe ? (rect.right - menuWidth) : rect.left;
    left = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, left));

    setActiveMenu({ msg, top, left, isMe });
  };

  // Message Actions Handlers
  const handleReaction = async (msg, emoji) => {
    setActiveMenu(null);
    try {
      const res = await messageService.reactToMessage(msg._id, emoji);
      setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, reactions: res.reactions } : m));
    } catch (e) {
      console.warn('Reaction error:', e.message);
    }
  };

  const handleReply = (msg) => {
    setActiveMenu(null);
    setReplyingTo(msg);
  };

  const handleForward = (msg) => {
    setActiveMenu(null);
    setForwardingMsg(msg);
  };

  const handleCopyOrSave = (msg) => {
    setActiveMenu(null);
    if (msg.mediaUrl) {
      const a = document.createElement('a');
      a.href = msg.mediaUrl;
      a.download = `socialx-attachment-${msg._id}`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Downloading media...');
    } else if (msg.text) {
      navigator.clipboard.writeText(msg.text);
      showToast('Copied to clipboard!');
    }
  };

  const handleStar = async (msg) => {
    setActiveMenu(null);
    try {
      const res = await messageService.toggleStarMessage(msg._id);
      setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, isStarred: res.isStarred } : m));
      showToast(res.isStarred ? 'Message starred ⭐' : 'Message unstarred');
    } catch (e) {
      setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, isStarred: !m.isStarred } : m));
      showToast('Message starred ⭐');
    }
  };

  const handleSelect = (msg) => {
    setActiveMenu(null);
    setIsSelectMode(true);
    setSelectedMessages(prev =>
      prev.includes(msg._id) ? prev.filter(id => id !== msg._id) : [...prev, msg._id]
    );
  };

  const handleDelete = async (msg) => {
    setActiveMenu(null);
    try {
      await messageService.deleteMessage(msg._id);
      setMessages(prev => prev.filter(m => m._id !== msg._id));
      showToast('Message deleted');
    } catch (e) {
      setMessages(prev => prev.filter(m => m._id !== msg._id));
      showToast('Message removed');
    }
  };

  const handleDeleteConversation = async () => {
    if (!convToDelete?._id || deletingConv) return;
    setDeletingConv(true);
    const targetId = convToDelete._id;
    try {
      await messageService.deleteConversation(targetId);
      setConversations(prev => {
        const next = prev.filter(c => c._id !== targetId);
        if (activeConvId === targetId) {
          setActiveConvId(next.length > 0 ? next[0]._id : null);
        }
        return next;
      });
      if (activeConvId === targetId) {
        setMessages([]);
      }
      setConvToDelete(null);
      showToast('Conversation deleted');
    } catch (e) {
      console.warn('Delete conversation error:', e.message);
      showToast(e.response?.data?.message || 'Failed to delete conversation');
    } finally {
      setDeletingConv(false);
    }
  };

  // Send message
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if ((!messageInput.trim() && !selectedFile) || !activeOther || sending) return;
    const text = messageInput.trim();
    const fileToSend = selectedFile;
    const replyToId = replyingTo?._id;

    setMessageInput('');
    clearSelectedFile();
    setReplyingTo(null);
    setSending(true);

    const clientMessageId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (socket && activeConvId) {
      socket.emit('typing:stop', { conversationId: activeConvId });
    }
    try {
      const msg = await messageService.sendMessage({
        conversationId: activeConvId,
        receiverId: activeOther._id || activeOther.id,
        text,
        file: fileToSend,
        replyTo: replyToId,
        clientMessageId
      });
      if (msg) {
        setMessages(prev => {
          if (prev.some(m => m._id === msg._id || (m.clientMessageId && m.clientMessageId === msg.clientMessageId))) {
            return prev.map(m => (m.clientMessageId === msg.clientMessageId ? msg : m));
          }
          return [...prev, msg];
        });
        setConversations(prev => {
          const convId = activeConvId;
          const target = prev.find(c => c._id === convId);
          if (!target) return prev;
          const updated = {
            ...target,
            lastMessage: msg,
            lastMessageAt: msg.createdAt || new Date().toISOString()
          };
          return [updated, ...prev.filter(c => c._id !== convId)];
        });
      }
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
                  className={`group p-3.5 flex items-center gap-3 cursor-pointer transition-all border-b ${cardBorder} ${isSelected
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
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {conv.unreadCount > 0 && (
                      <span className="min-w-[18px] h-4.5 px-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConvToDelete(conv);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                      title="Delete Conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
              <div
                onClick={() => {
                  const target = activeOther?.username || activeOther?._id || activeOther?.id;
                  if (target && onNavigateToProfile) onNavigateToProfile(target);
                }}
                className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                title={`View ${activeOther?.name || 'user'}'s profile`}
              >
                <div className="relative">
                  <img
                    src={getUserAvatar(activeOther)}
                    onError={(e) => handleImageError(e, activeOther?.name)}
                    alt={activeOther?.name}
                    className="w-9 h-9 rounded-full object-cover group-hover:ring-2 group-hover:ring-indigo-500 transition-all"
                  />
                  {isOtherOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#12141c]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-bold leading-tight group-hover:underline ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {activeOther?.name}
                  </h3>
                  <p className={`text-[11px] font-medium ${isOtherOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {isOtherOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>

              {/* Audio Call Action Button */}
              {activeOther && (
                <button
                  onClick={() => {
                    if (!isOtherOnline) {
                      showToast(`${activeOther?.name || 'User'} is currently offline`);
                    }
                    startCall({
                      receiver: activeOther,
                      conversationId: activeConvId,
                      callType: 'audio'
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all shadow-xs cursor-pointer"
                  title={isOtherOnline ? "Start Audio Call" : `${activeOther?.name || 'User'} is offline (Click to call anyway)`}
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Audio Call</span>
                </button>
              )}

              {/* Video Call Action Button (Agora RTC) */}
              {activeOther && (
                <button
                  onClick={() => {
                    if (!isOtherOnline) {
                      showToast(`${activeOther?.name || 'User'} is currently offline`);
                    }
                    startCall({
                      receiver: activeOther,
                      conversationId: activeConvId,
                      callType: 'video'
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 transition-all shadow-xs cursor-pointer"
                  title={isOtherOnline ? "Start Video Call" : `${activeOther?.name || 'User'} is offline (Click to call anyway)`}
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

              {/* Delete Conversation Action Button */}
              {activeConv && (
                <button
                  type="button"
                  onClick={() => setConvToDelete(activeConv)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 transition-all shadow-xs cursor-pointer"
                  title="Delete Conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Delete Chat</span>
                </button>
              )}
            </div>

            {/* Select Mode Bar */}
            {isSelectMode && (
              <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-500/25 flex items-center justify-between text-xs text-amber-300">
                <span className="font-semibold">{selectedMessages.length} message(s) selected</span>
                <div className="flex items-center gap-2">
                  {selectedMessages.length > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        for (const id of selectedMessages) {
                          await messageService.deleteMessage(id).catch(() => { });
                        }
                        setMessages(prev => prev.filter(m => !selectedMessages.includes(m._id)));
                        setSelectedMessages([]);
                        setIsSelectMode(false);
                        showToast('Selected messages deleted');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-medium transition-colors cursor-pointer"
                    >
                      Delete ({selectedMessages.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelectMode(false);
                      setSelectedMessages([]);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-3"
              onScroll={() => {
                if (activeMenu) setActiveMenu(null);
              }}
            >
              {hasMore && (
                <div className="flex justify-center py-2">
                  <button
                    type="button"
                    onClick={handleLoadOlder}
                    disabled={loadingOlder}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {loadingOlder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{loadingOlder ? 'Loading older messages...' : '↑ Load older messages'}</span>
                  </button>
                </div>
              )}

              {loadingMsgs ? (
                <div className="flex justify-center pt-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-xs text-slate-400">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const myId = (user?._id || user?.id)?.toString();
                  const senderId = (msg.sender?._id || msg.sender?.id || msg.sender)?.toString();
                  const isMe = Boolean(myId && senderId && myId === senderId);

                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'} ${isSelectMode && selectedMessages.includes(msg._id) ? 'bg-amber-500/5 rounded-2xl p-1' : ''
                        }`}
                    >
                      <div className={`relative group/msg flex items-center gap-1.5 max-w-[85%] sm:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Select Mode Checkbox */}
                        {isSelectMode && (
                          <button
                            type="button"
                            onClick={() => handleSelect(msg)}
                            className={`p-1 rounded-lg border transition-colors cursor-pointer flex-shrink-0 ${selectedMessages.includes(msg._id)
                              ? 'bg-amber-500 border-amber-500 text-stone-950 font-bold'
                              : 'border-white/20 hover:border-white/40'
                              }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Message Bubble */}
                        <div
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOpenContextMenu(e, msg, isMe);
                          }}
                          className={`w-full rounded-2xl p-3 text-sm leading-relaxed shadow-xs transition-transform active:scale-[0.99] select-text ${isMe
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-medium rounded-tr-xs shadow-amber-500/15'
                            : isDark ? 'bg-white/[0.08] text-slate-100 rounded-tl-xs border border-white/10' : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/80'
                            }`}
                        >
                          {/* Quoted parent reply if present */}
                          {msg.replyTo && (
                            <div className={`mb-2 p-2 rounded-xl text-xs border-l-2 border-amber-400 ${isMe
                              ? 'bg-black/20 text-stone-950/80'
                              : isDark ? 'bg-white/[0.05] text-slate-300' : 'bg-slate-200/60 text-slate-700'
                              }`}>
                              <p className="font-bold text-[10px] text-amber-500">{msg.replyTo.sender?.name || 'Someone'}</p>
                              <p className="truncate text-[11px] opacity-90">{msg.replyTo.text || (msg.replyTo.mediaUrl ? 'Attachment' : '')}</p>
                            </div>
                          )}

                          {/* Media attachment if present */}
                          {msg.mediaUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden max-w-sm">
                              {msg.mediaType === 'video' ? (
                                <video src={msg.mediaUrl} controls className="max-h-60 rounded-xl w-full" />
                              ) : msg.mediaType === 'audio' ? (
                                <audio src={msg.mediaUrl} controls className="w-full my-1" />
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

                        {/* Hover trigger button */}
                        {!isSelectMode && (
                          <button
                            type="button"
                            onClick={(e) => handleOpenContextMenu(e, msg, isMe)}
                            className={`opacity-0 group-hover/msg:opacity-100 p-1.5 rounded-full transition-all text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer flex-shrink-0 ${activeMenu?.msg?._id === msg._id ? 'opacity-100 bg-white/10 text-white' : ''
                              }`}
                            title="Message options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Reaction Badges on Bubble */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(
                            msg.reactions.reduce((acc, r) => {
                              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([emoji, count]) => (
                            <span
                              key={emoji}
                              onClick={() => handleReaction(msg, emoji)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-xs cursor-pointer shadow-xs transition-transform active:scale-90"
                              title="Toggle reaction"
                            >
                              <span>{emoji}</span>
                              {count > 1 && <span className="text-[10px] font-bold text-slate-300">{count}</span>}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Timestamp, Star, and Status */}
                      <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {msg.isStarred && <Star className="w-3 h-3 text-amber-400 fill-amber-400" title="Starred" />}
                        <span className="text-[10px] text-slate-400">{formatMessageTime(msg.createdAt)}</span>
                        {isMe && (
                          msg.isRead
                            ? <CheckCheck className="w-3 h-3 text-amber-500" />
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

            {/* Boundary-Safe Floating Context Menu */}
            {activeMenu && (
              <div
                style={{
                  top: `${activeMenu.top}px`,
                  left: `${activeMenu.left}px`
                }}
                onClick={(e) => e.stopPropagation()}
                className="fixed z-[999] animate-in fade-in zoom-in-95 duration-150 select-none shadow-2xl"
              >
                {/* 1. Emoji Reactions Row */}
                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#1b1d28]/95 border border-white/15 shadow-2xl mb-1.5 backdrop-blur-md">
                  {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleReaction(activeMenu.msg, emoji)}
                      className="text-lg p-1 hover:scale-130 active:scale-90 transition-transform rounded-lg hover:bg-white/15 cursor-pointer"
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenu(null);
                      setShowEmojiPicker(true);
                    }}
                    className="p-1 rounded-full hover:bg-white/15 text-slate-300 hover:text-white transition-all text-xs cursor-pointer"
                    title="More emojis"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* 2. Actions List */}
                <div className="w-48 rounded-2xl bg-[#1b1d28]/95 border border-white/15 shadow-2xl py-1 text-xs text-slate-200 backdrop-blur-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleReply(activeMenu.msg)}
                    className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-white/[0.08] text-left transition-colors font-medium cursor-pointer"
                  >
                    <CornerUpLeft className="w-4 h-4 text-slate-300" />
                    <span>Reply</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleForward(activeMenu.msg)}
                    className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-white/[0.08] text-left transition-colors font-medium cursor-pointer"
                  >
                    <CornerUpRight className="w-4 h-4 text-slate-300" />
                    <span>Forward</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyOrSave(activeMenu.msg)}
                    className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-white/[0.08] text-left transition-colors font-medium cursor-pointer"
                  >
                    {activeMenu.msg.mediaUrl ? <Download className="w-4 h-4 text-slate-300" /> : <Copy className="w-4 h-4 text-slate-300" />}
                    <span>{activeMenu.msg.mediaUrl ? 'Save media' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStar(activeMenu.msg)}
                    className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-white/[0.08] text-left transition-colors font-medium cursor-pointer"
                  >
                    <Star className={`w-4 h-4 ${activeMenu.msg.isStarred ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                    <span>{activeMenu.msg.isStarred ? 'Star all' : 'Star message'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelect(activeMenu.msg)}
                    className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-white/[0.08] text-left transition-colors font-medium cursor-pointer"
                  >
                    <CheckSquare className="w-4 h-4 text-slate-300" />
                    <span>Select</span>
                  </button>

                  <div className="h-px bg-white/10 my-1" />

                  <button
                    type="button"
                    onClick={() => handleDelete(activeMenu.msg)}
                    className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-rose-500/15 text-rose-400 text-left transition-colors font-medium cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}

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

            {/* Quoted Reply Preview Bar */}
            {replyingTo && (
              <div className={`px-4 py-2 flex items-center justify-between border-t ${cardBorder} ${isDark ? 'bg-white/[0.04]' : 'bg-amber-50/70'}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-1 h-8 rounded-full bg-amber-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                      <CornerUpLeft className="w-3 h-3" />
                      <span>Replying to {replyingTo.sender?.name || 'User'}</span>
                    </p>
                    <p className={`text-xs truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {replyingTo.text || (replyingTo.mediaUrl ? 'Attachment' : '')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Cancel reply"
                >
                  <X className="w-4 h-4" />
                </button>
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

      {/* Forward Message Modal */}
      {forwardingMsg && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl p-5 border shadow-2xl ${isDark ? 'bg-[#181a24] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <CornerUpRight className="w-4 h-4 text-amber-500" />
                <span>Forward Message</span>
              </h3>
              <button
                type="button"
                onClick={() => setForwardingMsg(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`p-3 rounded-2xl mb-4 text-xs ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
              <p className="font-semibold text-slate-400 text-[10px] mb-1">Message Preview:</p>
              <p className="truncate opacity-90">{forwardingMsg.text || 'Media attachment'}</p>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">Select conversation</p>
              {conversations.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No other conversations</p>
              ) : (
                conversations.map(c => {
                  const targetUser = c.otherUser;
                  if (!targetUser) return null;
                  return (
                    <div key={c._id} className={`flex items-center justify-between p-2.5 rounded-2xl transition-colors ${isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={getUserAvatar(targetUser)} alt={targetUser.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight truncate">{targetUser.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">@{targetUser.username}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await messageService.sendMessage({
                              receiverId: targetUser._id,
                              text: forwardingMsg.text,
                              mediaUrl: forwardingMsg.mediaUrl,
                              mediaType: forwardingMsg.mediaType
                            });
                            setForwardingMsg(null);
                            showToast(`Forwarded to ${targetUser.name}!`);
                          } catch (e) {
                            showToast('Failed to forward');
                          }
                        }}
                        className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 transition-colors cursor-pointer flex-shrink-0"
                      >
                        Send
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Conversation Confirmation Modal */}
      {convToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className={`relative w-full max-w-sm rounded-3xl border p-6 shadow-2xl transition-all ${
            isDark ? 'bg-[#12141c] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3.5 mb-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold tracking-tight">Delete Conversation?</h3>
                <p className="text-xs text-slate-400 truncate">
                  Chat with {convToDelete.otherUser?.name || 'this user'}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              This will permanently delete this conversation and all its messages for you. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deletingConv}
                onClick={() => setConvToDelete(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isDark ? 'bg-white/10 hover:bg-white/15 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingConv}
                onClick={handleDeleteConversation}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 active:scale-95 text-white transition-all shadow-md shadow-rose-600/30 cursor-pointer disabled:opacity-50"
              >
                {deletingConv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{deletingConv ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastText && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-stone-900/95 text-white text-xs font-semibold shadow-2xl border border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-2">
          <span>{toastText}</span>
        </div>
      )}
    </div>
  );
}
