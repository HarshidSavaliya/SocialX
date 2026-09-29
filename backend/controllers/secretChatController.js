import secretChatService from '../services/secretChatService.js';

export const startSecretChat = async (req, res, next) => {
  try {
    const { targetUserId, pin, autoDeleteLimit } = req.body;
    const result = await secretChatService.startSecretChat({
      currentUserId: req.user._id,
      targetUserId,
      pin,
      autoDeleteLimit
    });

    res.status(201).json({
      success: true,
      message: 'Secret chat session initialized successfully',
      data: result.conversation,
      secretToken: result.secretToken
    });
  } catch (error) {
    next(error);
  }
};

export const getSecretConversations = async (req, res, next) => {
  try {
    const conversations = await secretChatService.getSecretConversations(req.user._id);
    res.status(200).json({
      success: true,
      data: conversations
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    const result = await secretChatService.verifyPin({
      conversationId: req.params.id,
      userId: req.user._id,
      pin
    });

    res.status(200).json({
      success: true,
      message: 'PIN verified successfully. Secret chat unlocked.',
      data: result.conversation,
      secretToken: result.secretToken
    });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const messages = await secretChatService.getMessages(req.params.id);
    res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { content, text, isViewOnce } = req.body;
    const message = await secretChatService.sendMessage({
      conversationId: req.params.id,
      senderId: req.user._id,
      text: content || text,
      file: req.file,
      isViewOnce: isViewOnce === 'true' || isViewOnce === true
    });

    res.status(201).json({
      success: true,
      message: 'Secret message sent successfully',
      data: message
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const { autoDeleteLimit } = req.body;
    const updated = await secretChatService.updateSettings(req.params.id, {
      autoDeleteLimit
    });

    res.status(200).json({
      success: true,
      message: 'Secret chat settings updated',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

export const exitSecretChat = async (req, res, next) => {
  try {
    const result = await secretChatService.exitAndWipe(req.params.id);
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

export const viewOnceMedia = async (req, res, next) => {
  try {
    const result = await secretChatService.viewOnceMedia(req.params.id, req.user._id);
    res.status(200).json({
      success: true,
      message: 'View-once media burned successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
