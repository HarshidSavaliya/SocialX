import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatRelativeTime } from '../utils/dateTime';

export default function CommentItem({ comment, postOwnerId, onDelete }) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [isDeleting, setIsDeleting] = useState(false);

  // Author of comment OR owner of the post can delete
  const isCommentAuthor = user && (user.id === comment.author?._id || user.id === comment.author?.id);
  const isPostOwner = user && (user.id === postOwnerId || user._id === postOwnerId);
  const canDelete = isCommentAuthor || isPostOwner;

  const handleDelete = async () => {
    if (isDeleting) return;
    if (window.confirm('Delete this comment?')) {
      setIsDeleting(true);
      try {
        await onDelete(comment._id || comment.id);
      } catch (err) {
        alert(err.message || 'Could not delete comment');
        setIsDeleting(false);
      }
    }
  };

  const authorName = comment.author?.name || 'User';
  const authorUsername = comment.author?.username ? `@${comment.author.username}` : '';
  const authorAvatar =
    comment.author?.profileImage ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';

  return (
    <div className="flex gap-2.5 items-start text-xs group/comment">
      <img
        src={authorAvatar}
        alt={authorName}
        className="w-7 h-7 rounded-full object-cover mt-0.5 flex-shrink-0 ring-1 ring-slate-200 dark:ring-white/10"
      />
      <div
        className={`flex-1 p-3 rounded-2xl transition-all ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100/80'
          }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-900 dark:text-white">
              {authorName}
            </span>
            <span className="text-[10px] text-slate-400">{authorUsername}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">
              {formatRelativeTime(comment.createdAt)}
            </span>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="opacity-0 group-hover/comment:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-0.5"
                title="Delete comment"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <p className="text-slate-700 dark:text-slate-300 leading-normal whitespace-pre-line">
          {comment.text}
        </p>
      </div>
    </div>
  );
}
