import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import SecretConversation from '../models/SecretConversation.js';

export const authenticateUser = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Please log in.'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'socialx_jwt_secret_college_project_key_2026'
    );

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // Account status check: block suspended users from protected operations
    if (user.accountStatus === 'BLOCKED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by an administrator. Protected actions are restricted.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or has expired. Please log in again.'
    });
  }
};

// Alias protect to authenticateUser for backward compatibility
export const protect = authenticateUser;

/**
 * Reusable Role-Based Authorization Middleware
 * Usage: requireRole('ADMIN')
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Administrator privileges required.'
      });
    }

    next();
  };
};

/**
 * Require valid verified Secret Session Token or verified PIN header
 * Ensures backend verification cannot be bypassed by frontend flags.
 */
export const requireSecretAccess = async (req, res, next) => {
  try {
    const conversationId = req.params.id || req.params.conversationId || req.body.conversationId;
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Secret conversation ID is required'
      });
    }

    const conversation = await SecretConversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Secret conversation not found'
      });
    }

    if (!conversation.isActive) {
      if (req.originalUrl?.endsWith('/exit') || req.path?.endsWith('/exit')) {
        return res.status(200).json({
          success: true,
          message: 'Secret conversation already closed and wiped'
        });
      }
      return res.status(404).json({
        success: false,
        message: 'Secret conversation not found or has been closed'
      });
    }

    // Verify authenticated user is a participant
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not an authorized participant in this secret chat'
      });
    }

    // Check for verified secret session token
    const secretToken = req.headers['x-secret-token'];
    if (!secretToken) {
      return res.status(403).json({
        success: false,
        message: 'Secret chat is locked. Valid security PIN verification required.'
      });
    }

    try {
      const decodedSecret = jwt.verify(
        secretToken,
        process.env.JWT_SECRET || 'socialx_jwt_secret_college_project_key_2026'
      );

      if (
        decodedSecret.conversationId !== conversationId.toString() ||
        decodedSecret.userId !== req.user._id.toString() ||
        !decodedSecret.secretAccess
      ) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired secret session token. Please re-enter your PIN.'
        });
      }
    } catch (err) {
      return res.status(403).json({
        success: false,
        message: 'Secret session expired or invalid. Please re-enter your PIN.'
      });
    }

    req.secretConversation = conversation;
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'socialx_jwt_secret_college_project_key_2026'
    );
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.accountStatus === 'BLOCKED') {
      req.user = null;
    } else {
      req.user = user || null;
    }
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};
