import Story from '../models/Story.js';
import StoryView from '../models/StoryView.js';
import User from '../models/User.js';
import Follow from '../models/Follow.js';
import cloudinaryService from './cloudinaryService.js';

class StoryService {
  /**
   * Validate and sanitize file upload for story
   */
  validateMediaFile(file) {
    if (!file) {
      const err = new Error('Story media file (image or video) is required');
      err.statusCode = 400;
      throw err;
    }

    const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedVideoMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const isImage = allowedImageMimes.includes(file.mimetype);
    const isVideo = allowedVideoMimes.includes(file.mimetype);

    if (!isImage && !isVideo) {
      const err = new Error(
        'Unsupported file format. Stories support JPEG, PNG, WEBP images and MP4, WEBM, MOV videos.'
      );
      err.statusCode = 400;
      throw err;
    }

    // Check extension against malicious executable patterns
    const originalName = file.originalname ? file.originalname.toLowerCase() : '';
    const dangerousExtensions = ['.exe', '.bat', '.sh', '.php', '.js', '.vbs', '.py', '.msi'];
    if (dangerousExtensions.some((ext) => originalName.endsWith(ext))) {
      const err = new Error('Executable files are strictly forbidden');
      err.statusCode = 400;
      throw err;
    }

    // Size limit: 30MB for story uploads
    const maxSizeBytes = 30 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const err = new Error('File exceeds maximum story limit of 30MB');
      err.statusCode = 400;
      throw err;
    }

    return {
      resourceType: isVideo ? 'video' : 'image',
      mimetype: file.mimetype
    };
  }

  /**
   * Create a new story with 24-hour expiration
   */
  async createStory({ userId, caption, privacy = 'public', file }) {
    if (!userId) {
      const err = new Error('User authentication is required');
      err.statusCode = 401;
      throw err;
    }

    const user = await User.findById(userId);
    if (!user || user.accountStatus === 'BLOCKED') {
      const err = new Error('User not found or account is suspended');
      err.statusCode = 403;
      throw err;
    }

    const { resourceType, mimetype } = this.validateMediaFile(file);

    // Sanitize caption to protect against stored XSS
    let cleanCaption = '';
    if (caption && typeof caption === 'string') {
      cleanCaption = caption
        .replace(/<[^>]*>?/gm, '') // Strip HTML tags
        .trim()
        .slice(0, 200);
    }

    const validPrivacy = ['public', 'followers'].includes(privacy) ? privacy : 'public';

    // Upload media to Cloudinary
    let uploadResult;
    try {
      uploadResult = await cloudinaryService.uploadMedia(
        file.buffer,
        'socialx/stories',
        resourceType,
        mimetype
      );
    } catch (uploadErr) {
      const err = new Error(`Failed to upload story media: ${uploadErr.message}`);
      err.statusCode = 502;
      throw err;
    }

    // Calculate strict 24-hour expiration
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    try {
      const story = await Story.create({
        user: userId,
        mediaUrl: uploadResult.url,
        mediaPublicId: uploadResult.publicId,
        mediaType: resourceType,
        caption: cleanCaption,
        privacy: validPrivacy,
        expiresAt
      });

      return await Story.findById(story._id).populate(
        'user',
        'name username profileImage avatar'
      );
    } catch (dbErr) {
      // Consistency cleanup: delete uploaded media from Cloudinary if DB record fails
      if (uploadResult?.publicId) {
        await cloudinaryService.deleteMedia(uploadResult.publicId, resourceType).catch(() => {});
      }
      throw dbErr;
    }
  }

  /**
   * Retrieve active stories feed grouped by user
   */
  async getStoryFeed(currentUserId) {
    const now = new Date();

    const currentUser = await User.findById(currentUserId).select(
      'blockedUsers accountStatus'
    );
    if (!currentUser || currentUser.accountStatus === 'BLOCKED') {
      const err = new Error('Account suspended');
      err.statusCode = 403;
      throw err;
    }

    // 1. Get users current user follows
    const followDocs = await Follow.find({ follower: currentUserId }).select('following');
    const followingIds = followDocs.map((f) => f.following.toString());

    // 2. Identify blocked relationships (two-way protection)
    const myBlockedIds = (currentUser.blockedUsers || []).map((id) => id.toString());
    const blockedByOthersDocs = await User.find({ blockedUsers: currentUserId }).select('_id');
    const blockedByOtherIds = blockedByOthersDocs.map((doc) => doc._id.toString());
    const excludedUserIds = new Set([...myBlockedIds, ...blockedByOtherIds]);

    // 3. Query relevant active, non-expired stories (self + followed + public, non-blocked)
    const candidateUserIds = [currentUserId, ...followingIds];
    const activeStories = await Story.find({
      expiresAt: { $gt: now },
      user: { $nin: Array.from(excludedUserIds) },
      $or: [
        { user: { $in: candidateUserIds } },
        { privacy: 'public' }
      ]
    })
      .select('user mediaUrl mediaType caption privacy createdAt expiresAt')
      .populate('user', 'name username profileImage avatar accountStatus')
      .sort({ createdAt: 1 })
      .lean();

    // 4. Filter active stories respecting privacy and follow status
    const eligibleStories = activeStories.filter((story) => {
      if (!story.user || story.user.accountStatus === 'BLOCKED') return false;

      const authorId = story.user._id.toString();
      const isSelf = authorId === currentUserId.toString();
      const isFollowing = followingIds.includes(authorId);

      // Self stories are always eligible
      if (isSelf) return true;

      // Follower-only stories require active follow relationship
      if (story.privacy === 'followers') {
        return isFollowing;
      }

      // Public stories are eligible for followers or discoverable feed
      return isFollowing || story.privacy === 'public';
    });

    if (eligibleStories.length === 0) {
      return [];
    }

    // 5. Query user's view records for active stories
    const storyIds = eligibleStories.map((s) => s._id);
    const viewDocs = await StoryView.find({
      story: { $in: storyIds },
      viewer: currentUserId
    }).select('story');
    const viewedStoryIdSet = new Set(viewDocs.map((v) => v.story.toString()));

    // 6. Aggregate viewer counts for own stories
    const ownStoryIds = eligibleStories
      .filter((s) => s.user._id.toString() === currentUserId.toString())
      .map((s) => s._id);

    let viewCountsMap = new Map();
    if (ownStoryIds.length > 0) {
      const counts = await StoryView.aggregate([
        { $match: { story: { $in: ownStoryIds } } },
        { $group: { _id: '$story', count: { $sum: 1 } } }
      ]);
      viewCountsMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
    }

    // 7. Group active stories by author
    const groupsMap = new Map();

    for (const story of eligibleStories) {
      const authorId = story.user._id.toString();
      const isSelf = authorId === currentUserId.toString();
      const hasViewed = isSelf ? true : viewedStoryIdSet.has(story._id.toString());
      const viewersCount = isSelf ? viewCountsMap.get(story._id.toString()) || 0 : undefined;

      const formattedStory = {
        _id: story._id,
        id: story._id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        caption: story.caption,
        privacy: story.privacy,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        hasViewed,
        viewersCount
      };

      if (!groupsMap.has(authorId)) {
        groupsMap.set(authorId, {
          user: {
            _id: story.user._id,
            id: story.user._id,
            name: story.user.name,
            username: story.user.username,
            profileImage: story.user.profileImage,
            avatar: story.user.avatar
          },
          isSelf,
          hasUnviewed: false,
          latestCreatedAt: story.createdAt,
          stories: []
        });
      }

      const group = groupsMap.get(authorId);
      group.stories.push(formattedStory);

      // If any non-self story is unviewed, mark group hasUnviewed
      if (!isSelf && !hasViewed) {
        group.hasUnviewed = true;
      }
      if (new Date(story.createdAt) > new Date(group.latestCreatedAt)) {
        group.latestCreatedAt = story.createdAt;
      }
    }

    // 8. Order groups:
    // - Self stories first (if present)
    // - Users with unviewed stories next
    // - Users with all stories viewed last
    const userGroups = Array.from(groupsMap.values());
    userGroups.sort((a, b) => {
      if (a.isSelf) return -1;
      if (b.isSelf) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return new Date(b.latestCreatedAt) - new Date(a.latestCreatedAt);
    });

    return userGroups;
  }

  /**
   * Retrieve active stories for a specific user
   */
  async getUserStories(targetUserId, currentUserId = null) {
    const now = new Date();

    const targetUser = await User.findById(targetUserId).select(
      'name username profileImage avatar accountStatus blockedUsers'
    );
    if (!targetUser || targetUser.accountStatus === 'BLOCKED') {
      return { user: null, stories: [] };
    }

    // Check two-way blocking
    if (currentUserId) {
      const isTargetBlockedMe = (targetUser.blockedUsers || []).some(
        (id) => id.toString() === currentUserId.toString()
      );
      if (isTargetBlockedMe) {
        return { user: null, stories: [] };
      }

      const currentUser = await User.findById(currentUserId).select('blockedUsers');
      const isIBlockedTarget = (currentUser?.blockedUsers || []).some(
        (id) => id.toString() === targetUserId.toString()
      );
      if (isIBlockedTarget) {
        return { user: null, stories: [] };
      }
    }

    const isSelf = currentUserId && targetUserId.toString() === currentUserId.toString();

    // Check follow status for private follower-only stories
    let isFollowing = false;
    if (currentUserId && !isSelf) {
      const follow = await Follow.findOne({
        follower: currentUserId,
        following: targetUserId
      });
      isFollowing = !!follow;
    }

    const stories = await Story.find({
      user: targetUserId,
      expiresAt: { $gt: now }
    })
      .select('mediaUrl mediaType caption privacy createdAt expiresAt')
      .sort({ createdAt: 1 })
      .lean();

    const visibleStories = stories.filter((story) => {
      if (isSelf) return true;
      if (story.privacy === 'followers') return isFollowing;
      return true;
    });

    if (visibleStories.length === 0) {
      return {
        user: {
          _id: targetUser._id,
          id: targetUser._id,
          name: targetUser.name,
          username: targetUser.username,
          profileImage: targetUser.profileImage,
          avatar: targetUser.avatar
        },
        stories: [],
        hasUnviewed: false
      };
    }

    // Check view statuses
    let viewedStoryIdSet = new Set();
    if (currentUserId) {
      const views = await StoryView.find({
        story: { $in: visibleStories.map((s) => s._id) },
        viewer: currentUserId
      }).select('story');
      viewedStoryIdSet = new Set(views.map((v) => v.story.toString()));
    }

    let hasUnviewed = false;
    const formatted = visibleStories.map((story) => {
      const hasViewed = isSelf ? true : viewedStoryIdSet.has(story._id.toString());
      if (!isSelf && !hasViewed) hasUnviewed = true;

      return {
        _id: story._id,
        id: story._id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        caption: story.caption,
        privacy: story.privacy,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        hasViewed
      };
    });

    return {
      user: {
        _id: targetUser._id,
        id: targetUser._id,
        name: targetUser.name,
        username: targetUser.username,
        profileImage: targetUser.profileImage,
        avatar: targetUser.avatar
      },
      stories: formatted,
      hasUnviewed
    };
  }

  /**
   * Get single active story by ID
   */
  async getStoryById(storyId, currentUserId = null) {
    const now = new Date();
    const story = await Story.findOne({
      _id: storyId,
      expiresAt: { $gt: now }
    }).populate('user', 'name username profileImage avatar accountStatus blockedUsers');

    if (!story) {
      const err = new Error('Story not found or has expired');
      err.statusCode = 404;
      throw err;
    }

    if (story.user.accountStatus === 'BLOCKED') {
      const err = new Error('Story author account is suspended');
      err.statusCode = 403;
      throw err;
    }

    // Verify privacy & block restrictions
    const authorId = story.user._id.toString();
    const isSelf = currentUserId && authorId === currentUserId.toString();

    if (!isSelf && currentUserId) {
      // Check blocking
      if (
        (story.user.blockedUsers || []).some((id) => id.toString() === currentUserId.toString())
      ) {
        const err = new Error('Access denied');
        err.statusCode = 403;
        throw err;
      }

      if (story.privacy === 'followers') {
        const isFollowing = await Follow.exists({
          follower: currentUserId,
          following: authorId
        });
        if (!isFollowing) {
          const err = new Error('This story is restricted to followers only');
          err.statusCode = 403;
          throw err;
        }
      }
    } else if (!isSelf && !currentUserId && story.privacy === 'followers') {
      const err = new Error('Authentication required to view this follower story');
      err.statusCode = 401;
      throw err;
    }

    return story;
  }

  /**
   * Record a view for a story
   */
  async recordStoryView(storyId, viewerId) {
    const now = new Date();
    const story = await Story.findOne({
      _id: storyId,
      expiresAt: { $gt: now }
    }).populate('user', 'blockedUsers accountStatus');

    if (!story) {
      const err = new Error('Story not found or has expired');
      err.statusCode = 404;
      throw err;
    }

    // Do not count self-views
    if (story.user._id.toString() === viewerId.toString()) {
      return {
        success: true,
        message: 'Author self-view ignored',
        storyId
      };
    }

    // Check blocking
    if (
      (story.user.blockedUsers || []).some((id) => id.toString() === viewerId.toString())
    ) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }

    // Check privacy
    if (story.privacy === 'followers') {
      const isFollowing = await Follow.exists({
        follower: viewerId,
        following: story.user._id
      });
      if (!isFollowing) {
        const err = new Error('Not authorized to view follower-only story');
        err.statusCode = 403;
        throw err;
      }
    }

    // Upsert view record to prevent duplicate views
    await StoryView.findOneAndUpdate(
      { story: storyId, viewer: viewerId },
      { $setOnInsert: { viewedAt: new Date() } },
      { upsert: true, new: true }
    );

    return {
      success: true,
      message: 'View recorded',
      storyId
    };
  }

  /**
   * Delete a story (owner or administrator)
   */
  async deleteStory(storyId, currentUserId, userRole = 'USER') {
    const story = await Story.findById(storyId);
    if (!story) {
      const err = new Error('Story not found');
      err.statusCode = 404;
      throw err;
    }

    // Verify ownership or ADMIN role
    const isOwner = story.user.toString() === currentUserId.toString();
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      const err = new Error('Not authorized to delete this story');
      err.statusCode = 403;
      throw err;
    }

    // Delete DB story and view records
    await Story.findByIdAndDelete(storyId);
    await StoryView.deleteMany({ story: storyId });

    // Clean up Cloudinary asset
    if (story.mediaPublicId) {
      cloudinaryService
        .deleteMedia(story.mediaPublicId, story.mediaType)
        .catch((e) => console.warn(`Cloudinary deletion error for story ${storyId}:`, e.message));
    }

    return {
      success: true,
      message: 'Story deleted successfully',
      storyId
    };
  }

  /**
   * Retrieve viewers of a story (Story author only)
   */
  async getStoryViewers(storyId, currentUserId) {
    const story = await Story.findById(storyId);
    if (!story) {
      const err = new Error('Story not found');
      err.statusCode = 404;
      throw err;
    }

    // Strictly authorize: ONLY the author can see viewers
    if (story.user.toString() !== currentUserId.toString()) {
      const err = new Error('Access denied: Only the story owner can view story viewers');
      err.statusCode = 403;
      throw err;
    }

    const views = await StoryView.find({ story: storyId })
      .populate('viewer', 'name username profileImage avatar bio')
      .sort({ viewedAt: -1 });

    const viewers = views
      .filter((v) => v.viewer != null)
      .map((v) => ({
        id: v.viewer._id,
        _id: v.viewer._id,
        name: v.viewer.name,
        username: v.viewer.username,
        profileImage: v.viewer.profileImage,
        avatar: v.viewer.avatar,
        bio: v.viewer.bio,
        viewedAt: v.viewedAt
      }));

    return {
      total: viewers.length,
      viewers
    };
  }
}

export default new StoryService();
