import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import SecretConversation from '../models/SecretConversation.js';
import SecretMessage from '../models/SecretMessage.js';
import cloudinaryService from './cloudinaryService.js';
import { getIO } from '../socket/socketServer.js';

// In-memory rate limiting for PIN verification: key: `${conversationId}:${userId}` -> { count, lockedUntil }
const pinAttempts = new Map();

class SecretChatService {
  /**
   * Helper to emit to dedicated secret conversation room
   */
  emitToSecretRoom(conversationId, event, data) {
    try {
      const io = getIO();
      if (io) {
        io.to(`secret:conversation:${conversationId.toString()}`).emit(event, data);
      }
    } catch (err) {
      console.warn('Secret socket emit error:', err.message);
    }
  }

  /**
   * Generates a signed scoped Secret Session Token
   * Backend enforces that this token is required for all reading/writing in secret chats.
   */
  generateSecretToken(conversationId, userId) {
    return jwt.sign(
      {
        conversationId: conversationId.toString(),
        userId: userId.toString(),
        secretAccess: true
      },
      process.env.JWT_SECRET || 'socialx_jwt_secret_college_project_key_2026',
      { expiresIn: '2h' }
    );
  }

  /**
   * Start or initialize a Secret Chat with a target user
   */
  async startSecretChat({ currentUserId, targetUserId, pin, autoDeleteLimit = 20 }) {
    if (!targetUserId) {
      throw new Error('Target user ID is required');
    }

    if (currentUserId.toString() === targetUserId.toString()) {
      throw new Error('You cannot start a secret chat with yourself');
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser || targetUser.accountStatus === 'BLOCKED') {
      throw new Error('Target user does not exist or their account is suspended');
    }

    // Validate PIN (4-6 digits only)
    if (!pin || !/^\d{4,6}$/.test(pin.toString())) {
      throw new Error('PIN must be between 4 and 6 digits (numbers only)');
    }

    const parsedLimit = [20, 50, 100].includes(Number(autoDeleteLimit))
      ? Number(autoDeleteLimit)
      : 20;

    // Hash the PIN with bcrypt - never store raw PIN
    const salt = await bcrypt.genSalt(10);
    const pinHash = await bcrypt.hash(pin.toString(), salt);

    // Check if an active secret conversation already exists between these 2 users
    let conversation = await SecretConversation.findOne({
      participants: { $all: [currentUserId, targetUserId], $size: 2 },
      isActive: true
    }).populate('participants', 'name username profileImage bio accountStatus');

    if (conversation) {
      // Update PIN hash and limit for existing active session
      conversation.pinHash = pinHash;
      conversation.autoDeleteLimit = parsedLimit;
      await conversation.save();
    } else {
      // Create new secret conversation
      conversation = await SecretConversation.create({
        participants: [currentUserId, targetUserId],
        pinHash,
        autoDeleteLimit: parsedLimit,
        createdBy: currentUserId,
        isActive: true,
        lastMessageAt: new Date()
      });

      conversation = await SecretConversation.findById(conversation._id).populate(
        'participants',
        'name username profileImage bio accountStatus'
      );
    }

    const secretToken = this.generateSecretToken(conversation._id, currentUserId);

    return {
      conversation: {
        _id: conversation._id,
        participants: conversation.participants,
        autoDeleteLimit: conversation.autoDeleteLimit,
        createdBy: conversation.createdBy,
        isActive: conversation.isActive,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      },
      secretToken
    };
  }

  /**
   * Verify PIN for entering Secret Chat
   */
  async verifyPin({ conversationId, userId, pin }) {
    if (!conversationId) {
      throw new Error('Secret conversation ID is required');
    }

    if (!pin || !/^\d{4,6}$/.test(pin.toString())) {
      throw new Error('PIN must be 4 to 6 digits');
    }

    // Check rate limit
    const attemptKey = `${conversationId}:${userId}`;
    const now = Date.now();
    const attemptData = pinAttempts.get(attemptKey);

    if (attemptData && attemptData.lockedUntil && attemptData.lockedUntil > now) {
      const waitSec = Math.ceil((attemptData.lockedUntil - now) / 1000);
      throw new Error(`Too many incorrect attempts. Please wait ${waitSec} seconds before retrying.`);
    }

    const conversation = await SecretConversation.findById(conversationId)
      .select('+pinHash')
      .populate('participants', 'name username profileImage');

    if (!conversation || !conversation.isActive) {
      throw new Error('Secret conversation not found or has been closed');
    }

    // Check participant
    const isParticipant = conversation.participants.some(
      (p) => p._id.toString() === userId.toString()
    );

    if (!isParticipant) {
      const err = new Error('Access denied: You are not a participant in this secret chat');
      err.statusCode = 403;
      throw err;
    }

    // Compare hashed PIN
    const isMatch = await bcrypt.compare(pin.toString(), conversation.pinHash);

    if (!isMatch) {
      const count = (attemptData?.count || 0) + 1;
      let lockedUntil = null;
      if (count >= 5) {
        lockedUntil = now + 5 * 60 * 1000; // 5 minute lockout
      }
      pinAttempts.set(attemptKey, { count, lockedUntil });
      const err = new Error('Incorrect security PIN. Access denied.');
      err.statusCode = 401;
      throw err;
    }

    // PIN is correct - reset rate limit and issue scoped token
    pinAttempts.delete(attemptKey);
    const secretToken = this.generateSecretToken(conversation._id, userId);

    return {
      conversation: {
        _id: conversation._id,
        participants: conversation.participants,
        autoDeleteLimit: conversation.autoDeleteLimit,
        createdBy: conversation.createdBy,
        isActive: conversation.isActive,
        createdAt: conversation.createdAt
      },
      secretToken
    };
  }

  /**
   * List all active secret conversations for current user
   */
  async getSecretConversations(userId) {
    const conversations = await SecretConversation.find({
      participants: userId,
      isActive: true
    })
      .populate('participants', 'name username profileImage')
      .sort({ lastMessageAt: -1 })
      .lean();

    // Map other participant
    return conversations.map((c) => {
      const otherUser = c.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );
      return {
        ...c,
        otherUser
      };
    });
  }

  /**
   * Get messages for a secret conversation
   */
  async getMessages(conversationId) {
    const messages = await SecretMessage.find({ conversation: conversationId })
      .populate('sender', 'name username profileImage')
      .sort({ createdAt: 1 })
      .lean();

    // Sanitize view-once messages that have already been viewed
    return messages.map((m) => {
      if (m.isViewOnce && m.viewed) {
        return {
          ...m,
          mediaUrl: null, // Clear URL so consumed media cannot be fetched again
          mediaPublicId: null
        };
      }
      return m;
    });
  }

  /**
   * Send a text or media message in Secret Chat
   */
  async sendMessage({ conversationId, senderId, text = '', file, isViewOnce = false }) {
    const conversation = await SecretConversation.findById(conversationId);
    if (!conversation || !conversation.isActive) {
      throw new Error('Secret conversation not found or has been closed');
    }

    let mediaUrl = null;
    let mediaPublicId = null;
    let messageType = 'text';

    if (file) {
      const isVideo = file.mimetype.startsWith('video/');
      const isImage = file.mimetype.startsWith('image/');

      if (!isImage && !isVideo) {
        throw new Error('Unsupported file type. Only images and videos are permitted');
      }

      messageType = isVideo ? 'video' : 'image';

      // Upload media to isolated Cloudinary folder for secret chats
      const uploadResult = await cloudinaryService.uploadMedia(
        file.buffer,
        'socialx/secret_chat',
        isVideo ? 'video' : 'image',
        file.mimetype
      );

      mediaUrl = uploadResult.url;
      mediaPublicId = uploadResult.publicId;
    }

    if (!text?.trim() && !mediaUrl) {
      throw new Error('Message content or media attachment is required');
    }

    const message = await SecretMessage.create({
      conversation: conversationId,
      sender: senderId,
      messageType,
      content: text ? text.trim() : '',
      mediaUrl,
      mediaPublicId,
      isViewOnce: Boolean(isViewOnce && mediaUrl),
      viewed: false
    });

    // Update conversation timestamp
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Enforce server-side auto-delete limit (20, 50, 100)
    await this.enforceAutoDeleteLimit(conversationId, conversation.autoDeleteLimit);

    const populatedMessage = await SecretMessage.findById(message._id)
      .populate('sender', 'name username profileImage')
      .lean();

    // Broadcast to dedicated secret socket room
    this.emitToSecretRoom(conversationId, 'secret:message:new', populatedMessage);

    return populatedMessage;
  }

  /**
   * Enforces server-side auto-delete limit
   * Automatically deletes oldest messages & removes media from Cloudinary
   */
  async enforceAutoDeleteLimit(conversationId, limit = 20) {
    const count = await SecretMessage.countDocuments({ conversation: conversationId });
    if (count > limit) {
      const excess = count - limit;
      const oldestMessages = await SecretMessage.find({ conversation: conversationId })
        .sort({ createdAt: 1 })
        .limit(excess)
        .lean();

      // Delete Cloudinary assets for pruned messages
      for (const msg of oldestMessages) {
        if (msg.mediaPublicId) {
          await cloudinaryService.deleteMedia(msg.mediaPublicId, msg.messageType);
        }
      }

      const idsToDelete = oldestMessages.map((m) => m._id);
      await SecretMessage.deleteMany({ _id: { $in: idsToDelete } });

      // Notify clients to prune messages
      this.emitToSecretRoom(conversationId, 'secret:messages:pruned', {
        conversationId,
        deletedIds: idsToDelete
      });
    }
  }

  /**
   * Mark view-once media as viewed, invalidate access, and delete asset from Cloudinary
   */
  async viewOnceMedia(messageId, userId) {
    const message = await SecretMessage.findById(messageId);
    if (!message) {
      throw new Error('Secret message not found');
    }

    if (!message.isViewOnce) {
      throw new Error('This message is not marked as view-once');
    }

    if (message.sender.toString() === userId.toString()) {
      throw new Error('Sender cannot trigger view-once expiration on their own message');
    }

    if (message.viewed) {
      throw new Error('This media has already been viewed and permanently burned');
    }

    // Immediately destroy asset in Cloudinary
    if (message.mediaPublicId) {
      await cloudinaryService.deleteMedia(message.mediaPublicId, message.messageType);
    }

    // Invalidate media on the server immediately
    message.viewed = true;
    message.viewedAt = new Date();
    message.viewedBy = [userId];
    message.mediaUrl = null; // Erase URL so it cannot be fetched again
    message.mediaPublicId = null;
    await message.save();

    // Broadcast view-once event to secret conversation room
    this.emitToSecretRoom(message.conversation, 'secret:message:view', {
      messageId: message._id,
      conversationId: message.conversation,
      viewed: true,
      viewedAt: message.viewedAt
    });

    return {
      messageId: message._id,
      viewed: true,
      viewedAt: message.viewedAt
    };
  }

  /**
   * Update Secret Chat settings (e.g. autoDeleteLimit)
   */
  async updateSettings(conversationId, { autoDeleteLimit }) {
    const parsedLimit = [20, 50, 100].includes(Number(autoDeleteLimit))
      ? Number(autoDeleteLimit)
      : null;

    if (!parsedLimit) {
      throw new Error('Valid autoDeleteLimit (20, 50, 100) is required');
    }

    const conversation = await SecretConversation.findById(conversationId);
    if (!conversation || !conversation.isActive) {
      throw new Error('Secret conversation not found');
    }

    conversation.autoDeleteLimit = parsedLimit;
    await conversation.save();

    // Enforce the new limit immediately
    await this.enforceAutoDeleteLimit(conversationId, parsedLimit);

    this.emitToSecretRoom(conversationId, 'secret:conversation:settings-updated', {
      conversationId,
      autoDeleteLimit: parsedLimit
    });

    return conversation;
  }

  /**
   * Delete Chat on Exit
   * Wipes all SecretMessage records, deletes Cloudinary assets, and closes conversation
   */
  async exitAndWipe(conversationId) {
    const conversation = await SecretConversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Secret conversation not found');
    }

    // Find all messages to remove Cloudinary assets
    const messages = await SecretMessage.find({ conversation: conversationId }).lean();
    for (const msg of messages) {
      if (msg.mediaPublicId) {
        await cloudinaryService.deleteMedia(msg.mediaPublicId, msg.messageType);
      }
    }

    // Delete all secret messages
    await SecretMessage.deleteMany({ conversation: conversationId });

    // Mark conversation inactive or delete
    conversation.isActive = false;
    await conversation.save();

    // Notify room of wipe
    this.emitToSecretRoom(conversationId, 'secret:conversation:wiped', {
      conversationId,
      message: 'Secret conversation was closed and all messages have been wiped.'
    });

    return {
      success: true,
      message: 'Secret chat messages wiped and conversation closed successfully'
    };
  }
}

export default new SecretChatService();
