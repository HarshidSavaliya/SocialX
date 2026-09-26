import messageService from '../services/messageService.js';

export const getConversations = async (req, res, next) => {
  try {
    const conversations = await messageService.getConversations(req.user._id);
    res.json({ success: true, data: { conversations } });
  } catch (err) {
    next(err);
  }
};

export const createConversation = async (req, res, next) => {
  try {
    const { receiverId } = req.body;
    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'receiverId is required' });
    }
    const conversation = await messageService.getOrCreateConversation(req.user._id, receiverId);
    res.status(201).json({ success: true, data: { conversation } });
  } catch (err) {
    next(err);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 30 } = req.query;
    const result = await messageService.getMessages(conversationId, req.user._id, { page, limit });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const result = await messageService.markMessagesAsRead(conversationId, req.user._id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
