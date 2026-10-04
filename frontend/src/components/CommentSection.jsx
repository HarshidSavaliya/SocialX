import React, { useState, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { commentService } from '../services/commentService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import CommentItem from './CommentItem';

export default function CommentSection({
  postId,
  postOwnerId,
  onCommentCountChange,
  onNavigateToProfile
}) {
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchComments = async () => {
      // Mock reel fallback
      if (typeof postId === 'string' && postId.startsWith('reel_')) {
        if (isMounted) {
          setComments([
            {
              _id: 'mock_c1_' + postId,
              text: 'The cinematography in this reel is incredible! 🌊🔥',
              author: {
                _id: '6abb5dd434c7b0523c4719aa',
                name: 'Alex Rivera',
                username: 'alexrivera',
                profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
              },
              createdAt: new Date(Date.now() - 3600000).toISOString()
            },
            {
              _id: 'mock_c2_' + postId,
              text: 'Pure visual masterpiece. Love the vibes! ✨',
              author: {
                _id: '6abb5dd434c7b0523c4719ac',
                name: 'Devon Lane',
                username: 'devonlane',
                profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
              },
              createdAt: new Date(Date.now() - 1800000).toISOString()
            }
          ]);
          setError(null);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const data = await commentService.getComments(postId);
        if (isMounted) {
          setComments(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Could not load comments');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchComments();
    return () => {
      isMounted = false;
    };
  }, [postId]);

  const handleAddComment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!isAuthenticated) {
      setError('Please log in to post a comment.');
      return;
    }

    if (!text.trim()) return;

    if (text.trim().length > 1000) {
      setError('Comment exceeds 1000 characters limit.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Mock reel support
    if (typeof postId === 'string' && postId.startsWith('reel_')) {
      const mockComment = {
        _id: 'mock_c_' + Date.now(),
        text: text.trim(),
        author: {
          _id: user?._id || user?.id || 'me',
          name: user?.name || 'You',
          username: user?.username || 'you',
          profileImage: user?.profileImage || user?.avatar
        },
        createdAt: new Date().toISOString()
      };
      setComments((prev) => [...prev, mockComment]);
      setText('');
      if (onCommentCountChange) {
        onCommentCountChange(comments.length + 1);
      }
      setIsSubmitting(false);
      return;
    }

    try {
      const newComment = await commentService.addComment(postId, text.trim());
      setComments((prev) => [...prev, newComment]);
      setText('');
      if (onCommentCountChange) {
        onCommentCountChange(comments.length + 1);
      }
    } catch (err) {
      setError(err.message || 'Could not post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (typeof commentId === 'string' && commentId.startsWith('mock_c')) {
      setComments((prev) => prev.filter((c) => (c._id || c.id) !== commentId));
      if (onCommentCountChange) {
        onCommentCountChange(Math.max(0, comments.length - 1));
      }
      return;
    }
    try {
      await commentService.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => (c._id || c.id) !== commentId));
      if (onCommentCountChange) {
        onCommentCountChange(Math.max(0, comments.length - 1));
      }
    } catch (err) {
      console.warn('Could not delete comment:', err.message);
    }
  };

  return (
    <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-3">
      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-4 text-slate-400 gap-2 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          <span>Loading comments...</span>
        </div>
      ) : error ? (
        <div className="p-2 text-xs text-rose-500 text-center">{error}</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-3 text-xs text-slate-400">
          No comments yet. Start the conversation!
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {comments.map((comment) => (
            <CommentItem
              key={comment._id || comment.id}
              comment={comment}
              postOwnerId={postOwnerId}
              onDelete={handleDeleteComment}
              onNavigateToProfile={onNavigateToProfile}
            />
          ))}
        </div>
      )}

      {/* Add comment input */}
      <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2">
        <input
          type="text"
          placeholder={
            isAuthenticated
              ? 'Write a comment...'
              : 'Log in to join the discussion...'
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!isAuthenticated || isSubmitting}
          className={`flex-1 py-2 px-3.5 rounded-full text-xs outline-none transition-colors ${isDark
              ? 'bg-white/[0.05] text-white placeholder-slate-500 border border-white/10 focus:border-white/20'
              : 'bg-slate-100 text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-slate-300'
            } ${!isAuthenticated ? 'cursor-not-allowed opacity-60' : ''}`}
        />
        <button
          type="submit"
          disabled={!text.trim() || isSubmitting || !isAuthenticated}
          className={`p-2 rounded-full font-bold transition-all shadow-xs ${text.trim() && isAuthenticated && !isSubmitting
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
            }`}
          title="Send comment"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </form>
    </div>
  );
}
