import videoCallService from '../services/videoCallService.js';

export const initiateCall = async (req, res, next) => {
  try {
    const { receiverId, conversationId, callType } = req.body;
    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'receiverId is required' });
    }

    const result = await videoCallService.initiateCall({
      callerId: req.user._id,
      receiverId,
      conversationId,
      callType: callType || 'video'
    });

    res.status(201).json({
      success: true,
      message: 'Video call initiated successfully',
      data: result
    });
  } catch (err) {
    if (err.statusCode === 486) {
      return res.status(486).json({
        success: false,
        message: err.message,
        data: err.data
      });
    }
    next(err);
  }
};

export const acceptCall = async (req, res, next) => {
  try {
    const { callSessionId } = req.body;
    if (!callSessionId) {
      return res.status(400).json({ success: false, message: 'callSessionId is required' });
    }

    const result = await videoCallService.acceptCall({
      callSessionId,
      userId: req.user._id
    });

    res.json({
      success: true,
      message: 'Call accepted successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const rejectCall = async (req, res, next) => {
  try {
    const { callSessionId, reason } = req.body;
    if (!callSessionId) {
      return res.status(400).json({ success: false, message: 'callSessionId is required' });
    }

    const session = await videoCallService.rejectCall({
      callSessionId,
      userId: req.user._id,
      reason
    });

    res.json({
      success: true,
      message: 'Call rejected',
      data: { callSession: session }
    });
  } catch (err) {
    next(err);
  }
};

export const endCall = async (req, res, next) => {
  try {
    const { callSessionId, reason } = req.body;
    if (!callSessionId) {
      return res.status(400).json({ success: false, message: 'callSessionId is required' });
    }

    const session = await videoCallService.endCall({
      callSessionId,
      userId: req.user._id,
      reason
    });

    res.json({
      success: true,
      message: 'Call ended successfully',
      data: { callSession: session }
    });
  } catch (err) {
    next(err);
  }
};

export const markMissedCall = async (req, res, next) => {
  try {
    const { callSessionId } = req.body;
    if (!callSessionId) {
      return res.status(400).json({ success: false, message: 'callSessionId is required' });
    }

    const session = await videoCallService.markMissedCall({
      callSessionId,
      callerId: req.user._id
    });

    res.json({
      success: true,
      message: 'Call marked as missed',
      data: { callSession: session }
    });
  } catch (err) {
    next(err);
  }
};

export const getAgoraToken = async (req, res, next) => {
  try {
    const { callSessionId } = req.params;
    if (!callSessionId) {
      return res.status(400).json({ success: false, message: 'callSessionId is required' });
    }

    const tokenData = await videoCallService.getAgoraToken({
      callSessionId,
      userId: req.user._id
    });

    res.json({
      success: true,
      message: 'Agora token retrieved successfully',
      data: tokenData
    });
  } catch (err) {
    next(err);
  }
};

export const getUserCallHistory = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const history = await videoCallService.getUserCallHistory(req.user._id, { page, limit });

    res.json({
      success: true,
      data: history.sessions,
      sessions: history.sessions,
      pagination: history.pagination
    });
  } catch (err) {
    next(err);
  }
};

export const getCallSession = async (req, res, next) => {
  try {
    const { callSessionId } = req.params;
    const session = await videoCallService.getCallSessionById(callSessionId, req.user._id);

    res.json({
      success: true,
      data: { callSession: session }
    });
  } catch (err) {
    next(err);
  }
};
