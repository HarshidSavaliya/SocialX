import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Like must reference a post'],
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Like must reference a user'],
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index prevents duplicate likes from the same user
likeSchema.index({ post: 1, user: 1 }, { unique: true });

const Like = mongoose.model('Like', likeSchema);
export default Like;
