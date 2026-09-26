import Like from '../models/Like.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import notificationService from './notificationService.js';

class LikeService {
  async likePost(postId, userId) {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    const existingLike = await Like.findOne({ post: postId, user: userId });
    if (existingLike) {
      return {
        liked: true,
        likesCount: post.likesCount
      };
    }

    try {
      await Like.create({ post: postId, user: userId });
      const updatedPost = await Post.findByIdAndUpdate(
        postId,
        { $inc: { likesCount: 1 } },
        { new: true }
      );

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
        likesCount: updatedPost.likesCount
      };
    } catch (err) {
      // Catch potential race-condition duplicate key error
      if (err.code === 11000) {
        const currentPost = await Post.findById(postId);
        return {
          liked: true,
          likesCount: currentPost.likesCount
        };
      }
      throw err;
    }
  }

  async unlikePost(postId, userId) {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    const deletedLike = await Like.findOneAndDelete({ post: postId, user: userId });

    if (!deletedLike) {
      return {
        liked: false,
        likesCount: post.likesCount
      };
    }

    // Atomically decrement likesCount, ensuring it does not drop below 0
    const updatedPost = await Post.findByIdAndUpdate(
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

    return {
      liked: false,
      likesCount: updatedPost ? updatedPost.likesCount : 0
    };
  }
}

export default new LikeService();
