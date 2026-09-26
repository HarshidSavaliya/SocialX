export const currentUser = {
  id: 'usr_me',
  name: 'Alex Rivera',
  handle: '@alexrivera',
  title: 'Staff Product Designer & Tech Lead',
  location: 'San Francisco, CA',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=80',
  stats: {
    posts: 142,
    followers: '18.4K',
    following: '842',
    impressions: '2.4M'
  },
  bio: 'Building interface systems at the intersection of spatial computing, editorial typography, and high-performance web architecture. ☕ 🏔️',
  website: 'https://socialx.dev/alex',
};

export const initialStories = [
  {
    id: 'story_1',
    author: {
      name: 'Anatoly Shelburne',
      handle: '@anatolys',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    },
    thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=500&q=80',
    media: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
    time: '45m ago',
    caption: 'Golden hour reflections in Yosemite Valley 🌲✨',
    viewed: false
  },
  {
    id: 'story_2',
    author: {
      name: 'Lolita Eams',
      handle: '@lolita_eams',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'
    },
    thumbnail: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=500&q=80',
    media: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1000&q=80',
    time: '2h ago',
    caption: 'Cinematic stroll through the streets of Cinque Terre 🇮🇹',
    viewed: false
  },
  {
    id: 'story_3',
    author: {
      name: 'Marcus Vance',
      handle: '@marcusvance',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    },
    thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=500&q=80',
    media: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
    time: '4h ago',
    caption: 'Minimalist concrete studio designed by Tadao Ando 🏛️',
    viewed: true
  },
  {
    id: 'story_4',
    author: {
      name: 'Elena Rostova',
      handle: '@elena_synth',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    },
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80',
    media: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1000&q=80',
    time: '5h ago',
    caption: 'Analog modular synths patch session in Berlin 🎛️',
    viewed: false
  },
  {
    id: 'story_5',
    author: {
      name: 'Devon Lane',
      handle: '@devonlane',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80'
    },
    thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=500&q=80',
    media: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1000&q=80',
    time: '8h ago',
    caption: '35mm film processing day in the darkroom 🎞️',
    viewed: true
  }
];

export const initialPosts = [
  {
    id: 'post_1',
    author: {
      name: 'George Lobko',
      handle: '@georgelobko',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      isVerified: true
    },
    time: '2 hours ago',
    category: 'Alpine Expedition',
    caption: 'Hi everyone, today I was on the most beautiful mountain in the world 😍, I also want to say hi to our expedition crew!',
    taggedFriends: [
      { name: 'Silena', handle: '@silena', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80' },
      { name: 'Olya', handle: '@olya', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80' },
      { name: 'Davis', handle: '@davis', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80' }
    ],
    hashtags: ['#swissalps', '#mountaineering', '#expedition', '#nature'],
    layoutType: 'grid-3',
    images: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=900&q=80'
    ],
    views: '6,355',
    likes: 542,
    hasLiked: false,
    commentsCount: 38,
    activeReaction: { emoji: '🔥', text: 'Woow!!! 🐾', count: 724 },
    reactions: [
      { emoji: '🔥', count: 724 },
      { emoji: '😍', count: 489 },
      { emoji: '⚡', count: 182 },
      { emoji: '💔', count: 3 },
      { emoji: '🚀', count: 95 }
    ],
    socialProof: {
      text: 'Liked by Silena, Davis and 540 others',
      avatars: [
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80'
      ]
    },
    comments: [
      {
        id: 'c_1',
        author: 'Silena Gomez',
        handle: '@silena',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
        text: 'That summit view was completely breathtaking! Best coffee break ever ☕🏔️',
        time: '1h ago',
        likes: 14
      },
      {
        id: 'c_2',
        author: 'Davis Sterling',
        handle: '@davis',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
        text: 'Glad we packed the extra thermal gear. Incredible shots George!',
        time: '45m ago',
        likes: 9
      }
    ]
  },
  {
    id: 'post_2',
    author: {
      name: 'Devon Lane',
      handle: '@devonlane',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
      isVerified: true
    },
    time: '6m ago',
    category: 'Cinema & Modern History',
    caption: 'Christopher Nolan tells the incendiary story of the top-secret Manhattan Project. Few people have shaped the course of history as dramatically as J. Robert Oppenheimer, and now Christopher Nolan has captured his sometimes inspiring, sometimes chilling story in this epic Atomic Age thriller.',
    taggedFriends: [],
    hashtags: ['#oppenheimer', '#nolan', '#cinematography', '#imax70mm'],
    layoutType: 'editorial-card',
    editorialBanner: {
      badge: 'Editorial Spotlight',
      category: 'Masterclass Cinema',
      title: 'The Man Behind The Bomb',
      subtitle: 'To create a means to end WWII — and possibly the rest of the world with it.',
      image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80',
      readTime: '6 min read'
    },
    views: '14,820',
    likes: 1842,
    hasLiked: true,
    commentsCount: 143,
    activeReaction: { emoji: '⚡', text: 'Mindblown ⚡', count: 1204 },
    reactions: [
      { emoji: '⚡', count: 1204 },
      { emoji: '🔥', count: 832 },
      { emoji: '😍', count: 641 },
      { emoji: '🤯', count: 420 }
    ],
    socialProof: {
      text: 'Liked by cursodefigmapro, Jacob Jones and 1,840 others',
      avatars: [
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80',
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=80&q=80'
      ]
    },
    comments: [
      {
        id: 'c_3',
        author: 'Jacob Jones',
        handle: '@jacobjones',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=100&q=80',
        text: 'The 70mm IMAX sequence in the desert is probably one of the greatest technical achievements in modern film scoring and editing.',
        time: '3m ago',
        likes: 42
      }
    ]
  },
  {
    id: 'post_3',
    author: {
      name: 'Vitaliy Boyko',
      handle: '@vitaliyboyko',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      isVerified: false
    },
    time: '3 hours ago',
    category: 'Daily Rituals',
    cardTint: 'warm',
    caption: "I chose a wonderful coffee today, I wanted to tell you what product they have in stock - it's a pour-over with coconut 🥥 milk... delicious... it's really incredibly tasty!!! ☕✨",
    taggedFriends: [],
    hashtags: ['#coffeeculture', '#specialtycoffee', '#baristalife'],
    layoutType: 'single-photo',
    images: [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80'
    ],
    views: '4,119',
    likes: 312,
    hasLiked: false,
    commentsCount: 22,
    activeReaction: { emoji: '😍', text: 'Delicious ☕', count: 388 },
    reactions: [
      { emoji: '😍', count: 388 },
      { emoji: '🔥', count: 140 },
      { emoji: '☕', count: 210 }
    ],
    socialProof: {
      text: 'Liked by Alex Rivera and 311 others',
      avatars: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'
      ]
    },
    comments: []
  },
  {
    id: 'post_4',
    author: {
      name: 'Maya Lin',
      handle: '@mayalin_design',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      isVerified: true
    },
    time: '5 hours ago',
    category: 'Spatial Design & UI',
    caption: 'Exploration for translucent spatial glass widgets in NextGen OS. Designing with depth layers, subtle chromatic dispersion, and ambient specular highlights. Feedback welcome! 🔮',
    taggedFriends: [],
    hashtags: ['#spatialui', '#designsystem', '#glassmorphism', '#uxresearch'],
    layoutType: 'grid-2',
    images: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=80'
    ],
    views: '9,410',
    likes: 924,
    hasLiked: false,
    commentsCount: 56,
    activeReaction: { emoji: '🚀', text: 'Futuristic 🔮', count: 580 },
    reactions: [
      { emoji: '🚀', count: 580 },
      { emoji: '🔥', count: 412 },
      { emoji: '⚡', count: 340 }
    ],
    socialProof: {
      text: 'Liked by Devon Lane, Vitaliy and 922 others',
      avatars: [
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=80&q=80'
      ]
    },
    comments: []
  }
];

export const followSuggestions = [
  {
    id: 'sug_1',
    name: 'Jane Cooper',
    handle: '@janecooper',
    subtitle: 'Senior UI/UX Architect',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    isFollowing: false
  },
  {
    id: 'sug_2',
    name: 'Nick Shelburne',
    handle: '@nickshelburne',
    subtitle: 'Creative Director at Linear',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    isFollowing: false
  },
  {
    id: 'sug_3',
    name: 'Brittni Lando',
    handle: '@brittnilando',
    subtitle: '3D Motion Designer',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
    isFollowing: true
  },
  {
    id: 'sug_4',
    name: 'Ivan Shevchenko',
    handle: '@shevchenko',
    subtitle: 'AI Research & Photography',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
    isFollowing: false
  },
  {
    id: 'sug_5',
    name: 'Cody Fisher',
    handle: '@codyfisher',
    subtitle: 'Sound Architect & Producer',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    isFollowing: false
  }
];

export const recommendations = [
  {
    id: 'rec_1',
    label: 'UI/UX',
    shape: 'scallop',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    icon: 'Layers'
  },
  {
    id: 'rec_2',
    label: 'Music',
    shape: 'circle',
    color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    icon: 'Music'
  },
  {
    id: 'rec_3',
    label: 'Cooking',
    shape: 'photo',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=120&q=80',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon: 'Utensils'
  },
  {
    id: 'rec_4',
    label: 'Hiking',
    shape: 'squircle',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    icon: 'Compass'
  }
];

export const todayOnSocialX = {
  author: 'Ronald Richards',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80',
  title: 'How Spatial Computing transforms immersive education',
  snippet: 'Students can walk alongside prehistoric life and medical researchers simulate delicate surgeries in zero-risk micro-environments...',
  thumbnail: 'https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?auto=format&fit=crop&w=300&q=80',
  time: '12m ago',
  readTime: '4 min'
};

export const conversationsData = [
  {
    id: 'conv_1',
    user: {
      name: 'Devon Lane',
      handle: '@devonlane',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
      status: 'online',
      statusText: 'Active now',
      role: 'Cinematographer & Writer'
    },
    unread: 0,
    lastMessage: 'Let’s review the 35mm film grading in the video room.',
    time: '2m ago',
    messages: [
      {
        id: 'm1',
        sender: 'Devon Lane',
        text: 'Hey Alex! Did you manage to export the latest color profile for the Oppenheimer editorial sequence?',
        time: '10:41 AM',
        isMe: false,
        status: 'read'
      },
      {
        id: 'm2',
        sender: 'Alex Rivera',
        text: 'Yes! Just finalized the Kodak 5219 film emulation LUT. The shadows have that velvety roll-off now.',
        time: '10:43 AM',
        isMe: true,
        status: 'read'
      },
      {
        id: 'm3',
        sender: 'Devon Lane',
        text: 'Incredible. Here is the reference still from scene 4:',
        time: '10:44 AM',
        isMe: false,
        status: 'read',
        attachment: {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
          title: 'Kodak_5219_Reference_Scene4.png'
        }
      },
      {
        id: 'm4',
        sender: 'Devon Lane',
        text: 'Let’s review the 35mm film grading in the video room.',
        time: '10:45 AM',
        isMe: false,
        status: 'read'
      }
    ],
    sharedMedia: [
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=300&q=80',
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=300&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=300&q=80'
    ]
  },
  {
    id: 'conv_2',
    user: {
      name: 'Jane Cooper',
      handle: '@janecooper',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      status: 'offline',
      statusText: 'Last seen 15m ago',
      role: 'Senior UI/UX Architect'
    },
    unread: 2,
    lastMessage: 'Pushed the glass token definitions to Figma tokens repo!',
    time: '15m ago',
    messages: [
      {
        id: 'm2_1',
        sender: 'Jane Cooper',
        text: 'Pushed the glass token definitions to Figma tokens repo!',
        time: '10:15 AM',
        isMe: false,
        status: 'delivered'
      }
    ],
    sharedMedia: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80'
    ]
  },
  {
    id: 'conv_3',
    user: {
      name: 'George Lobko',
      handle: '@georgelobko',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      status: 'online',
      statusText: 'Active now',
      role: 'Alpinist & Guide'
    },
    unread: 0,
    lastMessage: 'The high resolution drone panoramas are ready!',
    time: '1h ago',
    messages: [
      {
        id: 'm3_1',
        sender: 'George Lobko',
        text: 'The high resolution drone panoramas are ready!',
        time: '9:30 AM',
        isMe: false,
        status: 'read'
      }
    ],
    sharedMedia: [
      'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=300&q=80'
    ]
  }
];

export const secretChatInitialMessages = [
  {
    id: 'sec_1',
    sender: 'Devon Lane',
    text: '🛡️ Initialized E2EE Channel (Signal Protocol · AES-256-GCM).',
    isSystem: true,
    time: '11:00 AM'
  },
  {
    id: 'sec_2',
    sender: 'Devon Lane',
    text: 'Here is the confidential script breakdown for Episode 4. Disappearing timer set to 30 seconds.',
    isMe: false,
    time: '11:02 AM',
    expiresIn: '24s'
  },
  {
    id: 'sec_3',
    sender: 'Devon Lane',
    isMe: false,
    time: '11:03 AM',
    isViewOnce: true,
    isViewed: false,
    mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    title: '🔒 Confidential Storyboard Prototype (Tap to reveal, vanishes in 5s)'
  },
  {
    id: 'sec_4',
    sender: 'Alex Rivera',
    text: 'Understood. Reviewing now. Forwarding and screenshots are restricted on this channel.',
    isMe: true,
    time: '11:04 AM',
    expiresIn: '28s'
  }
];
