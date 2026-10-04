import postService from '../services/postService.js';
import cloudinaryService from '../services/cloudinaryService.js';

export const createPost = async (req, res, next) => {
  try {
    const { caption, hashtags, visibility, directMedia } = req.body;
    const authorId = req.user._id;

    let parsedDirectMedia = null;
    if (directMedia) {
      parsedDirectMedia = typeof directMedia === 'string' ? JSON.parse(directMedia) : directMedia;
    }

    const post = await postService.createPost({
      authorId,
      caption,
      hashtags,
      visibility,
      file: req.file,
      directMedia: parsedDirectMedia
    });

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: post,
      post
    });
  } catch (error) {
    next(error);
  }
};

export const editPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { caption, hashtags, visibility } = req.body;
    const userId = req.user._id;

    const updated = await postService.editPost({
      postId: id,
      userId,
      caption,
      hashtags,
      visibility,
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
    const { cursor, limit, filter } = req.query;

    const result = await postService.getFeed({
      currentUserId,
      cursor,
      limit,
      filter
    });

    res.status(200).json({
      success: true,
      items: result.items,
      data: result.items,
      posts: result.posts,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
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
      posts: result.posts,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record a video Reel view
 * POST /api/posts/:id/view
 */
export const recordView = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await postService.recordView(id);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bookmark / Save post or reel
 * POST /api/posts/:id/save
 */
export const savePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await postService.savePost(id, userId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unsave / Remove bookmark
 * DELETE /api/posts/:id/save
 */
export const unsavePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await postService.unsavePost(id, userId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Secure signed upload parameters generation for direct client-to-Cloudinary upload.
 * GET /api/posts/upload-signature
 */
export const getUploadSignature = async (req, res, next) => {
  try {
    const { folder = 'socialx/reels', resourceType = 'video' } = req.query;

    const safeFolder = folder.startsWith('socialx/') ? folder : 'socialx/reels';
    const safeResourceType = ['video', 'image', 'auto'].includes(resourceType) ? resourceType : 'video';

    const signatureData = cloudinaryService.generateUploadSignature({
      folder: safeFolder,
      resourceType: safeResourceType
    });

    res.status(200).json({
      success: true,
      data: signatureData
    });
  } catch (error) {
    next(error);
  }
};
