import mongoose from 'mongoose';

const adminActionSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin user reference is required'],
      index: true
    },
    actionType: {
      type: String,
      enum: ['BLOCK_USER', 'UNBLOCK_USER', 'DELETE_POST', 'UPDATE_ROLE'],
      required: true,
      index: true
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    targetPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null
    },
    description: {
      type: String,
      required: [true, 'Action description is required'],
      trim: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

adminActionSchema.index({ createdAt: -1 });

const AdminAction = mongoose.model('AdminAction', adminActionSchema);
export default AdminAction;
