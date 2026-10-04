import mongoose from 'mongoose';

const secretConversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    pinHash: {
      type: String,
      required: [true, 'Security PIN hash is required'],
      select: false // Never leak hashed PIN in standard API queries
    },
    autoDeleteLimit: {
      type: Number,
      enum: [5, 10, 15, 20, 50, 100],
      default: 10
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

secretConversationSchema.index({ participants: 1, isActive: 1 });
secretConversationSchema.index({ lastMessageAt: -1 });

const SecretConversation = mongoose.model('SecretConversation', secretConversationSchema);
export default SecretConversation;
