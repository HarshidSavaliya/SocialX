import User from '../models/User.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Like from '../models/Like.js';
import Notification from '../models/Notification.js';
import AdminAction from '../models/AdminAction.js';
import cloudinaryService from './cloudinaryService.js';
import { getIO } from '../socket/socketServer.js';

class AdminService {
  /**
   * Aggregates real MongoDB statistics for the Admin Dashboard
   */
  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      totalPosts,
      recentUsers,
      recentPosts,
      recentActions
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ accountStatus: 'ACTIVE' }),
      User.countDocuments({ accountStatus: 'BLOCKED' }),
      Post.countDocuments(),
      User.find()
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Post.find()
        .populate('author', 'name username profileImage')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      AdminAction.find()
        .populate('admin', 'name username profileImage')
        .populate('targetUser', 'name username profileImage')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    return {
      stats: {
        totalUsers,
        activeUsers,
        blockedUsers,
        totalPosts
      },
      recentUsers,
      recentPosts,
      recentActions
    };
  }

  /**
   * Paginated user list with search and filter
   */
  async getUsers({ page = 1, limit = 20, search = '', status, role }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      query.$or = [
        { name: { $regex: cleanSearch, $options: 'i' } },
        { username: { $regex: cleanSearch, $options: 'i' } },
        { email: { $regex: cleanSearch, $options: 'i' } }
      ];
    }

    if (status && ['ACTIVE', 'BLOCKED'].includes(status.toUpperCase())) {
      query.accountStatus = status.toUpperCase();
    }

    if (role && ['USER', 'ADMIN'].includes(role.toUpperCase())) {
      query.role = role.toUpperCase();
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query)
    ]);

    return {
      users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1
      }
    };
  }

  /**
   * View details of a specific user
   */
  async getUserById(userId) {
    const user = await User.findById(userId).select('-password').lean();
    if (!user) {
      throw new Error('User not found');
    }

    const [recentPosts, recentActionsOnUser] = await Promise.all([
      Post.find({ author: userId }).sort({ createdAt: -1 }).limit(5).lean(),
      AdminAction.find({ targetUser: userId })
        .populate('admin', 'name username')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    return {
      user,
      recentPosts,
      recentActionsOnUser
    };
  }

  /**
   * Block a user and record audit log
   */
  async blockUser(userId, adminId, reason = 'Violating community guidelines') {
    if (userId.toString() === adminId.toString()) {
      throw new Error('Administrators cannot block their own account');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.accountStatus === 'BLOCKED') {
      throw new Error('This user account is already blocked');
    }

    user.accountStatus = 'BLOCKED';
    await user.save();

    // Log admin moderation audit
    await AdminAction.create({
      admin: adminId,
      actionType: 'BLOCK_USER',
      targetUser: user._id,
      description: `Blocked user @${user.username} (${user.email})`,
      details: { reason }
    });

    // Disconnect active socket sessions for this user
    try {
      const io = getIO();
      if (io) {
        io.in(`user:${user._id.toString()}`).emit('auth:blocked', {
          message: 'Your account has been suspended by an administrator.'
        });
        io.in(`user:${user._id.toString()}`).disconnectSockets(true);
      }
    } catch (sockErr) {
      console.warn('Socket disconnect error during block:', sockErr.message);
    }

    return {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus
    };
  }

  /**
   * Unblock a user and record audit log
   */
  async unblockUser(userId, adminId, reason = 'Account unblocked by administrator') {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.accountStatus === 'ACTIVE') {
      throw new Error('This user account is already active');
    }

    user.accountStatus = 'ACTIVE';
    await user.save();

    // Log admin moderation audit
    await AdminAction.create({
      admin: adminId,
      actionType: 'UNBLOCK_USER',
      targetUser: user._id,
      description: `Unblocked user @${user.username} (${user.email})`,
      details: { reason }
    });

    return {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus
    };
  }

  /**
   * Delete a harmful post and clean media + dependencies
   */
  async deleteHarmfulPost(postId, adminId, reason = 'Inappropriate or harmful content') {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found or already deleted');
    }

    const authorId = post.author;
    const author = await User.findById(authorId);

    // Delete media from Cloudinary if stored
    if (post.mediaPublicId) {
      await cloudinaryService.deleteMedia(post.mediaPublicId, post.mediaType);
    }

    // Clean up comments, likes, notifications associated with this post
    await Promise.all([
      Comment.deleteMany({ post: post._id }),
      Like.deleteMany({ post: post._id }),
      Notification.deleteMany({ post: post._id })
    ]);

    // Decrement post author's count
    if (author && author.postsCount > 0) {
      await User.findByIdAndUpdate(authorId, { $inc: { postsCount: -1 } });
    }

    // Record audit action before deleting
    await AdminAction.create({
      admin: adminId,
      actionType: 'DELETE_POST',
      targetUser: authorId,
      description: `Deleted harmful post (ID: ${post._id}) by @${author?.username || 'unknown'}`,
      details: {
        captionSnippet: post.caption?.substring(0, 150) || '',
        mediaType: post.mediaType,
        reason
      }
    });

    // Delete post document
    await Post.findByIdAndDelete(post._id);

    // Broadcast socket event if needed
    try {
      const io = getIO();
      if (io) {
        io.emit('post:deleted', { postId: post._id.toString() });
      }
    } catch (sockErr) {
      console.warn('Socket broadcast error during admin post delete:', sockErr.message);
    }

    return {
      success: true,
      message: 'Post and associated media successfully removed'
    };
  }

  /**
   * Fetch audit activity logs with pagination
   */
  async getAuditActions({ page = 1, limit = 20, actionType }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (actionType) {
      query.actionType = actionType;
    }

    const [actions, total] = await Promise.all([
      AdminAction.find(query)
        .populate('admin', 'name username email profileImage')
        .populate('targetUser', 'name username email profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AdminAction.countDocuments(query)
    ]);

    return {
      actions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1
      }
    };
  }
}

export default new AdminService();
