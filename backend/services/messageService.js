import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import notificationService from './notificationService.js';
import cloudinaryService from './cloudinaryService.js';
import { emitToConversation } from '../socket/socketServer.js';

class MessageService {
  /**
   * Generates a deterministic participant key for 1-to-1 conversations.
   * Ensures sort([userA, userB]).join('_') is always identical regardless of who initiates.
   */
  getParticipantKey(userId1, userId2) {
    return [userId1.toString(), userId2.toString()].sort().join('_');
  }

  /**
   * Helper to encode cursor object { createdAt, _id } into a base64 string
   */
  encodeCursor(message) {
    if (!message) return null;
    const data = {
      createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
      _id: message._id.toString()
    };
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  /**
   * Helper to decode cursor base64 string back into { createdAt, _id }
   */
  decodeCursor(cursorStr) {
    try {
      const decoded = Buffer.from(cursorStr, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      return {
        createdAt: new Date(parsed.createdAt),
        _id: new mongoose.Types.ObjectId(parsed._id)
      };
    } catch {
      return null;
    }
  }

  /**
   * Find or create a concurrency-safe 1-to-1 conversation between two users.
   * Uses atomic upsert with participantKey unique index to prevent duplicate conversations.
   */
  async getOrCreateConversation(userId1, userId2) {
    if (userId1.toString() === userId2.toString()) {
      const err = new Error('You cannot message yourself');
      err.statusCode = 400;
      throw err;
    }

    const [sender, receiver] = await Promise.all([
      User.findById(userId1).select('name username profileImage accountStatus blockedUsers'),
      User.findById(userId2).select('name username profileImage accountStatus blockedUsers')
    ]);

    if (!receiver) {
      const err = new Error('Recipient user not found');
      err.statusCode = 404;
      throw err;
    }

    if (receiver.accountStatus === 'BLOCKED' || sender?.accountStatus === 'BLOCKED') {
      const err = new Error('Communication restricted: Account suspended');
      err.statusCode = 403;
      throw err;
    }

    // Check block list in both directions
    const isBlockedByReceiver = receiver.blockedUsers?.some(
      (b) => b.toString() === userId1.toString()
    );
    const hasBlockedReceiver = sender?.blockedUsers?.some(
      (b) => b.toString() === userId2.toString()
    );

    if (isBlockedByReceiver || hasBlockedReceiver) {
      const err = new Error('Cannot message this user due to privacy or block settings');
      err.statusCode = 403;
      throw err;
    }

    const participantKey = this.getParticipantKey(userId1, userId2);

    let conversation = await Conversation.findOneAndUpdate(
      { participantKey },
      {
        $setOnInsert: {
          participants: [userId1, userId2],
          participantKey,
          unreadCounts: {},
          lastMessageAt: new Date()
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .populate('participants', 'name username profileImage')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name username profileImage' }
      });

    return conversation;
  }

  /**
   * Send a new message.
   * Concurrency-safe idempotency via clientMessageId.
   * Emits via Socket.IO and atomically tracks unread counts.
   */
  async sendMessage({
    senderId,
    receiverId,
    conversationId = null,
    text = '',
    mediaUrl = null,
    mediaPublicId = null,
    mediaType = null,
    replyTo = null,
    clientMessageId = null
  }) {
    if (!text?.trim() && !mediaUrl) {
      const err = new Error('Message cannot be empty');
      err.statusCode = 400;
      throw err;
    }

    if (text && text.trim().length > 2000) {
      const err = new Error('Message cannot exceed 2000 characters');
      err.statusCode = 400;
      throw err;
    }

    let conversation;
    if (conversationId && !receiverId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        const err = new Error('Conversation not found');
        err.statusCode = 404;
        throw err;
      }
      const other = conversation.participants.find((p) => p.toString() !== senderId.toString());
      if (!other) {
        const err = new Error('Invalid conversation participants');
        err.statusCode = 400;
        throw err;
      }
      receiverId = other.toString();
    } else {
      conversation = await this.getOrCreateConversation(senderId, receiverId);
    }
    const targetConversationId = conversation._id;

    // Idempotency check: if message with this clientMessageId already exists, return it
    if (clientMessageId) {
      const existingMessage = await Message.findOne({
        conversation: targetConversationId,
        clientMessageId
      })
        .populate('sender', 'name username profileImage')
        .populate('receiver', 'name username profileImage')
        .populate({
          path: 'replyTo',
          select: 'text mediaUrl mediaType sender',
          populate: { path: 'sender', select: 'name username' }
        });

      if (existingMessage) {
        return existingMessage;
      }
    }

    // Reply Validation: verify replied message belongs to this conversation
    let validatedReplyId = null;
    if (replyTo) {
      const originalMessage = await Message.findOne({
        _id: replyTo,
        conversation: conversationId
      });
      if (!originalMessage) {
        const err = new Error('Replied message does not exist in this conversation');
        err.statusCode = 400;
        throw err;
      }
      validatedReplyId = originalMessage._id;
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      receiver: receiverId,
      clientMessageId: clientMessageId || null,
      text: text ? text.trim() : '',
      mediaUrl,
      mediaPublicId,
      mediaType,
      replyTo: validatedReplyId,
      isRead: false
    });

    // Atomically update conversation last message and increment recipient unread count
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
      $inc: { [`unreadCounts.${receiverId.toString()}`]: 1 }
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'name username profileImage')
      .populate('receiver', 'name username profileImage')
      .populate({
        path: 'replyTo',
        select: 'text mediaUrl mediaType sender',
        populate: { path: 'sender', select: 'name username' }
      });

    // Emit real-time message to conversation room
    emitToConversation(conversationId.toString(), 'message:new', populated);

    // Persist notification once for recipient
    if (senderId.toString() !== receiverId.toString()) {
      const sender = await User.findById(senderId).select('name username');
      notificationService
        .createNotification({
          recipient: receiverId,
          sender: senderId,
          type: 'MESSAGE',
          title: 'New Message',
          message: `${sender?.name || 'Someone'} sent you a message`,
          relatedConversation: conversationId
        })
        .catch((e) => console.warn('Message notification warning:', e.message));
    }

    return populated;
  }

  /**
   * Get all conversations for a user, sorted by most recent message.
   * Unread counts read directly from conversation unreadCounts map in O(1).
   */
  async getConversations(userId) {
    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    const conversations = await Conversation.find({
      participants: userObjectId
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'name username profileImage')
      .populate({
        path: 'lastMessage',
        select: 'text sender createdAt isRead mediaUrl mediaType',
        populate: { path: 'sender', select: 'name username' }
      })
      .lean();

    if (!conversations || conversations.length === 0) {
      return [];
    }

    return conversations.map((conv) => {
      const otherUser = conv.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );
      const unread = conv.unreadCounts?.[userId.toString()] ?? 0;

      return {
        _id: conv._id,
        otherUser,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: unread,
        createdAt: conv.createdAt
      };
    });
  }

  /**
   * Get messages for a conversation using stable cursor-based pagination.
   * Query pattern: { conversation, createdAt: -1, _id: -1 }.
   * No large skip queries.
   */
  async getMessages(conversationId, userId, { cursor = null, limit = 30, page = null } = {}) {
    const conversation = await Conversation.findById(conversationId)
      .select('participants')
      .lean();

    if (!conversation) {
      const err = new Error('Conversation not found');
      err.statusCode = 404;
      throw err;
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      const err = new Error('Not authorized to access this conversation');
      err.statusCode = 403;
      throw err;
    }

    const limitNum = Math.max(1, Math.min(100, Number(limit) || 30));
    const query = { conversation: conversationId };

    // Support cursor pagination with backward-compatible page fallback
    if (cursor) {
      const decoded = this.decodeCursor(cursor);
      if (decoded) {
        query.$or = [
          { createdAt: { $lt: decoded.createdAt } },
          { createdAt: decoded.createdAt, _id: { $lt: decoded._id } }
        ];
      }
    } else if (page && Number(page) > 1) {
      const skip = (Number(page) - 1) * limitNum;
      const [messages, total] = await Promise.all([
        Message.find(query)
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(limitNum)
          .populate('sender', 'name username profileImage')
          .populate({
            path: 'replyTo',
            select: 'text mediaUrl mediaType sender',
            populate: { path: 'sender', select: 'name username' }
          })
          .lean(),
        Message.countDocuments({ conversation: conversationId })
      ]);

      return {
        messages,
        pagination: {
          page: Number(page),
          limit: limitNum,
          total,
          hasNextPage: skip + messages.length < total
        }
      };
    }

    // Fetch limit + 1 items to determine if more items exist
    const rawMessages = await Message.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limitNum + 1)
      .populate('sender', 'name username profileImage')
      .populate({
        path: 'replyTo',
        select: 'text mediaUrl mediaType sender',
        populate: { path: 'sender', select: 'name username' }
      })
      .lean();

    const hasMore = rawMessages.length > limitNum;
    const batch = hasMore ? rawMessages.slice(0, limitNum) : rawMessages;

    // Calculate nextCursor from the oldest item in the returned batch
    const oldestItem = batch[batch.length - 1];
    const nextCursor = hasMore && oldestItem ? this.encodeCursor(oldestItem) : null;

    // Reverse batch so client receives messages in chronological order (oldest to newest)
    const messages = batch.reverse();

    return {
      messages,
      nextCursor,
      hasMore,
      pagination: {
        hasNextPage: hasMore,
        nextCursor
      }
    };
  }

  /**
   * Mark all unread messages in a conversation as read for the current user.
   * Atomically resets unread count on Conversation and bulk-updates messages.
   */
  async markMessagesAsRead(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      const err = new Error('Conversation not found');
      err.statusCode = 404;
      throw err;
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      const err = new Error('Not authorized to access this conversation');
      err.statusCode = 403;
      throw err;
    }

    // Atomically reset unread counter for this user
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`unreadCounts.${userId.toString()}`]: 0 }
    });

    const result = await Message.updateMany(
      { conversation: conversationId, receiver: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    // Notify participants in real-time
    emitToConversation(conversationId.toString(), 'message:read', {
      conversationId,
      readBy: userId
    });

    return { updated: result.modifiedCount };
  }

  /**
   * Delete a message. Only the sender can delete their own message.
   * Cleans up Cloudinary media asset if one was attached.
   */
  async deleteMessage(messageId, userId) {
    const message = await Message.findById(messageId);
    if (!message) {
      const err = new Error('Message not found');
      err.statusCode = 404;
      throw err;
    }

    if (message.sender.toString() !== userId.toString()) {
      const err = new Error('Not authorized to delete this message');
      err.statusCode = 403;
      throw err;
    }

    const conversationId = message.conversation.toString();

    // Clean up media asset from Cloudinary
    if (message.mediaPublicId) {
      await cloudinaryService.deleteMedia(message.mediaPublicId, message.mediaType || 'image');
    }

    await message.deleteOne();

    emitToConversation(conversationId, 'message:deleted', {
      messageId,
      conversationId
    });

    return { success: true, messageId };
  }

  /**
   * React to a message with an emoji.
   * Concurrency-safe: one reaction per user per message (toggle off if same emoji).
   */
  async reactToMessage(messageId, userId, emoji) {
    const message = await Message.findById(messageId);
    if (!message) {
      const err = new Error('Message not found');
      err.statusCode = 404;
      throw err;
    }

    // Verify user belongs to conversation
    const conversation = await Conversation.findById(message.conversation).select('participants');
    if (!conversation?.participants.some((p) => p.toString() === userId.toString())) {
      const err = new Error('Not authorized to react to messages in this conversation');
      err.statusCode = 403;
      throw err;
    }

    if (!message.reactions) {
      message.reactions = [];
    }

    const existingIdx = message.reactions.findIndex(
      (r) => r.user.toString() === userId.toString()
    );

    if (existingIdx > -1) {
      if (message.reactions[existingIdx].emoji === emoji) {
        // Toggle off if same emoji clicked
        message.reactions.splice(existingIdx, 1);
      } else {
        // Update to new emoji
        message.reactions[existingIdx].emoji = emoji;
      }
    } else {
      message.reactions.push({ user: userId, emoji });
    }

    await message.save();

    emitToConversation(message.conversation.toString(), 'message:reaction', {
      messageId: message._id,
      reactions: message.reactions,
      userId,
      emoji
    });

    return { messageId: message._id, reactions: message.reactions };
  }

  /**
   * Toggle star/favorite status on a message.
   */
  async toggleStarMessage(messageId) {
    const message = await Message.findById(messageId);
    if (!message) {
      const err = new Error('Message not found');
      err.statusCode = 404;
      throw err;
    }
    message.isStarred = !message.isStarred;
    await message.save();
    return { messageId: message._id, isStarred: message.isStarred };
  }
}

export default new MessageService();
