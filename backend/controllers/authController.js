import authService from '../services/authService.js';

export const register = async (req, res, next) => {
  try {
    const { name, username, email, password } = req.body;
    const result = await authService.register({ name, username, email, password });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { emailOrUsername, email, username, password } = req.body;
    const identifier = emailOrUsername || email || username;

    const result = await authService.login({
      emailOrUsername: identifier,
      password
    });

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        id: req.user._id,
        name: req.user.name,
        username: req.user.username,
        email: req.user.email,
        bio: req.user.bio,
        profileImage: req.user.profileImage,
        coverImage: req.user.coverImage,
        location: req.user.location,
        website: req.user.website,
        followersCount: req.user.followersCount,
        followingCount: req.user.followingCount,
        postsCount: req.user.postsCount,
        role: req.user.role,
        accountStatus: req.user.accountStatus
      }
    });
  } catch (error) {
    next(error);
  }
};
