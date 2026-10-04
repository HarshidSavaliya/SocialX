import mongoose from 'mongoose';
import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import notificationService from './notificationService.js';

class CommentService {
  async addComment({ postId, authorId, text }) {
    if (!text || !text.trim()) {
      throw new Error('Comment text cannot be empty');
    }

    if (text.trim().length > 1000) {
      throw new Error('Comment cannot exceed 1000 characters');
    }

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      const err = new Error('Invalid post ID');
      err.statusCode = 400;
      throw err;
    }

    const post = await Post.findById(postId).select('author');
    if (!post) {
      throw new Error('Post not found');
    }

    const comment = await Comment.create({
      post: postId,
      author: authorId,
      text: text.trim()
    });

    // Increment post's commentsCount
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    await comment.populate('author', 'name username profileImage');

    // Trigger notification if post author is not the commenter
    if (post.author && post.author.toString() !== authorId.toString()) {
      const commenterName = comment.author?.name || 'Someone';
      const snippet = text.trim().length > 50 ? `${text.trim().substring(0, 47)}...` : text.trim();
      notificationService.createNotification({
        recipient: post.author,
        sender: authorId,
        type: 'COMMENT',
        title: 'New Comment',
        message: `${commenterName} commented: "${snippet}"`,
        relatedPost: postId
      }).catch(e => console.warn('Comment notification error:', e.message));
    }

    return comment;
  }

  async deleteComment({ commentId, userId }) {
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      const err = new Error('Invalid comment ID');
      err.statusCode = 400;
      throw err;
    }

    const comment = await Comment.findById(commentId).select('author post');
    if (!comment) {
      throw new Error('Comment not found');
    }

    const post = await Post.findById(comment.post).select('author');
    if (!post) {
      throw new Error('Post not found');
    }

    // Authorization: Either the comment author or the post owner can delete
    const isCommentAuthor = comment.author.toString() === userId.toString();
    const isPostOwner = post.author.toString() === userId.toString();

    if (!isCommentAuthor && !isPostOwner) {
      const error = new Error('Not authorized to delete this comment');
      error.statusCode = 403;
      throw error;
    }

    await comment.deleteOne();

    // Decrement post commentsCount safely
    await Post.findByIdAndUpdate(comment.post, [
      {
        $set: {
          commentsCount: {
            $max: [0, { $subtract: ['$commentsCount', 1] }]
          }
        }
      }
    ]);

    return { success: true, message: 'Comment deleted successfully' };
  }

  async getCommentsByPost(postId) {
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return [];
    }

    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: 1 })
      .populate('author', 'name username profileImage')
      .lean();

    return comments;
  }
}

export default new CommentService();
