import likeService from '../services/likeService.js';

export const likePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await likeService.likePost(id, userId);

    res.status(200).json({
      success: true,
      message: 'Post liked',
      data: result,
      isLiked: result.isLiked,
      liked: result.liked,
      likesCount: result.likesCount
    });
  } catch (error) {
    next(error);
  }
};

export const unlikePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await likeService.unlikePost(id, userId);

    res.status(200).json({
      success: true,
      message: 'Post unliked',
      data: result,
      isLiked: result.isLiked,
      liked: result.liked,
      likesCount: result.likesCount
    });
  } catch (error) {
    next(error);
  }
};

export const getPostLikers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const likers = await likeService.getLikers(id);

    res.status(200).json({
      success: true,
      data: likers,
      count: likers.length
    });
  } catch (error) {
    next(error);
  }
};

