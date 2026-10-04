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

export const seedVideoReelsIfEmpty = async () => {
  try {
    const videoCount = await Post.countDocuments({
      $or: [
        { mediaType: 'video' },
        { mediaUrl: { $regex: /\.(mp4|webm|mov)/i } }
      ]
    });

    if (videoCount > 0) {
      return;
    }

    console.log('[Auto-Seed] No video reels detected. Populating curated reels with real database records...');

    let alex = await User.findOne({ username: 'alexrivera' });
    let devon = await User.findOne({ username: 'devonlane' });
    let george = await User.findOne({ username: 'georgelobko' });
    let jane = await User.findOne({ username: 'janecooper' });
    let vitaliy = await User.findOne({ username: 'vitaliyboyko' });

    const fallbackUser = alex || (await User.findOne());
    if (!fallbackUser) {
      return;
    }

    alex = alex || fallbackUser;
    devon = devon || fallbackUser;
    george = george || fallbackUser;
    jane = jane || fallbackUser;
    vitaliy = vitaliy || fallbackUser;

    const reelTurtle = await Post.create({
      author: alex._id,
      caption: 'Gliding through coral reefs in crystal clear waters 🐢🌊 #ocean #wildlife #nature #vibes',
      mediaUrl: 'https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4',
      mediaType: 'video',
      hashtags: ['#ocean', '#wildlife', '#nature', '#vibes'],
      likesCount: 2,
      commentsCount: 2,
      sharesCount: 24,
      views: 8400
    });

    const reelHorses = await Post.create({
      author: devon._id,
      caption: 'Majestic horses running through winter snow 🐎❄️ Serenity at its finest! #horses #winter #mountains',
      mediaUrl: 'https://res.cloudinary.com/demo/video/upload/snow_horses.mp4',
      mediaType: 'video',
      hashtags: ['#horses', '#winter', '#mountains'],
      likesCount: 2,
      commentsCount: 2,
      sharesCount: 32,
      views: 12500
    });

    const reelDog = await Post.create({
      author: george._id,
      caption: 'Pure joy on a sunny afternoon in the park 🐶☀️ Can never get enough of this energy! #dogs #pets #happiness',
      mediaUrl: 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
      mediaType: 'video',
      hashtags: ['#dogs', '#pets', '#happiness'],
      likesCount: 2,
      commentsCount: 2,
      sharesCount: 45,
      views: 19800
    });

    const reelElephants = await Post.create({
      author: jane._id,
      caption: 'Encounter with giants during sunset safari in Serengeti 🐘🌅 #safari #wildlife #africa #travel',
      mediaUrl: 'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
      mediaType: 'video',
      hashtags: ['#safari', '#wildlife', '#africa', '#travel'],
      likesCount: 2,
      commentsCount: 2,
      sharesCount: 54,
      views: 24000
    });

    const reelFlower = await Post.create({
      author: vitaliy._id,
      caption: 'Botanical blossom macro time-lapse in 4K 🌸✨ Nature is the ultimate artist! #macro #nature #flowers #art',
      mediaUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      mediaType: 'video',
      hashtags: ['#macro', '#nature', '#flowers', '#art'],
      likesCount: 2,
      commentsCount: 2,
      sharesCount: 14,
      views: 9200
    });

    // Seed realistic comments
    await Comment.create([
      {
        post: reelTurtle._id,
        author: devon._id,
        text: 'The underwater clarity is unbelievable! Beautiful capture 🐢🌊'
      },
      {
        post: reelTurtle._id,
        author: george._id,
        text: 'Dream dive spot! What reef was this filmed at?'
      },
      {
        post: reelHorses._id,
        author: alex._id,
        text: 'The cinematic slow-motion in the snow is breathtaking ❄️🐎'
      },
      {
        post: reelHorses._id,
        author: jane._id,
        text: 'Majestic creatures. Great contrast against the white backdrop!'
      },
      {
        post: reelDog._id,
        author: alex._id,
        text: 'Pure canine happiness! Made my whole morning 😄'
      },
      {
        post: reelDog._id,
        author: vitaliy._id,
        text: 'Infinite zoomies! 🐶❤️'
      },
      {
        post: reelElephants._id,
        author: devon._id,
        text: 'The golden hour lighting during sunset is simply magical 🌅🐘'
      },
      {
        post: reelElephants._id,
        author: george._id,
        text: 'Serengeti is on my bucket list. Remarkable footage.'
      },
      {
        post: reelFlower._id,
        author: alex._id,
        text: 'Macro photography at its finest! The petals unfurling is hypnotizing 🌸'
      },
      {
        post: reelFlower._id,
        author: jane._id,
        text: 'Stunning colors and crisp focus!'
      }
    ]);

    // Seed initial likes
    await Like.create([
      { post: reelTurtle._id, user: devon._id },
      { post: reelTurtle._id, user: george._id },
      { post: reelHorses._id, user: alex._id },
      { post: reelHorses._id, user: jane._id },
      { post: reelDog._id, user: alex._id },
      { post: reelDog._id, user: vitaliy._id },
      { post: reelElephants._id, user: devon._id },
      { post: reelElephants._id, user: alex._id },
      { post: reelFlower._id, user: alex._id },
      { post: reelFlower._id, user: devon._id }
    ]);

    // Update user posts count
    for (const u of [alex, devon, george, jane, vitaliy]) {
      const count = await Post.countDocuments({ author: u._id });
      await User.findByIdAndUpdate(u._id, { postsCount: count });
    }

    console.log('[Auto-Seed] 5 curated video reels successfully populated in MongoDB with comments & likes.');
  } catch (err) {
    console.warn('[Auto-Seed] Video reels seeding notice:', err.message);
  }
};

export const syncPostCounters = async () => {
  try {
    const posts = await Post.find().select('_id likesCount commentsCount').lean();
    let updatedCount = 0;

    for (const post of posts) {
      const [actualLikes, actualComments] = await Promise.all([
        Like.countDocuments({ post: post._id }),
        Comment.countDocuments({ post: post._id })
      ]);

      if (post.likesCount !== actualLikes || post.commentsCount !== actualComments) {
        await Post.findByIdAndUpdate(post._id, {
          likesCount: actualLikes,
          commentsCount: actualComments
        });
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`[Database] Synchronized ${updatedCount} post counters based on real user likes.`);
    }
  } catch (err) {
    console.warn('[Database] Post counter sync notice:', err.message);
  }
};


