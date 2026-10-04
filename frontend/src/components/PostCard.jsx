import React, { useState } from 'react';
import {
  MoreHorizontal,
  MessageCircle,
  Check,
  Share2,
  Edit3,
  Trash2,
  ShieldCheck,
  Bookmark,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { postService } from '../services/postService';
import LikeButton from './LikeButton';
import CommentSection from './CommentSection';
import EditPostModal from './EditPostModal';
import ConfirmDialog from './ConfirmDialog';
import { formatRelativeTime } from '../utils/dateTime';
import { getUserAvatar, handleImageError } from '../utils/avatar';

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
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(() => Math.floor(Math.random() * 30) + 8);

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
  const authorAvatar = getUserAvatar(post.author);

  return (
    <article
      id={`post-${postId}`}
      className={`rounded-3xl transition-all duration-300 relative border group/card ${isDark
          ? 'bg-[#15131a]/90 backdrop-blur-xl border-white/[0.08] shadow-xl shadow-black/40 hover:border-amber-500/30'
          : 'bg-white border-stone-200/80 shadow-xs hover:border-stone-300/80'
        }`}
    >
      {/* Post Top Header */}
      <div className="p-4 sm:p-5 pb-3 flex items-start justify-between gap-3">
        <div
          onClick={() => {
            if (onNavigateToProfile) {
              const target = post.author?.username || post.author?.name || post.author?._id || post.author?.id || post.author;
              if (target) onNavigateToProfile(target);
            }
          }}
          className="flex items-center gap-3 cursor-pointer group/author"
        >
          <img
            src={authorAvatar}
            onError={(e) => handleImageError(e, authorName)}
            alt={authorName}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-amber-500/30 group-hover/author:ring-amber-400 transition-all flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className={`text-xs sm:text-sm font-extrabold truncate transition-colors ${isDark ? 'text-white group-hover/author:text-amber-400' : 'text-stone-900 group-hover/author:text-amber-600'
                }`}>
                {authorName}
              </h4>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 flex-shrink-0" />
            </div>

            <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-0.5">
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
            className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
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
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full transition-all ${isDark
                    ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/25'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
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
          <div className="rounded-2xl sm:rounded-3xl overflow-hidden max-h-[480px] bg-black/30 border border-white/10 group/media shadow-md">
            {post.mediaType === 'video' ? (
              <video
                src={post.mediaUrl}
                controls
                className="w-full max-h-[480px] object-contain rounded-2xl sm:rounded-3xl"
              />
            ) : (
              <img
                src={post.mediaUrl}
                alt="Post Media"
                className="w-full max-h-[480px] object-cover rounded-2xl sm:rounded-3xl transition-transform duration-500 group-hover/media:scale-101"
              />
            )}
          </div>
        </div>
      )}

      {/* Action Footer: Like, Comment, Bookmark, Share */}
      <div className="px-4 sm:px-5 py-3 mt-1 flex items-center justify-between border-t border-slate-100 dark:border-white/[0.06]">
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
                ? 'text-amber-400 font-bold'
                : isDark
                  ? 'text-stone-400 hover:text-white'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            title="Comments"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{commentsCount}</span>
          </button>

          {/* Bookmark Button (Matches reference image) */}
          <button
            onClick={() => {
              setIsBookmarked(!isBookmarked);
              setBookmarkCount((prev) => (isBookmarked ? prev - 1 : prev + 1));
            }}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-all duration-150 select-none ${isBookmarked
                ? 'text-amber-400 font-bold'
                : isDark
                  ? 'text-stone-400 hover:text-white'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            title={isBookmarked ? 'Saved to bookmarks' : 'Bookmark post'}
          >
            <Bookmark className={`w-4 h-4 transition-transform ${isBookmarked ? 'fill-amber-400 text-amber-400 scale-110' : ''}`} />
            <span>{bookmarkCount}</span>
          </button>
        </div>

        {/* Share Button */}
        <button
          onClick={handleCopyLink}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-all select-none ${
            copiedLink
              ? 'text-emerald-400 font-bold'
              : isDark
              ? 'text-stone-400 hover:text-white'
              : 'text-stone-600 hover:text-stone-900'
          }`}
          title="Share post link"
        >
          {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
        </button>
      </div>

      {/* Expandable Comments Section */}
      {showComments && (
        <div className="px-4 sm:px-5 pb-4">
          <CommentSection
            postId={postId}
            postOwnerId={authorId}
            onNavigateToProfile={onNavigateToProfile}
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
