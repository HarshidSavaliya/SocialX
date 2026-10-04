import mongoose from 'mongoose';

const callSessionSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null
    },
    channelName: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    callerUid: {
      type: Number,
      required: true
    },
    receiverUid: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: [
        'initiated',
        'ringing',
        'accepted',
        'active',
        'rejected',
        'missed',
        'ended',
        'busy',
        'failed'
      ],
      default: 'initiated'
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    answeredAt: {
      type: Date,
      default: null
    },
    endedAt: {
      type: Date,
      default: null
    },
    endedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    duration: {
      type: Number,
      default: 0 // Duration in seconds
    },
    callType: {
      type: String,
      enum: ['video', 'audio'],
      default: 'video'
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for optimal querying (user call history and active calls)
callSessionSchema.index({ caller: 1, createdAt: -1 });
callSessionSchema.index({ receiver: 1, createdAt: -1 });
callSessionSchema.index({ caller: 1, status: 1 });
callSessionSchema.index({ receiver: 1, status: 1 });

const CallSession = mongoose.model('CallSession', callSessionSchema);

export default CallSession;
