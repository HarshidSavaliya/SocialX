import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Like from '../models/Like.js';
import Follow from '../models/Follow.js';
import Share from '../models/Share.js';
import { connectDB } from './db.js';
import { seedDefaultDataIfEmpty } from './seedData.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('Clearing existing database collections...');
    await Promise.all([
      User.deleteMany({}),
      Post.deleteMany({}),
      Comment.deleteMany({}),
      Like.deleteMany({}),
      Follow.deleteMany({}),
      Share.deleteMany({})
    ]);

    await seedDefaultDataIfEmpty();
    console.log('Database manual seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();

