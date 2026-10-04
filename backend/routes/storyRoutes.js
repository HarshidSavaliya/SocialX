import express from 'express';
import {
  createStory,
  getStoryFeed,
  getUserStories,
  getStoryById,
  recordStoryView,
  deleteStory,
  getStoryViewers
} from '../controllers/storyController.js';
import { authenticateUser, optionalAuth } from '../middleware/authMiddleware.js';
import { uploadSingleMedia } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Story Feed: active stories from following / public users
router.get('/feed', authenticateUser, getStoryFeed);
router.get('/', authenticateUser, getStoryFeed);

// Create Story (authenticated, with image or video media)
router.post('/', authenticateUser, uploadSingleMedia, createStory);

// Stories by User ID
router.get('/user/:userId', optionalAuth, getUserStories);

// Single Story by Story ID
router.get('/:storyId', optionalAuth, getStoryById);

// Record Story View
router.post('/:storyId/view', authenticateUser, recordStoryView);

// Delete Story (Owner or Admin)
router.delete('/:storyId', authenticateUser, deleteStory);

// Story Viewers List (Story Author Only)
router.get('/:storyId/viewers', authenticateUser, getStoryViewers);

export default router;
