import User from '../models/User.js';
import Follow from '../models/Follow.js';
import cloudinaryService from './cloudinaryService.js';

class UserService {
  async getUserProfile(username, currentUserId = null) {
    const cleanUsername = username.trim().toLowerCase();
    const user = await User.findOne({ username: cleanUsername });

    if (!user) {
      throw new Error('User not found');
    }

    let isFollowing = false;
    let isSelf = false;

    if (currentUserId) {
      isSelf = user._id.toString() === currentUserId.toString();
      if (!isSelf) {
        const followDoc = await Follow.findOne({
          follower: currentUserId,
          following: user._id
        });
        isFollowing = !!followDoc;
      }
    }

    return {
      id: user._id,
      _id: user._id,
      name: user.name,
      username: user.username,
      email: isSelf ? user.email : undefined,
      title: user.title || '',
      bio: user.bio,
      avatar: user.avatar || user.profileImage,
      profileImage: user.profileImage || user.avatar,
      coverImage: user.coverImage,
      location: user.location,
      website: user.website,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      postsCount: user.postsCount,
      role: user.role,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      isFollowing,
      isSelf
    };
  }

  async updateProfile(userId, updates) {
    const { name, bio, location, website } = updates;
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (name !== undefined) user.name = name.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (location !== undefined) user.location = location.trim();
    if (website !== undefined) user.website = website.trim();

    await user.save();

    return {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      bio: user.bio,
      profileImage: user.profileImage,
      coverImage: user.coverImage,
      location: user.location,
      website: user.website,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      postsCount: user.postsCount
    };
  }

  async updateProfileImage(userId, file) {
    if (!file) {
      throw new Error('Please select an image file to upload');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Clean up old image if present
    if (user.profileImagePublicId) {
      await cloudinaryService.deleteMedia(user.profileImagePublicId, 'image');
    }

    // Upload new profile image
    const uploadResult = await cloudinaryService.uploadMedia(
      file.buffer,
      'socialx/profiles',
      'image',
      file.mimetype
    );

    user.profileImage = uploadResult.url;
    user.avatar = uploadResult.url;
    user.profileImagePublicId = uploadResult.publicId;
    await user.save();

    return {
      profileImage: user.profileImage,
      avatar: user.avatar
    };
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    if (!currentPassword || !newPassword) {
      throw new Error('Please provide current and new password');
    }

    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    return { success: true, message: 'Password changed successfully' };
  }

  async changeEmail(userId, { newEmail, password }) {
    if (!newEmail || !password) {
      throw new Error('Please provide new email and current password');
    }

    const cleanEmail = newEmail.trim().toLowerCase();

    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Password verification failed');
    }

    // Check if new email is already in use
    const emailExists = await User.findOne({ email: cleanEmail });
    if (emailExists && emailExists._id.toString() !== userId.toString()) {
      throw new Error('This email address is already in use');
    }

    user.email = cleanEmail;
    await user.save();

    return { success: true, email: user.email };
  }

  async getSuggestions(userId, limit = 5) {
    let excludedUserIds = [userId];

    if (userId) {
      const followingDocs = await Follow.find({ follower: userId }).select('following');
      const followedIds = followingDocs.map(f => f.following);
      excludedUserIds = [...excludedUserIds, ...followedIds];
    }

    const suggestions = await User.find({ _id: { $nin: excludedUserIds } })
      .select('name username profileImage bio followersCount')
      .limit(Number(limit))
      .sort({ followersCount: -1, createdAt: -1 });

    return suggestions.map(u => ({
      id: u._id,
      name: u.name,
      username: u.username,
      profileImage: u.profileImage,
      bio: u.bio,
      followersCount: u.followersCount,
      isFollowing: false
    }));
  }
}

export default new UserService();
