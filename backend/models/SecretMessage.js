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
    messageType: {
      type: String,
      enum: ['text', 'image', 'video'],
      default: 'text'
    },
    // End-to-End Encrypted Message Payload (AES-256-GCM)
    // Server never receives or stores plaintext secret messages
    ciphertext: {
      type: String,
      default: ''
    },
    iv: {
      type: String,
      default: null
    },
    authTag: {
      type: String,
      default: null
    },
    encryptedMetadata: {
      type: String,
      default: null
    },
    // End-to-End Encrypted Media (Binary encrypted with AES-256-GCM before upload)
    mediaUrl: {
      type: String,
      default: null
    },
    mediaPublicId: {
      type: String,
      default: null
    },
    mediaIv: {
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

secretMessageSchema.index({ conversation: 1, createdAt: -1, _id: -1 });
secretMessageSchema.index({ conversation: 1, viewed: 1 });
secretMessageSchema.index({ conversation: 1, clientMessageId: 1 }, { sparse: true });

const SecretMessage = mongoose.model('SecretMessage', secretMessageSchema);
export default SecretMessage;
