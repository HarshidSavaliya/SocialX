import userService from '../services/userService.js';

export const getUserProfile = async (req, res, next) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user ? req.user._id : null;

    const profile = await userService.getUserProfile(username, currentUserId);

    res.status(200).json({
      success: true,
      data: profile,
      user: profile
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const updated = await userService.updateProfile(req.user._id, req.body);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfileImage = async (req, res, next) => {
  try {
    const result = await userService.updateProfileImage(req.user._id, req.file);

    res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const result = await userService.changePassword(req.user._id, req.body);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

export const changeEmail = async (req, res, next) => {
  try {
    const result = await userService.changeEmail(req.user._id, req.body);

    res.status(200).json({
      success: true,
      message: 'Email updated successfully',
      data: { email: result.email }
    });
  } catch (error) {
    next(error);
  }
};

export const getSuggestions = async (req, res, next) => {
  try {
    const currentUserId = req.user ? req.user._id : null;
    const limit = req.query.limit || 5;

    const suggestions = await userService.getSuggestions(currentUserId, limit);

    res.status(200).json({
      success: true,
      data: suggestions,
      users: suggestions
    });
  } catch (error) {
    next(error);
  }
};
