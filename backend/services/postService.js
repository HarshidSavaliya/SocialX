import mongoose from 'mongoose';
import Post from '../models/Post.js';
import User from '../models/User.js';
import Like from '../models/Like.js';
import Comment from '../models/Comment.js';
import Share from '../models/Share.js';
import Save from '../models/Save.js';
import Follow from '../models/Follow.js';
import cloudinaryService from './cloudinaryService.js';

class PostService {
  /**
   * Normalizes an array or comma-separated string of hashtags
   */
  normalizeHashtags(input) {
    if (!input) return [];

    let rawTags = [];
    if (Array.isArray(input)) {
      rawTags = input;
    } else if (typeof input === 'string') {
      rawTags = input.split(/[,\s]+/).filter(Boolean);
    }

    const cleaned = rawTags
      .map((tag) => {
        let t = tag.trim().toLowerCase();
        if (t.startsWith('#')) t = t.substring(1);
        return t.replace(/[^a-z0-9_]/g, '');
      })
      .filter((t) => t.length > 0 && t.length <= 50)
      .map((t) => `#${t}`);

    return [...new Set(cleaned)];
  }

  /**
   * Encodes a composite cursor (createdAt + _id) into a safe base64 string
   */
  encodeCursor(doc) {
    if (!doc || !doc.createdAt || !doc._id) return null;
    const payload = {
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
      id: doc._id.toString()
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Decodes a base64 cursor string into { createdAt, id }
   */
  decodeCursor(cursorStr) {
    if (!cursorStr || typeof cursorStr !== 'string') return null;
    try {
      const decoded = Buffer.from(cursorStr, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (parsed.createdAt && parsed.id && mongoose.Types.ObjectId.isValid(parsed.id)) {
        return {
          createdAt: new Date(parsed.createdAt),
          id: new mongoose.Types.ObjectId(parsed.id)
        };
      }
      return null;
    } catch {
      // Fallback: If cursor is a legacy raw timestamp
      const fallbackDate = new Date(cursorStr);
      if (!isNaN(fallbackDate.getTime())) {
        return { createdAt: fallbackDate, id: null };
      }
      return null;
    }
  }

  /**
   * Creates a new Post or Reel.
   * Supports both direct Cloudinary client upload metadata and server buffer streaming.
   * Implements upload rollback cleanup if database save fails.
   */
  async createPost({
    authorId,
    caption,
    file,
    hashtags,
    visibility = 'public',
    directMedia = null
  }) {
    if (!authorId) {
      throw new Error('Author is required');
    }

    if ((!caption || !caption.trim()) && !file && !directMedia) {
      throw new Error('A post or reel must have a caption or media asset');
    }

    let mediaUrl = '';
    let mediaPublicId = '';
    let mediaType = 'none';
    let thumbnailUrl = '';
    let duration = 0;
    let width = 0;
    let height = 0;
    let format = '';
    let bytes = 0;

    let newlyUploadedAsset = null;

    try {
      // Branch A: Direct signed Cloudinary upload metadata supplied by frontend
      if (directMedia && directMedia.mediaUrl) {
        mediaUrl = directMedia.mediaUrl;
        mediaPublicId = directMedia.mediaPublicId || '';
        mediaType = directMedia.mediaType === 'video' ? 'video' : 'image';
        duration = Number(directMedia.duration) || 0;
        width = Number(directMedia.width) || 0;
        height = Number(directMedia.height) || 0;
        format = directMedia.format || '';
        bytes = Number(directMedia.bytes) || 0;

        if (mediaType === 'video') {
          thumbnailUrl = directMedia.thumbnailUrl || cloudinaryService.getVideoThumbnail(mediaUrl, mediaPublicId);
        } else {
          thumbnailUrl = mediaUrl;
        }
      }
      // Branch B: Multer binary file buffer streaming
      else if (file) {
        const isVideo = file.mimetype.startsWith('video/');
        const folder = isVideo ? 'socialx/reels' : 'socialx/posts';
        const resourceType = isVideo ? 'video' : 'image';

        const uploadResult = await cloudinaryService.uploadMedia(
          file.buffer,
          folder,
          resourceType,
          file.mimetype
        );

        newlyUploadedAsset = {
          publicId: uploadResult.publicId,
          resourceType: uploadResult.resourceType
        };

        mediaUrl = uploadResult.url;
        mediaPublicId = uploadResult.publicId;
        mediaType = uploadResult.resourceType === 'video' ? 'video' : 'image';
        thumbnailUrl = uploadResult.thumbnailUrl || (mediaType === 'video' ? cloudinaryService.getVideoThumbnail(mediaUrl, mediaPublicId) : mediaUrl);
        duration = uploadResult.duration || 0;
        width = uploadResult.width || 0;
        height = uploadResult.height || 0;
        format = uploadResult.format || '';
        bytes = uploadResult.bytes || 0;
      }

      const normalizedTags = this.normalizeHashtags(
        hashtags || (caption ? caption.match(/#[a-zA-Z0-9_]+/g) : [])
      );

      const post = await Post.create({
        author: authorId,
        caption: caption ? caption.trim() : '',
        mediaUrl,
        mediaPublicId,
        mediaType,
        thumbnailUrl,
        duration,
        width,
        height,
        format,
        bytes,
        visibility: ['public', 'followers', 'private'].includes(visibility) ? visibility : 'public',
        hashtags: normalizedTags
      });

      // Increment author's post count
      await User.findByIdAndUpdate(authorId, { $inc: { postsCount: 1 } });
      await post.populate('author', 'name username profileImage avatar');

      return {
        ...post.toObject(),
        hasLiked: false,
        isSaved: false
      };
    } catch (error) {
      // Rollback newly uploaded Cloudinary asset if database document creation failed
      if (newlyUploadedAsset && newlyUploadedAsset.publicId) {
        cloudinaryService.deleteMedia(
          newlyUploadedAsset.publicId,
          newlyUploadedAsset.resourceType
        ).catch((delErr) => console.warn('Cloudinary rollback error:', delErr.message));
      }
      throw error;
    }
  }

  async editPost({ postId, userId, caption, hashtags, file, visibility }) {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

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

    if (visibility && ['public', 'followers', 'private'].includes(visibility)) {
      post.visibility = visibility;
    }

    if (file) {
      if (post.mediaPublicId) {
        await cloudinaryService.deleteMedia(post.mediaPublicId, post.mediaType);
      }

      const isVideo = file.mimetype.startsWith('video/');
      const folder = isVideo ? 'socialx/reels' : 'socialx/posts';
      const resourceType = isVideo ? 'video' : 'image';

      const uploadResult = await cloudinaryService.uploadMedia(
        file.buffer,
        folder,
        resourceType,
        file.mimetype
      );

      post.mediaUrl = uploadResult.url;
      post.mediaPublicId = uploadResult.publicId;
      post.mediaType = uploadResult.resourceType === 'video' ? 'video' : 'image';
      post.thumbnailUrl = uploadResult.thumbnailUrl || (post.mediaType === 'video' ? cloudinaryService.getVideoThumbnail(post.mediaUrl, post.mediaPublicId) : post.mediaUrl);
      post.duration = uploadResult.duration || 0;
      post.width = uploadResult.width || 0;
      post.height = uploadResult.height || 0;
      post.format = uploadResult.format || '';
      post.bytes = uploadResult.bytes || 0;
    }

    await post.save();
    await post.populate('author', 'name username profileImage avatar');

    const [hasLiked, isSaved] = await Promise.all([
      Like.exists({ post: post._id, user: userId }),
      Save.exists({ post: post._id, user: userId })
    ]);

    return {
      ...post.toObject(),
      hasLiked: !!hasLiked,
      isSaved: !!isSaved
    };
  }

  async deletePost({ postId, userId }) {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    if (post.author.toString() !== userId.toString()) {
      const error = new Error('Not authorized to delete this post');
      error.statusCode = 403;
      throw error;
    }

    // 1. Delete Cloudinary media resource
    if (post.mediaPublicId) {
      await cloudinaryService.deleteMedia(post.mediaPublicId, post.mediaType);
    }

    // 2. Cascade delete all social associations: Comments, Likes, Shares, Saves
    await Promise.all([
      Comment.deleteMany({ post: post._id }),
      Like.deleteMany({ post: post._id }),
      Share.deleteMany({ post: post._id }),
      Save.deleteMany({ post: post._id }),
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

    return { success: true, message: 'Post and associated assets deleted successfully' };
  }

  async getPostById(postId, currentUserId = null) {
    const post = await Post.findById(postId)
      .populate('author', 'name username profileImage avatar')
      .lean();

    if (!post) {
      throw new Error('Post not found');
    }

    const [hasLikedDoc, isSavedDoc] = await Promise.all([
      currentUserId ? Like.exists({ post: post._id, user: currentUserId }) : false,
      currentUserId ? Save.exists({ post: post._id, user: currentUserId }) : false
    ]);

    return {
      ...post,
      hasLiked: !!hasLikedDoc,
      isSaved: !!isSavedDoc
    };
  }

  /**
   * High-efficiency feed retrieval supporting both Reels and General Feed.
   *
   * Improvements:
   * 1. mediaType === 'video' as canonical source of truth (NO regex).
   * 2. Composite cursor pagination ({ createdAt, _id }) eliminating skipping/duplicates.
   * 3. Two-way block filtering and accountStatus exclusion.
   * 4. Visibility enforcement (public, followers, private).
   * 5. No Like.aggregate() or countDocuments() overhead for infinite reels.
   * 6. Uses indexed Post.likesCount directly.
   */
  async getFeed({ currentUserId = null, cursor = null, limit = 8, filter = 'all' }) {
    const isReels = filter === 'reels';

    // Limit enforcement: 6 to 10 for reels (default 8), 10 to 25 for feed (default 10)
    const minLimit = 1;
    const maxLimit = isReels ? 10 : 25;
    const parsedLimit = parseInt(limit, 10);
    const limitNum = isNaN(parsedLimit)
      ? (isReels ? 8 : 10)
      : Math.max(minLimit, Math.min(maxLimit, parsedLimit));

    let query = {};

    // 1. Reels filter canonical source of truth
    if (isReels) {
      query.mediaType = 'video';
    }

    // 2. Block and Account Status Filtering
    let excludedUserIds = new Set();
    let followedIds = [];

    if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
      const currentUser = await User.findById(currentUserId)
        .select('blockedUsers accountStatus')
        .lean();

      if (currentUser) {
        // Blocked users list (current user blocked them)
        const myBlocked = (currentUser.blockedUsers || []).map((id) => id.toString());

        // Users who blocked the current user
        const blockedByOthers = await User.find({ blockedUsers: currentUserId })
          .select('_id')
          .lean();
        const otherBlocked = blockedByOthers.map((u) => u._id.toString());

        myBlocked.forEach((id) => excludedUserIds.add(id));
        otherBlocked.forEach((id) => excludedUserIds.add(id));
      }

      // Users the current user follows
      const followDocs = await Follow.find({ follower: currentUserId })
        .select('following')
        .lean();
      followedIds = followDocs.map((f) => f.following);

      // Friends filter
      if (filter === 'friends') {
        query.author = { $in: followedIds };
      }
    }

    // Exclude blocked users from the results
    if (excludedUserIds.size > 0) {
      query.author = {
        ...(query.author || {}),
        $nin: Array.from(excludedUserIds).map((id) => new mongoose.Types.ObjectId(id))
      };
    }

    // 3. Privacy / Visibility Rules
    if (!currentUserId) {
      // Guests only see public content
      query.visibility = 'public';
    } else {
      // Authenticated users: see public, their own, or followed-only if following author
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { visibility: 'public' },
          { visibility: { $exists: false } }, // Backwards compatibility for existing posts
          { author: currentUserId },
          { visibility: 'followers', author: { $in: followedIds } }
        ]
      });
    }

    // 4. Composite Cursor Filtering ({ createdAt, _id })
    const cursorData = this.decodeCursor(cursor);
    if (cursorData) {
      if (cursorData.id) {
        query.$or = [
          { createdAt: { $lt: cursorData.createdAt } },
          {
            createdAt: cursorData.createdAt,
            _id: { $lt: cursorData.id }
          }
        ];
      } else {
        query.createdAt = { $lt: cursorData.createdAt };
      }
    }

    // 5. Fetch 1 extra item to check if next page exists without countDocuments()
    const posts = await Post.find(query)
      .select(
        'author caption mediaUrl mediaPublicId mediaType thumbnailUrl duration width height format bytes hashtags likesCount commentsCount sharesCount views createdAt updatedAt'
      )
      .sort({ createdAt: -1, _id: -1 })
      .limit(limitNum + 1)
      .populate('author', 'name username profileImage avatar accountStatus')
      .lean();

    // Exclude posts whose author is BLOCKED or deleted
    const validPosts = posts.filter(
      (p) => p.author && p.author.accountStatus !== 'BLOCKED'
    );

    const hasMore = validPosts.length > limitNum;
    const pagedPosts = hasMore ? validPosts.slice(0, limitNum) : validPosts;

    // 6. User Specific States (hasLiked, isSaved) in single batch queries
    let userLikedPostIds = new Set();
    let userSavedPostIds = new Set();

    if (currentUserId && pagedPosts.length > 0) {
      const postIds = pagedPosts.map((p) => p._id);
      const [userLikes, userSaves] = await Promise.all([
        Like.find({ post: { $in: postIds }, user: currentUserId }).select('post').lean(),
        Save.find({ post: { $in: postIds }, user: currentUserId }).select('post').lean()
      ]);

      userLikedPostIds = new Set(userLikes.map((l) => l.post.toString()));
      userSavedPostIds = new Set(userSaves.map((s) => s.post.toString()));
    }

    const enhancedPosts = pagedPosts.map((post) => ({
      ...post,
      hasLiked: userLikedPostIds.has(post._id.toString()),
      isSaved: userSavedPostIds.has(post._id.toString()),
      likesCount: Math.max(0, post.likesCount || 0),
      commentsCount: Math.max(0, post.commentsCount || 0),
      sharesCount: Math.max(0, post.sharesCount || 0),
      views: Math.max(0, post.views || 0)
    }));

    const nextCursor =
      hasMore && enhancedPosts.length > 0
        ? this.encodeCursor(enhancedPosts[enhancedPosts.length - 1])
        : null;

    return {
      items: enhancedPosts,
      posts: enhancedPosts, // Backward compatibility
      nextCursor,
      hasMore,
      pagination: {
        hasNextPage: hasMore,
        nextCursor,
        limit: limitNum
      }
    };
  }

  /**
   * Controlled Reel/Post View Tracking
   * Threshold: Called after >= 2 seconds playback.
   * Atomically increments total views on the Post document.
   */
  async recordView(postId) {
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      throw new Error('Invalid post ID');
    }

    const updated = await Post.findByIdAndUpdate(
      postId,
      { $inc: { views: 1 } },
      { new: true, select: 'views' }
    );

    return {
      success: true,
      views: updated ? updated.views : 0
    };
  }

  /**
   * Bookmark / Save Post or Reel
   */
  async savePost(postId, userId) {
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      throw new Error('Invalid post ID');
    }

    try {
      await Save.create({ user: userId, post: postId });
    } catch (err) {
      if (err.code !== 11000) throw err; // Ignore duplicate save
    }

    return { isSaved: true, message: 'Saved to your collection' };
  }

  /**
   * Remove Bookmark / Unsave Post or Reel
   */
  async unsavePost(postId, userId) {
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      throw new Error('Invalid post ID');
    }

    await Save.findOneAndDelete({ user: userId, post: postId });
    return { isSaved: false, message: 'Removed from saved collection' };
  }

  async getUserPosts(username, currentUserId = null, page = 1, limit = 10) {
    if (!username) {
      throw new Error('Username or user ID is required');
    }
    let cleanInput = username.toString().trim().replace(/^@+/, '');
    try {
      cleanInput = decodeURIComponent(cleanInput).trim().replace(/^@+/, '');
    } catch {}

    let user = null;
    if (currentUserId && ['me', 'profile', 'self', 'my'].includes(cleanInput.toLowerCase())) {
      user = await User.findById(currentUserId).select('_id').lean();
    }

    if (!user) {
      const escaped = cleanInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      user = await User.findOne({
        $or: [
          { username: { $regex: new RegExp(`^${escaped}$`, 'i') } },
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
        .select(
          'author caption mediaUrl mediaPublicId mediaType thumbnailUrl duration width height format bytes hashtags likesCount commentsCount sharesCount views createdAt updatedAt'
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('author', 'name username profileImage avatar')
        .lean(),
      Post.countDocuments({ author: user._id })
    ]);

    let userLikedPostIds = new Set();
    let userSavedPostIds = new Set();

    if (currentUserId && posts.length > 0) {
      const postIds = posts.map((p) => p._id);
      const [userLikes, userSaves] = await Promise.all([
        Like.find({ post: { $in: postIds }, user: currentUserId }).select('post').lean(),
        Save.find({ post: { $in: postIds }, user: currentUserId }).select('post').lean()
      ]);
      userLikedPostIds = new Set(userLikes.map((l) => l.post.toString()));
      userSavedPostIds = new Set(userSaves.map((s) => s.post.toString()));
    }

    const enhancedPosts = posts.map((post) => ({
      ...post,
      hasLiked: userLikedPostIds.has(post._id.toString()),
      isSaved: userSavedPostIds.has(post._id.toString())
    }));

    return {
      posts: enhancedPosts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum)
      }
    };
  }
}

export default new PostService();
