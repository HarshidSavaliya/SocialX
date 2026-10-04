import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    clientMessageId: {
      type: String,
      default: null
    },
    text: {
      type: String,
      trim: true,
      default: ''
    },
    mediaUrl: {
      type: String,
      default: null
    },
    mediaPublicId: {
      type: String,
      default: null
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'audio', null],
      default: null
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String, required: true }
      }
    ],
    isStarred: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound index for stable cursor pagination
messageSchema.index({ conversation: 1, createdAt: -1, _id: -1 });
// Sparse index for message idempotency/deduplication
messageSchema.index({ conversation: 1, clientMessageId: 1 }, { sparse: true });
// Index for unread queries
messageSchema.index({ receiver: 1, isRead: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
