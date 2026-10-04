import mongoose from 'mongoose';

const secretMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SecretConversation',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video'],
      default: 'text'
    },
    content: {
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
    isViewOnce: {
      type: Boolean,
      default: false
    },
    viewed: {
      type: Boolean,
      default: false,
      index: true
    },
    viewedAt: {
      type: Date,
      default: null
    },
    viewedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true
  }
);

secretMessageSchema.index({ conversation: 1, createdAt: 1 });
secretMessageSchema.index({ conversation: 1, viewed: 1 });

const SecretMessage = mongoose.model('SecretMessage', secretMessageSchema);
export default SecretMessage;
