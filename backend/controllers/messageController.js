import messageService from '../services/messageService.js';

export const sendMessage = async (req, res, next) => {
  try {
    const receiverId = req.body.receiverId || req.body.recipientId;
    const conversationId = req.body.conversationId;
    const { replyTo, clientMessageId } = req.body;
    let { mediaUrl, mediaType } = req.body;
    let mediaPublicId = null;
    const text = req.body.text || req.body.content || '';

    if (req.file) {
      const cloudinaryService = (await import('../services/cloudinaryService.js')).default;
      const isAudio = req.file.mimetype.startsWith('audio/');
      const isVideo = req.file.mimetype.startsWith('video/');
      const resourceType = isAudio ? 'video' : (isVideo ? 'video' : 'image');

      const uploadRes = await cloudinaryService.uploadMedia(
        req.file.buffer,
        'socialx/chat',
        resourceType,
        req.file.mimetype
      );
      mediaUrl = uploadRes.url;
      mediaPublicId = uploadRes.publicId;
      mediaType = isAudio ? 'audio' : (isVideo ? 'video' : 'image');
    }

    if (!receiverId && !conversationId) {
      return res.status(400).json({ success: false, message: 'receiverId or conversationId is required' });
    }
    const message = await messageService.sendMessage({
      senderId: req.user._id,
      receiverId,
      conversationId,
      text,
      mediaUrl,
      mediaPublicId,
      mediaType,
      replyTo: replyTo || null,
      clientMessageId: clientMessageId || null
    });
    res.status(201).json({ success: true, data: { message }, message });
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

export const reactToMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required' });
    }
    const result = await messageService.reactToMessage(messageId, req.user._id, emoji);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const toggleStarMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const result = await messageService.toggleStarMessage(messageId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
