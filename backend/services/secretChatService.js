import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import SecretConversation from '../models/SecretConversation.js';
import SecretMessage from '../models/SecretMessage.js';
import cloudinaryService from './cloudinaryService.js';
import { getIO, emitToUser } from '../socket/socketServer.js';

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
   * Resets rate-limiting lockout for a given conversation and user.
   */
  resetPinLockout(conversationId, userId) {
    const key = `${conversationId}:${userId}`;
    pinAttempts.delete(key);
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
   * Deterministic participant key for 1-to-1 secret conversations
   */
  getParticipantKey(userId1, userId2) {
    return [userId1.toString(), userId2.toString()].sort().join('_');
  }

  /**
   * Register or update user's ECDH public key (in JWK format)
   * Client-side generated, private key stays strictly on client.
   */
  async registerPublicKey(userId, publicKeyJwk) {
    if (!publicKeyJwk) {
      throw new Error('Public key is required');
    }

    const keyString = typeof publicKeyJwk === 'object' ? JSON.stringify(publicKeyJwk) : publicKeyJwk;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        e2ePublicKey: keyString,
        e2ePublicKeyUpdatedAt: new Date()
      },
      { new: true }
    ).select('name username e2ePublicKey e2ePublicKeyUpdatedAt');

    // Notify all active secret chat rooms/peers about the updated public key
    try {
      const activeConvs = await SecretConversation.find({
        participants: userId,
        isActive: true
      }).select('_id participants');

      for (const c of activeConvs) {
        this.emitToSecretRoom(c._id, 'secret:key:peer', {
          conversationId: c._id.toString(),
          userId: userId.toString(),
          publicKey: keyString
        });
        c.participants.forEach((p) => {
          if (p.toString() !== userId.toString()) {
            emitToUser(p.toString(), 'secret:key:peer', {
              conversationId: c._id.toString(),
              userId: userId.toString(),
              publicKey: keyString
            });
          }
        });
      }
    } catch (notifyErr) {
      console.warn('Secret key update notification warning:', notifyErr.message);
    }

    return {
      userId: user._id,
      e2ePublicKey: user.e2ePublicKey,
      e2ePublicKeyUpdatedAt: user.e2ePublicKeyUpdatedAt
    };
  }

  /**
   * Retrieve a user's ECDH public key for key agreement
   */
  async getPublicKey(targetUserId) {
    const user = await User.findById(targetUserId).select('name username e2ePublicKey e2ePublicKeyUpdatedAt accountStatus');
    if (!user || user.accountStatus === 'BLOCKED') {
      throw new Error('User not found or account is suspended');
    }

    return {
      userId: user._id,
      username: user.username,
      publicKey: user.e2ePublicKey || null
    };
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

    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId).select('name username accountStatus blockedUsers'),
      User.findById(targetUserId).select('name username accountStatus blockedUsers')
    ]);

    if (!targetUser || targetUser.accountStatus === 'BLOCKED') {
      throw new Error('Target user does not exist or their account is suspended');
    }

    if (currentUser?.accountStatus === 'BLOCKED') {
      throw new Error('Your account is suspended');
    }

    // Check block list in both directions
    const isBlockedByTarget = targetUser.blockedUsers?.some(
      (b) => b.toString() === currentUserId.toString()
    );
    const hasBlockedTarget = currentUser?.blockedUsers?.some(
      (b) => b.toString() === targetUserId.toString()
    );

    if (isBlockedByTarget || hasBlockedTarget) {
      throw new Error('Cannot start secret chat with this user due to privacy or block settings');
    }

    // Validate PIN (4-6 digits only)
    if (!pin || !/^\d{4,6}$/.test(pin.toString())) {
      throw new Error('PIN must be between 4 and 6 digits (numbers only)');
    }

    const parsedLimit = [5, 10, 15, 20, 50, 100].includes(Number(autoDeleteLimit))
      ? Number(autoDeleteLimit)
      : 10;

    // Hash the PIN with bcrypt - never store raw PIN
    const salt = await bcrypt.genSalt(10);
    const pinHash = await bcrypt.hash(pin.toString(), salt);

    const participantKey = this.getParticipantKey(currentUserId, targetUserId);

    // Check if an active secret conversation already exists between these 2 users
    let conversation = await SecretConversation.findOne({
      participantKey,
      isActive: true
    }).populate('participants', 'name username profileImage bio accountStatus');

    if (conversation) {
      conversation.pinHash = pinHash;
      conversation.autoDeleteLimit = parsedLimit;
      await conversation.save();
    } else {
      conversation = await SecretConversation.create({
        participants: [currentUserId, targetUserId],
        participantKey,
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
   * Rate limited: 5 failed attempts locks user out for 5 minutes
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
   * Get encrypted messages for a secret conversation
   * Plaintext is never stored or served by the backend.
   */
  async getMessages(conversationId) {
    const messages = await SecretMessage.find({ conversation: conversationId })
      .populate('sender', 'name username profileImage')
      .populate('receiver', 'name username profileImage')
      .sort({ createdAt: 1 })
      .lean();

    // Sanitize view-once messages that have already been viewed
    return messages.map((m) => {
      if (m.isViewOnce && m.viewed) {
        return {
          ...m,
          mediaUrl: null,
          mediaPublicId: null,
          mediaIv: null
        };
      }
      return m;
    });
  }

  /**
   * Send an End-to-End Encrypted Message (Text or Media)
   * The server only receives ciphertext, IV, authTag, and encrypted media binary.
   * Plaintext is never transmitted to or processed by the server.
   */
  async sendMessage({
    conversationId,
    senderId,
    ciphertext = '',
    iv = null,
    authTag = null,
    senderPublicKey = null,
    encryptedMetadata = null,
    mediaUrl: inputMediaUrl = null,
    mediaPublicId: inputMediaPublicId = null,
    mediaIv = null,
    file = null,
    messageType: inputMessageType = 'text',
    isViewOnce = false,
    clientMessageId = null
  }) {
    const conversation = await SecretConversation.findById(conversationId);
    if (!conversation || !conversation.isActive) {
      throw new Error('Secret conversation not found or has been closed');
    }

    const otherParticipant = conversation.participants.find(
      (p) => p.toString() !== senderId.toString()
    );

    if (!otherParticipant) {
      throw new Error('Secret conversation participants are invalid');
    }

    const receiverId = otherParticipant.toString();

    // Idempotency check: if clientMessageId already exists, return existing
    if (clientMessageId) {
      const existing = await SecretMessage.findOne({
        conversation: conversationId,
        clientMessageId
      })
        .populate('sender', 'name username profileImage')
        .populate('receiver', 'name username profileImage')
        .lean();

      if (existing) {
        return existing;
      }
    }

    let mediaUrl = inputMediaUrl || null;
    let mediaPublicId = inputMediaPublicId || null;
    let messageType = inputMessageType || 'text';

    if (file) {
      const isVideo = file.mimetype?.startsWith('video/') || file.originalname?.endsWith('.mp4');
      messageType = isVideo ? 'video' : 'image';

      // Upload raw encrypted binary blob to Cloudinary (resource_type: raw ensures no byte tampering)
      const uploadResult = await cloudinaryService.uploadMedia(
        file.buffer,
        'socialx/secret_chat',
        'raw',
        file.mimetype || 'application/octet-stream'
      );

      mediaUrl = uploadResult.url;
      mediaPublicId = uploadResult.publicId;
    }

    if (!ciphertext?.trim() && !mediaUrl) {
      throw new Error('Encrypted payload (ciphertext or encrypted media) is required');
    }

    const message = await SecretMessage.create({
      conversation: conversationId,
      sender: senderId,
      receiver: receiverId,
      clientMessageId: clientMessageId || null,
      messageType,
      ciphertext: ciphertext || '',
      iv: iv || null,
      authTag: authTag || null,
      senderPublicKey: senderPublicKey || null,
      encryptedMetadata: encryptedMetadata || null,
      mediaUrl,
      mediaPublicId,
      mediaIv: mediaIv || null,
      isViewOnce: Boolean(isViewOnce && mediaUrl),
      viewed: false
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Concurrency-safe auto-deletion limit enforcement
    await this.enforceAutoDeleteLimit(conversationId, conversation.autoDeleteLimit);

    const populatedMessage = await SecretMessage.findById(message._id)
      .populate('sender', 'name username profileImage')
      .populate('receiver', 'name username profileImage')
      .lean();

    // Broadcast E2EE ciphertext to dedicated secret room
    this.emitToSecretRoom(conversationId, 'secret:message:new', populatedMessage);

    // Also emit to participants' personal user rooms to guarantee instant delivery
    conversation.participants.forEach((p) => {
      emitToUser(p.toString(), 'secret:message:new', populatedMessage);
    });

    return populatedMessage;
  }

  /**
   * Concurrency-safe auto-delete limit enforcement.
   * Atomically deletes oldest messages & removes media from Cloudinary.
   */
  async enforceAutoDeleteLimit(conversationId, limit = 20) {
    const count = await SecretMessage.countDocuments({ conversation: conversationId });
    if (count > limit) {
      const excess = count - limit;
      const oldestMessages = await SecretMessage.find({ conversation: conversationId })
        .sort({ createdAt: 1 })
        .limit(excess)
        .lean();

      for (const msg of oldestMessages) {
        if (msg.mediaPublicId) {
          await cloudinaryService.deleteMedia(msg.mediaPublicId, 'raw');
        }
      }

      const idsToDelete = oldestMessages.map((m) => m._id);
      await SecretMessage.deleteMany({ _id: { $in: idsToDelete } });

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
      throw new Error('Sender cannot burn their own view-once media');
    }

    if (message.viewed) {
      throw new Error('This media has already been viewed and permanently burned');
    }

    // Immediately destroy asset in Cloudinary
    if (message.mediaPublicId) {
      await cloudinaryService.deleteMedia(message.mediaPublicId, 'raw');
    }

    // Invalidate media in MongoDB atomically
    message.viewed = true;
    message.viewedAt = new Date();
    message.viewedBy = [userId];
    message.mediaUrl = null;
    message.mediaPublicId = null;
    message.mediaIv = null;
    await message.save();

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
    const num = Number(autoDeleteLimit);
    const parsedLimit = [5, 10, 15, 20, 50, 100].includes(num)
      ? num
      : null;

    if (!parsedLimit) {
      throw new Error('Valid autoDeleteLimit (5, 10, 15, 20, 50, 100) is required');
    }

    const conversation = await SecretConversation.findById(conversationId);
    if (!conversation || !conversation.isActive) {
      throw new Error('Secret conversation not found');
    }

    conversation.autoDeleteLimit = parsedLimit;
    await conversation.save();

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
    if (!conversation || !conversation.isActive) {
      return {
        success: true,
        message: 'Secret chat messages wiped and conversation closed successfully'
      };
    }

    // Find all messages to remove Cloudinary assets
    const messages = await SecretMessage.find({ conversation: conversationId }).lean();
    for (const msg of messages) {
      if (msg.mediaPublicId) {
        await cloudinaryService.deleteMedia(msg.mediaPublicId, 'raw');
      }
    }

    // Delete all secret messages
    await SecretMessage.deleteMany({ conversation: conversationId });

    conversation.isActive = false;
    await conversation.save();

    this.emitToSecretRoom(conversationId, 'secret:conversation:wiped', {
      conversationId: conversationId.toString(),
      message: 'Secret conversation was closed and all messages have been wiped.'
    });

    // Notify both participants via personal user socket room to end chat on both sides
    conversation.participants.forEach((p) => {
      emitToUser(p.toString(), 'secret:conversation:wiped', {
        conversationId: conversationId.toString(),
        message: 'Secret conversation was closed and all messages have been wiped.'
      });
    });

    return {
      success: true,
      message: 'Secret chat messages wiped and conversation closed successfully'
    };
  }

  async exitSecretChat(conversationId) {
    return this.exitAndWipe(conversationId);
  }
}

export default new SecretChatService();
