import Follow from '../models/Follow.js';
import User from '../models/User.js';
import notificationService from './notificationService.js';

class FollowService {
  async followUser(followerId, targetUserId) {
    if (followerId.toString() === targetUserId.toString()) {
      const error = new Error('You cannot follow yourself');
      error.statusCode = 400;
      throw error;
    }

    const targetUser = await User.findById(targetUserId).select('followersCount');
    if (!targetUser) {
      throw new Error('User not found');
    }

    try {
      await Follow.create({
        follower: followerId,
        following: targetUserId
      });

      // Update counters atomically and get updated target user in a single batch
      const [, updatedTarget] = await Promise.all([
        User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }),
        User.findByIdAndUpdate(
          targetUserId,
          { $inc: { followersCount: 1 } },
          { new: true }
        ).select('followersCount')
      ]);

      // Trigger follow notification
      const follower = await User.findById(followerId).select('name username');
      notificationService.createNotification({
        recipient: targetUserId,
        sender: followerId,
        type: 'FOLLOW',
        title: 'New Follower',
        message: `${follower?.name || 'Someone'} started following you`,
        relatedUser: followerId
      }).catch(e => console.warn('Follow notification error:', e.message));

      return {
        following: true,
        message: 'User followed successfully',
        followersCount: updatedTarget ? updatedTarget.followersCount : targetUser.followersCount + 1
      };
    } catch (err) {
      if (err.code === 11000) {
        return {
          following: true,
          message: 'Already following this user',
          followersCount: targetUser.followersCount
        };
      }
      throw err;
    }
  }

  async unfollowUser(followerId, targetUserId) {
    if (followerId.toString() === targetUserId.toString()) {
      const error = new Error('You cannot unfollow yourself');
      error.statusCode = 400;
      throw error;
    }

    const deletedFollow = await Follow.findOneAndDelete({
      follower: followerId,
      following: targetUserId
    });

    if (!deletedFollow) {
      const targetUser = await User.findById(targetUserId).select('followersCount');
      if (!targetUser) {
        throw new Error('User not found');
      }
      return {
        following: false,
        message: 'You are not following this user',
        followersCount: targetUser.followersCount
      };
    }

    // Decrement counters atomically and retrieve updated count without extra query
    const [, updatedTarget] = await Promise.all([
      User.findByIdAndUpdate(followerId, [
        {
          $set: {
            followingCount: {
              $max: [0, { $subtract: ['$followingCount', 1] }]
            }
          }
        }
      ]),
      User.findByIdAndUpdate(
        targetUserId,
        [
          {
            $set: {
              followersCount: {
                $max: [0, { $subtract: ['$followersCount', 1] }]
              }
            }
          }
        ],
        { new: true }
      ).select('followersCount')
    ]);

    return {
      following: false,
      message: 'User unfollowed successfully',
      followersCount: updatedTarget ? updatedTarget.followersCount : 0
    };
  }

  async getFollowers(targetUserId, currentUserId = null) {
    const targetUser = await User.findById(targetUserId).select('_id').lean();
    if (!targetUser) {
      throw new Error('User not found');
    }

    const followDocs = await Follow.find({ following: targetUserId })
      .populate('follower', 'name username profileImage bio followersCount')
      .sort({ createdAt: -1 })
      .lean();

    const followerUsers = followDocs
      .filter(doc => doc.follower != null)
      .map(doc => doc.follower);

    // Compute whether current user follows each of these users
    let followedByCurrentUser = new Set();
    if (currentUserId && followerUsers.length > 0) {
      const userIds = followerUsers.map(u => u._id);
      const myFollows = await Follow.find({
        follower: currentUserId,
        following: { $in: userIds }
      }).select('following').lean();

      followedByCurrentUser = new Set(myFollows.map(f => f.following.toString()));
    }

    return followerUsers.map(user => ({
      id: user._id,
      name: user.name,
      username: user.username,
      profileImage: user.profileImage,
      bio: user.bio,
      followersCount: user.followersCount,
      isFollowing: followedByCurrentUser.has(user._id.toString()),
      isSelf: currentUserId ? user._id.toString() === currentUserId.toString() : false
    }));
  }

  async getFollowing(targetUserId, currentUserId = null) {
    const targetUser = await User.findById(targetUserId).select('_id').lean();
    if (!targetUser) {
      throw new Error('User not found');
    }

    const followDocs = await Follow.find({ follower: targetUserId })
      .populate('following', 'name username profileImage bio followersCount')
      .sort({ createdAt: -1 })
      .lean();

    const followingUsers = followDocs
      .filter(doc => doc.following != null)
      .map(doc => doc.following);

    let followedByCurrentUser = new Set();
    if (currentUserId && followingUsers.length > 0) {
      const userIds = followingUsers.map(u => u._id);
      const myFollows = await Follow.find({
        follower: currentUserId,
        following: { $in: userIds }
      }).select('following').lean();

      followedByCurrentUser = new Set(myFollows.map(f => f.following.toString()));
    }

    return followingUsers.map(user => ({
      id: user._id,
      name: user.name,
      username: user.username,
      profileImage: user.profileImage,
      bio: user.bio,
      followersCount: user.followersCount,
      isFollowing: followedByCurrentUser.has(user._id.toString()),
      isSelf: currentUserId ? user._id.toString() === currentUserId.toString() : false
    }));
  }
}

export default new FollowService();
