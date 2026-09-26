import postService from '../services/postService.js';

export const createPost = async (req, res, next) => {
  try {
    const { caption, hashtags } = req.body;
    const authorId = req.user._id;

    const post = await postService.createPost({
      authorId,
      caption,
      hashtags,
      file: req.file
    });

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: post
    });
  } catch (error) {
    next(error);
  }
};

export const editPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { caption, hashtags } = req.body;
    const userId = req.user._id;

    const updated = await postService.editPost({
      postId: id,
      userId,
      caption,
      hashtags,
      file: req.file
    });

    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await postService.deletePost({
      postId: id,
      userId
    });

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

export const getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user ? req.user._id : null;

    const post = await postService.getPostById(id, currentUserId);

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (error) {
    next(error);
  }
};

export const getFeed = async (req, res, next) => {
  try {
    const currentUserId = req.user ? req.user._id : null;
    const { page, limit, filter } = req.query;

    const result = await postService.getFeed({
      currentUserId,
      page,
      limit,
      filter
    });

    res.status(200).json({
      success: true,
      data: result.posts,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

export const getUserPosts = async (req, res, next) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user ? req.user._id : null;
    const { page, limit } = req.query;

    const result = await postService.getUserPosts(
      username,
      currentUserId,
      page,
      limit
    );

    res.status(200).json({
      success: true,
      data: result.posts,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};
