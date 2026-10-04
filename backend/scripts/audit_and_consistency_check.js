/**
 * SocialX Database Consistency and Health Check Script
 *
 * Checks:
 * - Post likesCount vs actual Like documents
 * - Post commentsCount vs actual Comment documents
 * - User followersCount vs actual Follow documents
 * - User followingCount vs actual Follow documents
 * - Story viewsCount vs actual StoryView documents
 *
 * READ-ONLY: Does not modify production database data.
 * Run via: node scripts/audit_and_consistency_check.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/User.js';
import Post from '../models/Post.js';
import Like from '../models/Like.js';
import Comment from '../models/Comment.js';
import Follow from '../models/Follow.js';
import Story from '../models/Story.js';
import StoryView from '../models/StoryView.js';

async function runConsistencyCheck() {
  console.log('====================================================');
  console.log('   SOCIALX DATABASE INTEGRITY & CONSISTENCY CHECK   ');
  console.log('====================================================\n');

  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/socialx';
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
  } catch (err) {
    console.log('[Notice] Atlas connection bypassed, connecting to local fallback: mongodb://127.0.0.1:27017/socialx');
    await mongoose.connect('mongodb://127.0.0.1:27017/socialx', { serverSelectionTimeoutMS: 5000 });
  }
  console.log('✓ Successfully connected to MongoDB\n');

  let totalDiscrepancies = 0;

  // 1. Audit Posts (Likes & Comments count)
  console.log('[1/3] Auditing Post Counters (likesCount & commentsCount)...');
  const posts = await Post.find({}).lean();
  let postLikeMismatches = 0;
  let postCommentMismatches = 0;

  for (const post of posts) {
    const [actualLikes, actualComments] = await Promise.all([
      Like.countDocuments({ post: post._id }),
      Comment.countDocuments({ post: post._id })
    ]);

    if (actualLikes !== (post.likesCount || 0)) {
      postLikeMismatches++;
      totalDiscrepancies++;
      console.warn(`  [!] Post ${post._id} likesCount mismatch: cached=${post.likesCount || 0}, actual=${actualLikes}`);
    }

    if (actualComments !== (post.commentsCount || 0)) {
      postCommentMismatches++;
      totalDiscrepancies++;
      console.warn(`  [!] Post ${post._id} commentsCount mismatch: cached=${post.commentsCount || 0}, actual=${actualComments}`);
    }
  }
  console.log(`  → Audited ${posts.length} Posts: ${postLikeMismatches} like mismatches, ${postCommentMismatches} comment mismatches.\n`);

  // 2. Audit Users (Followers & Following count)
  console.log('[2/3] Auditing User Counters (followersCount & followingCount)...');
  const users = await User.find({}).lean();
  let followerMismatches = 0;
  let followingMismatches = 0;

  for (const user of users) {
    const [actualFollowers, actualFollowing] = await Promise.all([
      Follow.countDocuments({ following: user._id }),
      Follow.countDocuments({ follower: user._id })
    ]);

    if (actualFollowers !== (user.followersCount || 0)) {
      followerMismatches++;
      totalDiscrepancies++;
      console.warn(`  [!] User ${user.username} followersCount mismatch: cached=${user.followersCount || 0}, actual=${actualFollowers}`);
    }

    if (actualFollowing !== (user.followingCount || 0)) {
      followingMismatches++;
      totalDiscrepancies++;
      console.warn(`  [!] User ${user.username} followingCount mismatch: cached=${user.followingCount || 0}, actual=${actualFollowing}`);
    }
  }
  console.log(`  → Audited ${users.length} Users: ${followerMismatches} follower mismatches, ${followingMismatches} following mismatches.\n`);

  // 3. Audit Stories (Views count vs StoryView documents)
  console.log('[3/3] Auditing Story Views (viewsCount vs StoryView documents)...');
  const stories = await Story.find({}).lean();
  let storyViewMismatches = 0;

  for (const story of stories) {
    const actualViews = await StoryView.countDocuments({ story: story._id });
    if (actualViews !== (story.viewsCount || 0)) {
      storyViewMismatches++;
      totalDiscrepancies++;
      console.warn(`  [!] Story ${story._id} viewsCount mismatch: cached=${story.viewsCount || 0}, actual=${actualViews}`);
    }
  }
  console.log(`  → Audited ${stories.length} Stories: ${storyViewMismatches} view mismatches.\n`);

  console.log('====================================================');
  console.log(`SUMMARY: Total Discrepancies Found: ${totalDiscrepancies}`);
  if (totalDiscrepancies === 0) {
    console.log('STATUS: PERFECT INTEGRITY (All cached counters match source of truth)');
  } else {
    console.log('STATUS: INCONSISTENCIES DETECTED (Safe repair script can be scheduled)');
  }
  console.log('====================================================\n');

  await mongoose.disconnect();
}

runConsistencyCheck().catch(err => {
  console.error('Consistency check failed:', err);
  process.exit(1);
});
