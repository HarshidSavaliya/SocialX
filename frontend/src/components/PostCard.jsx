import React, { useState } from 'react';
import {
  MoreHorizontal,
  MessageCircle,
  Check,
  Share2,
  Edit3,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { postService } from '../services/postService';
import LikeButton from './LikeButton';
import CommentSection from './CommentSection';
import EditPostModal from './EditPostModal';
import ConfirmDialog from './ConfirmDialog';
import { formatRelativeTime } from '../utils/dateTime';

export default function PostCard({
  post,
  onPostUpdated,
  onPostDeleted,
  onNavigateToProfile,
  onHashtagClick
}) {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const postId = post._id || post.id;
  const authorId = post.author?._id || post.author?.id;
  const isOwner = user && authorId && (user.id === authorId || user._id === authorId);

  const handleDeletePost = async () => {
    setIsDeleting(true);
    try {
      await postService.deletePost(postId);
      setShowDeleteConfirm(false);
      if (onPostDeleted) {
        onPostDeleted(postId);
      }
    } catch (err) {
      alert(err.message || 'Could not delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText?.(window.location.origin + `#post-${postId}`);
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
      setShowMoreMenu(false);
    }, 1500);
  };

  const authorName = post.author?.name || 'SocialX Creator';
  const authorUsername = post.author?.username ? `@${post.author.username}` : '';
  const authorAvatar =
    post.author?.profileImage ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

  return (
    <article
      id={`post-${postId}`}
      className={`rounded-3xl transition-all duration-300 relative border group/card ${isDark
          ? 'bg-white/[0.04] border-white/[0.08] shadow-lg shadow-black/20 hover:border-white/[0.14]'
          : 'bg-white border-slate-200/80 shadow-xs hover:border-slate-300/80'
        }`}
    >
      {/* Post Top Header */}
      <div className="p-4 sm:p-5 pb-3 flex items-start justify-between gap-3">
        <div
          onClick={() => onNavigateToProfile && post.author?.username && onNavigateToProfile(post.author.username)}
          className="flex items-center gap-3 cursor-pointer group/author"
        >
          <img
            src={authorAvatar}
            alt={authorName}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-indigo-500/20 group-hover/author:ring-indigo-500 transition-all flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className={`text-xs sm:text-sm font-bold truncate transition-colors ${isDark ? 'text-white group-hover/author:text-indigo-400' : 'text-slate-900 group-hover/author:text-indigo-600'
                }`}>
                {authorName}
              </h4>
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>{authorUsername}</span>
              <span>•</span>
              <span>{formatRelativeTime(post.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* More Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            title="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMoreMenu && (
            <div
              className={`absolute right-0 mt-1 w-44 rounded-2xl py-1.5 z-30 shadow-xl border text-xs font-semibold ${isDark
                  ? 'bg-[#181a24] border-white/10 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-700'
                }`}
            >
              {isOwner ? (
                <>
                  <button
                    onClick={() => {
                      setShowEditModal(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-indigo-500/10 flex items-center justify-between transition-colors"
                  >
                    <span>Edit Post</span>
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-rose-500 hover:bg-rose-500/10 flex items-center justify-between transition-colors"
                  >
                    <span>Delete Post</span>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={handleCopyLink}
                  className="w-full text-left px-3.5 py-2 hover:bg-indigo-500/10 flex items-center justify-between transition-colors"
                >
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                  {copiedLink ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Caption & Hashtags */}
      <div className="px-4 sm:px-5 pb-3">
        {post.caption && (
          <p className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line font-normal">
            {post.caption}
          </p>
        )}

        {/* Clickable Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {post.hashtags.map((tag, idx) => (
              <button
                key={idx}
                onClick={() => onHashtagClick && onHashtagClick(tag)}
                className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-all ${isDark
                    ? 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/20'
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100'
                  }`}
              >
                {tag.startsWith('#') ? tag : `#${tag}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Media Presentation (Images & Videos from Cloudinary / Local) */}
      {post.mediaUrl && (
        <div className="px-4 sm:px-5 py-1">
          <div className="rounded-2xl overflow-hidden max-h-[460px] bg-black/10 dark:bg-black/30 border border-slate-200/60 dark:border-white/10 group/media">
            {post.mediaType === 'video' ? (
              <video
                src={post.mediaUrl}
                controls
                className="w-full max-h-[460px] object-contain rounded-2xl"
              />
            ) : (
              <img
                src={post.mediaUrl}
                alt="Post Media"
                className="w-full max-h-[460px] object-cover rounded-2xl transition-transform duration-500 group-hover/media:scale-101"
              />
            )}
          </div>
        </div>
      )}

      {/* Action Footer: Like, Comment, Share, Views */}
      <div className="px-4 sm:px-5 py-3 mt-1 flex items-center border-t border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Like Button */}
          <LikeButton
            postId={postId}
            initialHasLiked={post.hasLiked}
            initialLikesCount={post.likesCount || 0}
            onToggle={(hasLiked, count) => {
              if (onPostUpdated) {
                onPostUpdated({ ...post, hasLiked, likesCount: count });
              }
            }}
          />

          {/* Comment Button */}
          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-all duration-150 select-none ${showComments
                ? 'text-indigo-500'
                : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            title="Comments"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{commentsCount}</span>
          </button>

        </div>
      </div>

      {/* Expandable Comments Section */}
      {showComments && (
        <div className="px-4 sm:px-5 pb-4">
          <CommentSection
            postId={postId}
            postOwnerId={authorId}
            onCommentCountChange={(newCount) => {
              setCommentsCount(newCount);
              if (onPostUpdated) {
                onPostUpdated({ ...post, commentsCount: newCount });
              }
            }}
          />
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditModal && (
        <EditPostModal
          isOpen={showEditModal}
          post={post}
          onClose={() => setShowEditModal(false)}
          onPostUpdated={(updated) => {
            if (onPostUpdated) onPostUpdated(updated);
          }}
        />
      )}

      {/* Confirm Delete Dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Delete this post?"
          message="This post and all associated comments, likes, and media will be permanently deleted from SocialX."
          confirmText="Yes, Delete"
          isLoading={isDeleting}
          onConfirm={handleDeletePost}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </article>
  );
}
