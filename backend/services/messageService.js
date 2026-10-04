import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import notificationService from './notificationService.js';
import { emitToConversation, emitToUser } from '../socket/socketServer.js';

class MessageService {
  /**
   * Find or create a 1-to-1 conversation between two users.
   */
  async getOrCreateConversation(userId1, userId2) {
    if (userId1.toString() === userId2.toString()) {
      const err = new Error('You cannot message yourself');
      err.statusCode = 400;
      throw err;
    }

    const receiver = await User.findById(userId2);
    if (!receiver) {
      const err = new Error('Receiver not found');
      err.statusCode = 404;
      throw err;
    }

    // Find existing conversation containing both participants
    let conversation = await Conversation.findOne({
      participants: { $all: [userId1, userId2], $size: 2 }
    }).populate('participants', 'name username profileImage')
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'name username' } });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId1, userId2],
        lastMessageAt: new Date()
      });
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'name username profileImage');
    }

    return conversation;
  }

  /**
   * Send a new message. Persists to MongoDB, emits via Socket.IO.
   */
  async sendMessage({ senderId, receiverId, text, mediaUrl = null, mediaType = null, replyTo = null }) {
    if (!text && !mediaUrl) {
      const err = new Error('Message cannot be empty');
      err.statusCode = 400;
      throw err;
    }

    if (text && text.trim().length > 2000) {
      const err = new Error('Message cannot exceed 2000 characters');
      err.statusCode = 400;
      throw err;
    }

    const conversation = await this.getOrCreateConversation(senderId, receiverId);
    const conversationId = conversation._id;

    const message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      receiver: receiverId,
      text: text ? text.trim() : '',
      mediaUrl,
      mediaType,
      replyTo: replyTo || null,
      isRead: false
    });

    // Update conversation last message info
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date()
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'name username profileImage')
      .populate('receiver', 'name username profileImage')
      .populate({
        path: 'replyTo',
        select: 'text mediaUrl mediaType sender',
        populate: { path: 'sender', select: 'name username' }
      });

    // Emit real-time message to the conversation room
    emitToConversation(conversationId.toString(), 'message:new', populated);

    // Notification for receiver
    if (senderId.toString() !== receiverId.toString()) {
      const sender = await User.findById(senderId).select('name username');
      notificationService.createNotification({
        recipient: receiverId,
        sender: senderId,
        type: 'MESSAGE',
        title: 'New Message',
        message: `${sender?.name || 'Someone'} sent you a message`,
        relatedConversation: conversationId
      }).catch(e => console.warn('Message notification error:', e.message));
    }

    return populated;
  }

  /**
   * Get all conversations for a user, sorted by most recent message.
   */
  async getConversations(userId) {
    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    const conversations = await Conversation.find({
      participants: userObjectId
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'name username profileImage')
      .populate({ path: 'lastMessage', select: 'text sender createdAt isRead', populate: { path: 'sender', select: 'name username' } })
      .lean();

    if (conversations.length === 0) {
      return [];
    }

    // Single aggregation query replaces N+1 Message.countDocuments calls
    const convIds = conversations.map((conv) => conv._id);
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          conversation: { $in: convIds },
          receiver: userObjectId,
          isRead: false
        }
      },
      {
        $group: {
          _id: '$conversation',
          count: { $sum: 1 }
        }
      }
    ]);

    const unreadMap = new Map(unreadCounts.map((u) => [u._id.toString(), u.count]));

    return conversations.map((conv) => {
      const otherUser = conv.participants.find((p) => p._id.toString() !== userId.toString());
      return {
        _id: conv._id,
        otherUser,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: unreadMap.get(conv._id.toString()) || 0,
        createdAt: conv.createdAt
      };
    });
  }

  /**
   * Get paginated messages for a conversation. Verifies participant access.
   */
  async getMessages(conversationId, userId, { page = 1, limit = 30 } = {}) {
    const conversation = await Conversation.findById(conversationId).select('participants').lean();
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

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 30));
    const skip = (pageNum - 1) * limitNum;

    const [messages, total] = await Promise.all([
      Message.find({ conversation: conversationId })
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
        page: pageNum,
        limit: limitNum,
        total,
        hasNextPage: skip + messages.length < total
      }
    };
  }

  /**
   * Mark all unread messages in a conversation as read for the given user.
   */
  async markMessagesAsRead(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      const err = new Error('Conversation not found');
      err.statusCode = 404;
      throw err;
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      const err = new Error('Not authorized');
      err.statusCode = 403;
      throw err;
    }

    const result = await Message.updateMany(
      { conversation: conversationId, receiver: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    // Notify sender(s) that messages were read
    emitToConversation(conversationId.toString(), 'message:read', {
      conversationId,
      readBy: userId
    });

    return { updated: result.modifiedCount };
  }

  /**
   * Delete a message. Only the sender can delete their own message.
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
    await message.deleteOne();

    emitToConversation(conversationId, 'message:deleted', {
      messageId,
      conversationId
    });

    return { success: true, messageId };
  }

  /**
   * React with an emoji or toggle existing reaction.
   */
  async reactToMessage(messageId, userId, emoji) {
    const message = await Message.findById(messageId);
    if (!message) {
      const err = new Error('Message not found');
      err.statusCode = 404;
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
