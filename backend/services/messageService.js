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
  async sendMessage({ senderId, receiverId, text, mediaUrl = null, mediaType = null }) {
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
      isRead: false
    });

    // Update conversation last message info
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date()
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'name username profileImage')
      .populate('receiver', 'name username profileImage');

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
    const conversations = await Conversation.find({
      participants: userId
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'name username profileImage')
      .populate({ path: 'lastMessage', select: 'text sender createdAt isRead', populate: { path: 'sender', select: 'name username' } });

    // Attach unread count and otherUser for each conversation
    const result = await Promise.all(conversations.map(async (conv) => {
      const otherUser = conv.participants.find(p => p._id.toString() !== userId.toString());
      const unreadCount = await Message.countDocuments({
        conversation: conv._id,
        receiver: userId,
        isRead: false
      });
      return {
        _id: conv._id,
        otherUser,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        createdAt: conv.createdAt
      };
    }));

    return result;
  }

  /**
   * Get paginated messages for a conversation. Verifies participant access.
   */
  async getMessages(conversationId, userId, { page = 1, limit = 30 } = {}) {
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
      const err = new Error('Not authorized to access this conversation');
      err.statusCode = 403;
      throw err;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Message.countDocuments({ conversation: conversationId });

    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('sender', 'name username profileImage');

    return {
      messages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
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

    await message.deleteOne();
    return { success: true };
  }
}

export default new MessageService();
