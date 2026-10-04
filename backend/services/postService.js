import mongoose from 'mongoose';
import Post from '../models/Post.js';
import User from '../models/User.js';
import Like from '../models/Like.js';
import Comment from '../models/Comment.js';
import Share from '../models/Share.js';
import Follow from '../models/Follow.js';
import cloudinaryService from './cloudinaryService.js';

class PostService {
  /**
   * Normalizes an array or comma-separated string of hashtags
   * Ensures lowercase, stripped of unnecessary symbols, unique.
   */
  normalizeHashtags(input) {
    if (!input) return [];

    let rawTags = [];
    if (Array.isArray(input)) {
      rawTags = input;
    } else if (typeof input === 'string') {
      // Find all words with or without #
      rawTags = input.split(/[,\s]+/).filter(Boolean);
    }

    const cleaned = rawTags
      .map(tag => {
        let t = tag.trim().toLowerCase();
        if (t.startsWith('#')) t = t.substring(1);
        return t.replace(/[^a-z0-9_]/g, '');
      })
      .filter(t => t.length > 0 && t.length <= 50)
      .map(t => `#${t}`);

    // Return deduplicated array
    return [...new Set(cleaned)];
  }

  async createPost({ authorId, caption, file, hashtags }) {
    if (!authorId) {
      throw new Error('Author is required');
    }

    if ((!caption || !caption.trim()) && !file) {
      throw new Error('A post must have a caption or media file');
    }

    let mediaUrl = '';
    let mediaPublicId = '';
    let mediaType = 'none';

    if (file) {
      const isVideo = file.mimetype.startsWith('video/');
      const resourceType = isVideo ? 'video' : 'image';

      const uploadResult = await cloudinaryService.uploadMedia(
        file.buffer,
        'socialx/posts',
        resourceType,
        file.mimetype
      );

      mediaUrl = uploadResult.url;
      mediaPublicId = uploadResult.publicId;
      mediaType = uploadResult.resourceType === 'video' ? 'video' : 'image';
    }

    const normalizedTags = this.normalizeHashtags(hashtags || (caption ? caption.match(/#[a-zA-Z0-9_]+/g) : []));

    const post = await Post.create({
      author: authorId,
      caption: caption ? caption.trim() : '',
      mediaUrl,
      mediaPublicId,
      mediaType,
      hashtags: normalizedTags
    });

    // Increment user's posts count
    await User.findByIdAndUpdate(authorId, { $inc: { postsCount: 1 } });

    // Populate author details
    await post.populate('author', 'name username profileImage');

    return {
      ...post.toObject(),
      hasLiked: false
    };
  }

  async editPost({ postId, userId, caption, hashtags, file }) {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Verify ownership
    if (post.author.toString() !== userId.toString()) {
      const error = new Error('Not authorized to edit this post');
      error.statusCode = 403;
      throw error;
    }

    if (caption !== undefined) {
      post.caption = caption.trim();
    }

    if (hashtags !== undefined) {
      post.hashtags = this.normalizeHashtags(hashtags);
    }

    // Replace media if new file is supplied
    if (file) {
      // Clean up previous Cloudinary asset if it exists
      if (post.mediaPublicId) {
        await cloudinaryService.deleteMedia(post.mediaPublicId, post.mediaType);
      }

      const isVideo = file.mimetype.startsWith('video/');
      const resourceType = isVideo ? 'video' : 'image';

      const uploadResult = await cloudinaryService.uploadMedia(
        file.buffer,
        'socialx/posts',
        resourceType,
        file.mimetype
      );

      post.mediaUrl = uploadResult.url;
      post.mediaPublicId = uploadResult.publicId;
      post.mediaType = uploadResult.resourceType === 'video' ? 'video' : 'image';
    }

    await post.save();
    await post.populate('author', 'name username profileImage');

    const hasLiked = await Like.exists({ post: post._id, user: userId });

    return {
      ...post.toObject(),
      hasLiked: !!hasLiked
    };
  }

  async deletePost({ postId, userId }) {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Verify ownership
    if (post.author.toString() !== userId.toString()) {
      const error = new Error('Not authorized to delete this post');
      error.statusCode = 403;
      throw error;
    }

    // 1. Clean up Cloudinary asset
    if (post.mediaPublicId) {
      await cloudinaryService.deleteMedia(post.mediaPublicId, post.mediaType);
    }

    // 2. Cascade delete related documents
    await Promise.all([
      Comment.deleteMany({ post: post._id }),
      Like.deleteMany({ post: post._id }),
      Share.deleteMany({ post: post._id }),
      User.findByIdAndUpdate(post.author, [
        {
          $set: {
            postsCount: {
              $max: [0, { $subtract: ['$postsCount', 1] }]
            }
          }
        }
      ])
    ]);

    // 3. Delete the post itself
    await post.deleteOne();

    return { success: true, message: 'Post and associated data deleted successfully' };
  }

  async getPostById(postId, currentUserId = null) {
    const post = await Post.findById(postId)
      .populate('author', 'name username profileImage')
      .lean();

    if (!post) {
      throw new Error('Post not found');
    }

    const [actualLikes, likeExists] = await Promise.all([
      Like.countDocuments({ post: post._id }),
      currentUserId ? Like.exists({ post: post._id, user: currentUserId }) : false
    ]);

    return {
      ...post,
      likesCount: actualLikes,
      hasLiked: !!likeExists
    };
  }

  async getFeed({ currentUserId, page = 1, limit = 10, filter = 'all', cursor = null }) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
    const skip = cursor ? 0 : (pageNum - 1) * limitNum;

    let query = {};

    if (currentUserId) {
      if (filter === 'friends') {
        // Only posts from followed users
        const followingDocs = await Follow.find({ follower: currentUserId }).select('following').lean();
        const followedIds = followingDocs.map(f => f.following);
        query = { author: { $in: followedIds } };
      }
    }

    if (filter === 'reels') {
      query.$or = [
        { mediaType: 'video' },
        { mediaUrl: { $regex: /\.(mp4|webm|mov)/i } }
      ];
    }

    // Cursor-based pagination support for deep feed queries
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .select('author caption mediaUrl mediaPublicId mediaType hashtags likesCount commentsCount sharesCount createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('author', 'name username profileImage')
        .lean(),
      cursor ? null : Post.countDocuments(query)
    ]);

    // Compute hasLiked state and accurate real user likesCount
    let userLikedPostIds = new Set();
    const postLikesMap = new Map();

    if (posts.length > 0) {
      const postIds = posts.map(p => p._id);
      const [userLikes, likeCounts] = await Promise.all([
        currentUserId
          ? Like.find({ post: { $in: postIds }, user: currentUserId }).select('post').lean()
          : [],
        Like.aggregate([
          { $match: { post: { $in: postIds } } },
          { $group: { _id: '$post', count: { $sum: 1 } } }
        ])
      ]);

      userLikedPostIds = new Set(userLikes.map(l => l.post.toString()));
      likeCounts.forEach(lc => postLikesMap.set(lc._id.toString(), lc.count));
    }

    const enhancedPosts = posts.map(post => ({
      ...post,
      likesCount: postLikesMap.get(post._id.toString()) ?? 0,
      hasLiked: userLikedPostIds.has(post._id.toString())
    }));

    const nextCursor = enhancedPosts.length > 0 ? enhancedPosts[enhancedPosts.length - 1].createdAt : null;
    const totalPages = total !== null ? Math.ceil(total / limitNum) : null;

    return {
      posts: enhancedPosts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total !== null ? total : enhancedPosts.length,
        totalPages: totalPages !== null ? totalPages : 1,
        hasNextPage: totalPages !== null ? pageNum < totalPages : enhancedPosts.length === limitNum,
        nextCursor
      }
    };
  }

  async getUserPosts(username, currentUserId = null, page = 1, limit = 10) {
    if (!username) {
      throw new Error('Username or user ID is required');
    }
    let cleanInput = username.toString().trim().replace(/^@+/, '');
    try {
      cleanInput = decodeURIComponent(cleanInput).trim().replace(/^@+/, '');
    } catch (e) {}

    let user = null;

    if (currentUserId && ['me', 'profile', 'self', 'my'].includes(cleanInput.toLowerCase())) {
      user = await User.findById(currentUserId).select('_id').lean();
    }

    if (!user) {
      const escaped = cleanInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const compactEscaped = escaped.replace(/\s+/g, '');

      user = await User.findOne({
        $or: [
          { username: { $regex: new RegExp(`^${escaped}$`, 'i') } },
          { username: { $regex: new RegExp(`^${compactEscaped}$`, 'i') } },
          { name: { $regex: new RegExp(`^${escaped}$`, 'i') } }
        ]
      }).select('_id').lean();
    }

    if (!user && mongoose.Types.ObjectId.isValid(cleanInput)) {
      user = await User.findById(cleanInput).select('_id').lean();
    }

    if (!user) {
      throw new Error('User not found');
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [posts, total] = await Promise.all([
      Post.find({ author: user._id })
        .select('author caption mediaUrl mediaPublicId mediaType hashtags likesCount commentsCount sharesCount createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('author', 'name username profileImage')
        .lean(),
      Post.countDocuments({ author: user._id })
    ]);

    let userLikedPostIds = new Set();
    const postLikesMap = new Map();

    if (posts.length > 0) {
      const postIds = posts.map(p => p._id);
      const [userLikes, likeCounts] = await Promise.all([
        currentUserId
          ? Like.find({ post: { $in: postIds }, user: currentUserId }).select('post').lean()
          : [],
        Like.aggregate([
          { $match: { post: { $in: postIds } } },
          { $group: { _id: '$post', count: { $sum: 1 } } }
        ])
      ]);

      userLikedPostIds = new Set(userLikes.map(l => l.post.toString()));
      likeCounts.forEach(lc => postLikesMap.set(lc._id.toString(), lc.count));
    }

    const enhancedPosts = posts.map(post => ({
      ...post,
      likesCount: postLikesMap.get(post._id.toString()) ?? 0,
      hasLiked: userLikedPostIds.has(post._id.toString())
    }));

    const totalPages = Math.ceil(total / limitNum);

    return {
      posts: enhancedPosts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages
      }
    };
  }
}

export default new PostService();
