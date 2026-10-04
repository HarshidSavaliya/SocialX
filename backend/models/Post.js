import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Post must have an author']
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [2200, 'Caption cannot exceed 2200 characters'],
      default: ''
    },
    mediaUrl: {
      type: String,
      default: ''
    },
    mediaPublicId: {
      type: String,
      default: ''
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'none'],
      default: 'none'
    },
    hashtags: {
      type: [String],
      default: []
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    sharesCount: {
      type: Number,
      default: 0,
      min: 0
    },
    views: {
      type: Number,
      default: 0
    },
    thumbnailUrl: {
      type: String,
      default: ''
    },
    duration: {
      type: Number,
      default: 0
    },
    width: {
      type: Number,
      default: 0
    },
    height: {
      type: Number,
      default: 0
    },
    format: {
      type: String,
      default: ''
    },
    bytes: {
      type: Number,
      default: 0
    },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public'
    }
  },
  {
    timestamps: true
  }
);

// High-performance compound indexes for Reels and feed queries
postSchema.index({ mediaType: 1, createdAt: -1, _id: -1 });
postSchema.index({ visibility: 1, mediaType: 1, createdAt: -1, _id: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1, _id: -1 });
postSchema.index({ hashtags: 1 });

const Post = mongoose.model('Post', postSchema);
export default Post;
