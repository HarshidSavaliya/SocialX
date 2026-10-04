import mongoose from 'mongoose';
import Like from '../models/Like.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import notificationService from './notificationService.js';

class LikeService {
  /**
   * Idempotent like operation
   * Atomically increments Post.likesCount only if a new Like document is inserted.
   */
  async likePost(postId, userId) {
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      const err = new Error('Invalid post ID');
      err.statusCode = 400;
      throw err;
    }

    const post = await Post.findById(postId).select('author likesCount');
    if (!post) {
      const err = new Error('Post not found');
      err.statusCode = 404;
      throw err;
    }

    let isNewLike = false;
    try {
      await Like.create({ post: postId, user: userId });
      isNewLike = true;
    } catch (err) {
      // Ignore unique compound index duplicate (11000)
      if (err.code !== 11000) {
        throw err;
      }
    }

    let currentLikesCount = post.likesCount || 0;

    // Atomically increment if newly created
    if (isNewLike) {
      const updated = await Post.findByIdAndUpdate(
        postId,
        { $inc: { likesCount: 1 } },
        { new: true, select: 'likesCount' }
      );
      currentLikesCount = updated ? updated.likesCount : currentLikesCount + 1;

      // Trigger notification to author (fire-and-forget, non-blocking)
      if (post.author && post.author.toString() !== userId.toString()) {
        User.findById(userId)
          .select('name username')
          .then((liker) => {
            notificationService
              .createNotification({
                recipient: post.author,
                sender: userId,
                type: 'LIKE',
                title: 'New Like',
                message: `${liker?.name || 'Someone'} liked your post`,
                relatedPost: postId
              })
              .catch((e) => console.warn('Like notification error:', e.message));
          })
          .catch(() => {});
      }
    }

    return {
      liked: true,
      isLiked: true,
      likesCount: Math.max(0, currentLikesCount)
    };
  }

  /**
   * Idempotent unlike operation
   * Atomically decrements Post.likesCount only if an existing Like was removed.
   * Ensures likesCount never falls below 0.
   */
  async unlikePost(postId, userId) {
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      const err = new Error('Invalid post ID');
      err.statusCode = 400;
      throw err;
    }

    const deleted = await Like.findOneAndDelete({ post: postId, user: userId });

    let currentLikesCount = 0;
    if (deleted) {
      const updated = await Post.findByIdAndUpdate(
        postId,
        [
          {
            $set: {
              likesCount: {
                $max: [0, { $subtract: ['$likesCount', 1] }]
              }
            }
          }
        ],
        { new: true }
      );
      currentLikesCount = updated ? updated.likesCount : 0;
    } else {
      const post = await Post.findById(postId).select('likesCount');
      currentLikesCount = post ? post.likesCount : 0;
    }

    return {
      liked: false,
      isLiked: false,
      likesCount: Math.max(0, currentLikesCount)
    };
  }

  async getLikers(postId) {
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return [];
    }

    const likes = await Like.find({ post: postId })
      .populate('user', 'name username profileImage avatar')
      .sort({ createdAt: -1 })
      .lean();

    return likes.map((l) => l.user).filter(Boolean);
  }
}

export default new LikeService();
