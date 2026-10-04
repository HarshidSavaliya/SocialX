import mongoose from 'mongoose';

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Story author is required']
    },
    mediaUrl: {
      type: String,
      required: [true, 'Story media URL is required']
    },
    mediaPublicId: {
      type: String,
      default: ''
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: [true, 'Media type must be image or video']
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [200, 'Caption cannot exceed 200 characters'],
      default: ''
    },
    privacy: {
      type: String,
      enum: ['public', 'followers'],
      default: 'public'
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required']
    }
  },
  {
    timestamps: true
  }
);

// Indexes for query performance and active story retrieval
storySchema.index({ user: 1, expiresAt: -1 });
// Background TTL cleanup index (asynchronous helper; code queries also strictly filter expiresAt > Date.now())
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Story = mongoose.model('Story', storySchema);
export default Story;
