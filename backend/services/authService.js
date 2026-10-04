import jwt from 'jsonwebtoken';
import User from '../models/User.js';

class AuthService {
  generateToken(id) {
    return jwt.sign(
      { id },
      process.env.JWT_SECRET || 'socialx_jwt_secret_college_project_key_2026',
      { expiresIn: '30d' }
    );
  }

  async register({ name, username, email, password }) {
    if (!name || !username || !email || !password) {
      const err = new Error('Please provide all required fields');
      err.statusCode = 400;
      throw err;
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }]
    });

    if (existingUser) {
      if (existingUser.email === cleanEmail) {
        const err = new Error('An account with this email address already exists');
        err.statusCode = 400;
        throw err;
      }
      if (existingUser.username === cleanUsername) {
        const err = new Error('This username is already taken. Please choose another');
        err.statusCode = 400;
        throw err;
      }
    }

    const user = await User.create({
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      password
    });

    const token = this.generateToken(user._id);

    return {
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profileImage: user.profileImage,
        coverImage: user.coverImage,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        postsCount: user.postsCount,
        role: user.role,
        accountStatus: user.accountStatus
      },
      token
    };
  }

  async login({ emailOrUsername, password }) {
    if (!emailOrUsername || !password) {
      const err = new Error('Please provide email/username and password');
      err.statusCode = 400;
      throw err;
    }

    const cleanInput = emailOrUsername.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ email: cleanInput }, { username: cleanInput }]
    }).select('+password');

    if (!user) {
      const err = new Error('Invalid email/username or password');
      err.statusCode = 400;
      throw err;
    }

    // Check account status
    if (user.accountStatus === 'BLOCKED') {
      const err = new Error('Your account has been suspended by an administrator. Please contact support.');
      err.statusCode = 403;
      throw err;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const err = new Error('Invalid email/username or password');
      err.statusCode = 400;
      throw err;
    }

    const token = this.generateToken(user._id);

    return {
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profileImage: user.profileImage,
        coverImage: user.coverImage,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        postsCount: user.postsCount,
        role: user.role,
        accountStatus: user.accountStatus
      },
      token
    };
  }
}

export default new AuthService();
