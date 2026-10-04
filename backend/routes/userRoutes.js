import express from 'express';
import {
  getUserProfile,
  updateProfile,
  updateProfileImage,
  changePassword,
  changeEmail,
  getSuggestions
} from '../controllers/userController.js';
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing
} from '../controllers/followController.js';
import { getUserPosts } from '../controllers/postController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';
import { uploadSingleMedia } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Current user profile & account settings
router.put('/profile', protect, updateProfile);
router.put('/profile-image', protect, uploadSingleMedia, updateProfileImage);
router.put('/change-password', protect, changePassword);
router.put('/change-email', protect, changeEmail);

// User suggestions for discovery
router.get('/suggestions', optionalAuth, getSuggestions);

// Follow / Unfollow endpoints
router.post('/:id/follow', protect, followUser);
router.delete('/:id/follow', protect, unfollowUser);
router.get('/:id/followers', optionalAuth, getFollowers);
router.get('/:id/following', optionalAuth, getFollowing);

// User posts and public profile
router.get('/:username/posts', optionalAuth, getUserPosts);
router.get('/profile/:username', optionalAuth, getUserProfile);
router.get('/:username', optionalAuth, getUserProfile);

export default router;
