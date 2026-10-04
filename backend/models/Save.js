import mongoose from 'mongoose';

const saveSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Post reference is required'],
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Unique compound index: prevents duplicate saves of the same post by the same user
saveSchema.index({ user: 1, post: 1 }, { unique: true });
saveSchema.index({ user: 1, createdAt: -1 });

const Save = mongoose.model('Save', saveSchema);
export default Save;
