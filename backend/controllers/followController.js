import followService from '../services/followService.js';

export const followUser = async (req, res, next) => {
  try {
    const { id } = req.params; // target user id
    const followerId = req.user._id;

    const result = await followService.followUser(followerId, id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const unfollowUser = async (req, res, next) => {
  try {
    const { id } = req.params; // target user id
    const followerId = req.user._id;

    const result = await followService.unfollowUser(followerId, id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getFollowers = async (req, res, next) => {
  try {
    const { id } = req.params; // target user id
    const currentUserId = req.user ? req.user._id : null;

    const followers = await followService.getFollowers(id, currentUserId);

    res.status(200).json({
      success: true,
      data: followers
    });
  } catch (error) {
    next(error);
  }
};

export const getFollowing = async (req, res, next) => {
  try {
    const { id } = req.params; // target user id
    const currentUserId = req.user ? req.user._id : null;

    const following = await followService.getFollowing(id, currentUserId);

    res.status(200).json({
      success: true,
      data: following
    });
  } catch (error) {
    next(error);
  }
};
