import User from '../models/User.js';
import Post from '../models/Post.js';
import Follow from '../models/Follow.js';

class SearchService {
  /**
   * Search users by name or username (case-insensitive regex).
   */
  async searchUsers(query, currentUserId = null, { limit = 20 } = {}) {
    if (!query || !query.trim()) return [];

    const cleanQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(cleanQuery, 'i');

    const users = await User.find({
      $or: [{ name: regex }, { username: regex }]
    })
      .select('name username profileImage bio followersCount')
      .limit(Number(limit));

    if (!currentUserId || users.length === 0) {
      return users.map(u => ({ ...u.toObject(), isFollowing: false }));
    }

    const userIds = users.map(u => u._id);
    const myFollows = await Follow.find({
      follower: currentUserId,
      following: { $in: userIds }
    }).select('following');

    const followingSet = new Set(myFollows.map(f => f.following.toString()));

    return users.map(u => ({
      ...u.toObject(),
      isFollowing: followingSet.has(u._id.toString()),
      isSelf: u._id.toString() === currentUserId.toString()
    }));
  }

  /**
   * Search posts by caption text or hashtags.
   */
  async searchPosts(query, { limit = 20, sort = 'recent' } = {}) {
    if (!query || !query.trim()) return [];

    const cleanQuery = query.trim().replace(/^#/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(cleanQuery, 'i');

    const sortOrder = sort === 'older' ? 1 : -1;

    const posts = await Post.find({
      $or: [
        { caption: regex },
        { hashtags: regex }
      ]
    })
      .sort({ createdAt: sortOrder })
      .limit(Number(limit))
      .populate('author', 'name username profileImage');

    return posts;
  }

  /**
   * Aggregate distinct hashtags matching query with their post count.
   */
  async searchHashtags(query, { limit = 20 } = {}) {
    if (!query || !query.trim()) return [];

    const cleanQuery = query.trim().replace(/^#/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(cleanQuery, 'i');

    const results = await Post.aggregate([
      { $unwind: '$hashtags' },
      { $match: { hashtags: regex } },
      {
        $group: {
          _id: { $toLower: '$hashtags' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: Number(limit) },
      {
        $project: {
          tag: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    return results;
  }

  /**
   * Global search: returns users, posts, and hashtags.
   */
  async globalSearch(query, currentUserId = null) {
    if (!query || !query.trim()) {
      return { users: [], posts: [], hashtags: [] };
    }

    const [users, posts, hashtags] = await Promise.all([
      this.searchUsers(query, currentUserId, { limit: 10 }),
      this.searchPosts(query, { limit: 10 }),
      this.searchHashtags(query, { limit: 10 })
    ]);

    return { users, posts, hashtags };
  }
}

export default new SearchService();
