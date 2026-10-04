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
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for high-performance feed queries
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ hashtags: 1 });

const Post = mongoose.model('Post', postSchema);
export default Post;
