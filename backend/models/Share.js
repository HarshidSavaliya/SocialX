import mongoose from 'mongoose';

const shareSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Share must reference a post'],
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Share must reference a user'],
      index: true
    }
  },
  {
    timestamps: true
  }
);

shareSchema.index({ post: 1, user: 1 });
shareSchema.index({ user: 1, createdAt: -1 });

const Share = mongoose.model('Share', shareSchema);
export default Share;
