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
      throw new Error('Please provide all required fields');
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }]
    });

    if (existingUser) {
      if (existingUser.email === cleanEmail) {
        throw new Error('An account with this email address already exists');
      }
      if (existingUser.username === cleanUsername) {
        throw new Error('This username is already taken. Please choose another');
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
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profileImage: user.profileImage,
        coverImage: user.coverImage,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        postsCount: user.postsCount
      },
      token
    };
  }

  async login({ emailOrUsername, password }) {
    if (!emailOrUsername || !password) {
      throw new Error('Please provide email/username and password');
    }

    const cleanInput = emailOrUsername.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ email: cleanInput }, { username: cleanInput }]
    }).select('+password');

    if (!user) {
      throw new Error('Invalid email/username or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid email/username or password');
    }

    const token = this.generateToken(user._id);

    return {
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profileImage: user.profileImage,
        coverImage: user.coverImage,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        postsCount: user.postsCount
      },
      token
    };
  }
}

export default new AuthService();
