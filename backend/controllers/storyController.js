import storyService from '../services/storyService.js';

export const createStory = async (req, res, next) => {
  try {
    const { caption, privacy } = req.body;
    const userId = req.user._id;

    const story = await storyService.createStory({
      userId,
      caption,
      privacy,
      file: req.file
    });

    res.status(201).json({
      success: true,
      message: 'Story created successfully',
      data: story
    });
  } catch (error) {
    next(error);
  }
};

export const getStoryFeed = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const feed = await storyService.getStoryFeed(currentUserId);

    res.status(200).json({
      success: true,
      count: feed.length,
      data: feed
    });
  } catch (error) {
    next(error);
  }
};

export const getUserStories = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?._id || null;

    const result = await storyService.getUserStories(userId, currentUserId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getStoryById = async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const currentUserId = req.user?._id || null;

    const story = await storyService.getStoryById(storyId, currentUserId);

    res.status(200).json({
      success: true,
      data: story
    });
  } catch (error) {
    next(error);
  }
};

export const recordStoryView = async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const viewerId = req.user._id;

    const result = await storyService.recordStoryView(storyId, viewerId);

    res.status(200).json({
      success: true,
      message: 'Story view processed',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStory = async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const currentUserId = req.user._id;
    const userRole = req.user.role;

    const result = await storyService.deleteStory(storyId, currentUserId, userRole);

    res.status(200).json({
      success: true,
      message: 'Story deleted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getStoryViewers = async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const currentUserId = req.user._id;

    const result = await storyService.getStoryViewers(storyId, currentUserId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
