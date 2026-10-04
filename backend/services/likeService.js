import mongoose from 'mongoose';
import Like from '../models/Like.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import notificationService from './notificationService.js';

class LikeService {
  async likePost(postId, userId) {
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      const err = new Error('Invalid post ID');
      err.statusCode = 400;
      throw err;
    }

    const post = await Post.findById(postId).select('author likesCount');
    if (!post) {
      throw new Error('Post not found');
    }

    try {
      await Like.create({ post: postId, user: userId });
    } catch (err) {
      // Ignore duplicate key error (user already liked this post)
      if (err.code !== 11000) {
        throw err;
      }
    }

    // Always compute like count based strictly on real users in Like collection
    const actualLikes = await Like.countDocuments({ post: postId });
    await Post.findByIdAndUpdate(postId, { likesCount: actualLikes });

    // Trigger notification if post author is not the liker
    if (post.author && post.author.toString() !== userId.toString()) {
      const liker = await User.findById(userId).select('name username');
      notificationService.createNotification({
        recipient: post.author,
        sender: userId,
        type: 'LIKE',
        title: 'New Like',
        message: `${liker?.name || 'Someone'} liked your post`,
        relatedPost: postId
      }).catch(e => console.warn('Like notification error:', e.message));
    }

    return {
      liked: true,
      isLiked: true,
      likesCount: actualLikes
    };
  }

  async unlikePost(postId, userId) {
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      const err = new Error('Invalid post ID');
      err.statusCode = 400;
      throw err;
    }

    await Like.findOneAndDelete({ post: postId, user: userId });

    // Always compute like count based strictly on real users in Like collection
    const actualLikes = await Like.countDocuments({ post: postId });
    await Post.findByIdAndUpdate(postId, { likesCount: actualLikes });

    return {
      liked: false,
      isLiked: false,
      likesCount: actualLikes
    };
  }

  async getLikers(postId) {
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return [];
    }

    const likes = await Like.find({ post: postId })
      .populate('user', 'name username profileImage')
      .sort({ createdAt: -1 })
      .lean();

    return likes.map((l) => l.user).filter(Boolean);
  }
}

export default new LikeService();
