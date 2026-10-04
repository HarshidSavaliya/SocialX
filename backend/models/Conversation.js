import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Compound index to quickly find user conversations ordered by most recent message
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
