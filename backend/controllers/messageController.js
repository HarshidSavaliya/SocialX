import messageService from '../services/messageService.js';

export const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, mediaUrl, mediaType } = req.body;
    const text = req.body.text || req.body.content;
    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'receiverId is required' });
    }
    const message = await messageService.sendMessage({
      senderId: req.user._id,
      receiverId,
      text,
      mediaUrl,
      mediaType
    });
    res.status(201).json({ success: true, data: { message } });
  } catch (err) {
    next(err);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const result = await messageService.deleteMessage(messageId, req.user._id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
