import User from '../models/User.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Like from '../models/Like.js';
import Follow from '../models/Follow.js';
import Share from '../models/Share.js';

export const seedDefaultDataIfEmpty = async () => {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    return;
  }

  console.log('[Auto-Seed] Empty database detected. Populating demo data for SocialX...');

  try {
    const users = await User.create([
      {
        name: 'Alex Rivera',
        username: 'alexrivera',
        email: 'alex@socialx.com',
        password: 'password123',
        title: 'Staff Product Designer & Tech Lead',
        bio: 'Building interface systems at the intersection of spatial computing, editorial typography, and high-performance web architecture. ☕ 🏔️',
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=80',
        location: 'San Francisco, CA',
        website: 'https://socialx.dev/alex',
        followersCount: 2,
        followingCount: 3,
        postsCount: 1,
        role: 'ADMIN',
        accountStatus: 'ACTIVE'
      },
      {
        name: 'George Lobko',
        username: 'georgelobko',
        email: 'george@socialx.com',
        password: 'password123',
        bio: 'Alpinist, expedition photographer, and mountain guide in the Swiss Alps.',
        profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
        location: 'Zermatt, Switzerland',
        website: 'https://georgelobko.photo',
        followersCount: 1,
        followingCount: 1,
        postsCount: 1
      },
      {
        name: 'Devon Lane',
        username: 'devonlane',
        email: 'devon@socialx.com',
        password: 'password123',
        bio: 'Cinematographer and film critic focusing on 70mm IMAX and analog visual archives.',
        profileImage: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
        coverImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
        location: 'Los Angeles, CA',
        website: 'https://devonlane.cinema',
        followersCount: 2,
        followingCount: 1,
        postsCount: 1
      },
      {
        name: 'Jane Cooper',
        username: 'janecooper',
        email: 'jane@socialx.com',
        password: 'password123',
        bio: 'Senior Design Systems Architect. Focused on glassmorphism tokens and accessibility.',
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        location: 'New York, NY',
        followersCount: 1,
        followingCount: 1,
        postsCount: 0
      },
      {
        name: 'Vitaliy Boyko',
        username: 'vitaliyboyko',
        email: 'vitaliy@socialx.com',
        password: 'password123',
        bio: 'Coffee roaster and daily ritual curator. Pour-overs, aeropress & espresso craft.',
        profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
        location: 'Kyoto, Japan',
        followersCount: 1,
        followingCount: 1,
        postsCount: 1
      },
      {
        name: 'Brittni Lando',
        username: 'brittnilando',
        email: 'brittni@socialx.com',
        password: 'password123',
        bio: '3D motion designer & spatial graphics artist.',
        profileImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
        location: 'London, UK',
        followersCount: 0,
        followingCount: 0,
        postsCount: 0
      }
    ]);

    const [alex, george, devon, jane, vitaliy] = users;

    await Follow.create([
      { follower: alex._id, following: george._id },
      { follower: alex._id, following: devon._id },
      { follower: alex._id, following: vitaliy._id },
      { follower: george._id, following: alex._id },
      { follower: devon._id, following: alex._id },
      { follower: jane._id, following: devon._id },
      { follower: vitaliy._id, following: jane._id }
    ]);

    const postGeorge = await Post.create({
      author: george._id,
      caption: 'Hi everyone, today I was on the most beautiful mountain in the world 😍! The summit conditions in the Swiss Alps were completely clear. Tagging our expedition crew! #swissalps #mountaineering #nature #alps',
      mediaUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      mediaType: 'image',
      hashtags: ['#swissalps', '#mountaineering', '#nature', '#alps'],
      likesCount: 1,
      commentsCount: 2,
      sharesCount: 1,
      views: 6355
    });

    const postDevon = await Post.create({
      author: devon._id,
      caption: 'Christopher Nolan tells the incendiary story of the top-secret Manhattan Project. Few people have shaped the course of history as dramatically as J. Robert Oppenheimer, and now Christopher Nolan has captured his sometimes inspiring, sometimes chilling story in this epic Atomic Age thriller.\n\nThe 70mm sequence in the desert is monumental filmmaking. #oppenheimer #nolan #cinematography #imax70mm',
      mediaUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80',
      mediaType: 'image',
      hashtags: ['#oppenheimer', '#nolan', '#cinematography', '#imax70mm'],
      likesCount: 2,
      commentsCount: 1,
      sharesCount: 3,
      views: 14820
    });

    const postVitaliy = await Post.create({
      author: vitaliy._id,
      caption: "I chose a wonderful coffee today, I wanted to tell you what product they have in stock - it's a pour-over with coconut 🥥 milk... delicious... it's really incredibly tasty!!! ☕✨ #coffeeculture #specialtycoffee #baristalife",
      mediaUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80',
      mediaType: 'image',
      hashtags: ['#coffeeculture', '#specialtycoffee', '#baristalife'],
      likesCount: 1,
      commentsCount: 0,
      sharesCount: 0,
      views: 4119
    });

    const postAlex = await Post.create({
      author: alex._id,
      caption: 'Exploring modern interface architecture that unifies editorial clarity with dark glass luxury for SocialX. Designing clean spacing, atomic like relations, and seamless REST services. #designsystem #socialx #webarchitecture',
      mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
      mediaType: 'image',
      hashtags: ['#designsystem', '#socialx', '#webarchitecture'],
      likesCount: 2,
      commentsCount: 1,
      sharesCount: 1,
      views: 8920
    });

    await Like.create([
      { post: postGeorge._id, user: alex._id },
      { post: postDevon._id, user: alex._id },
      { post: postDevon._id, user: george._id },
      { post: postVitaliy._id, user: alex._id },
      { post: postAlex._id, user: devon._id },
      { post: postAlex._id, user: george._id }
    ]);

    await Comment.create([
      {
        post: postGeorge._id,
        author: alex._id,
        text: 'That summit view was completely breathtaking! Best coffee break ever ☕🏔️'
      },
      {
        post: postGeorge._id,
        author: devon._id,
        text: 'The natural lighting on that ridge is pristine. Glad you brought the wide angle lens!'
      },
      {
        post: postDevon._id,
        author: alex._id,
        text: 'The sound design during the countdown is masterclass cinema tension.'
      },
      {
        post: postAlex._id,
        author: devon._id,
        text: 'The translucent glass token contrast is spot on. Great work!'
      }
    ]);

    console.log('[Auto-Seed] Demo data successfully initialized.');
  } catch (err) {
    console.warn('[Auto-Seed] Seeding notice:', err.message);
  }
};
