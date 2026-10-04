import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import SecretConversation from '../models/SecretConversation.js';

let ioInstance = null;
// Map: userId (string) -> Set of socketId (string)
const onlineUsers = new Map();

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization;
      const token =
        socket.handshake.auth?.token ||
        (authHeader && authHeader.startsWith('Bearer ')
          ? authHeader.split(' ')[1]
          : null);

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'socialx_jwt_secret_college_project_key_2026'
      );

      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('User not found'));
      }

      // Check if user is blocked
      if (user.accountStatus === 'BLOCKED') {
        return next(new Error('Account suspended by administrator'));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Socket authentication error: ' + err.message));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    // Track online user sockets
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal user room for targeted notifications & direct messages
    socket.join(`user:${userId}`);

    // If this is the user's first active connection, broadcast online presence
    if (onlineUsers.get(userId).size === 1) {
      socket.broadcast.emit('user:online', { userId });
    }

    // Send current list of all online user IDs to the connected client
    socket.emit('presence:online-users', Array.from(onlineUsers.keys()));

    // ==========================================
    // 1. NORMAL CHAT ROOM MANAGEMENT (Phase 3)
    // ==========================================
    socket.on('conversation:join', (conversationId) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on('conversation:leave', (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    socket.on('typing:start', ({ conversationId }) => {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('typing:user', {
          conversationId,
          userId,
          username: socket.user.username,
          name: socket.user.name
        });
      }
    });

    socket.on('typing:stop', ({ conversationId }) => {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('typing:stop', {
          conversationId,
          userId
        });
      }
    });

    // ==========================================
    // 2. SECRET CHAT ROOM MANAGEMENT (Phase 4)
    // Strictly isolated room namespace & events
    // ==========================================
    socket.on('secret:conversation:join', async (conversationId) => {
      if (!conversationId) return;

      try {
        const conv = await SecretConversation.findById(conversationId);
        if (!conv || !conv.isActive) return;

        // Verify authenticated socket user is actually a participant
        const isParticipant = conv.participants.some(
          (p) => p.toString() === userId
        );

        if (isParticipant) {
          socket.join(`secret:conversation:${conversationId}`);
        }
      } catch (err) {
        console.warn('Socket secret join error:', err.message);
      }
    });

    socket.on('secret:conversation:leave', (conversationId) => {
      if (conversationId) {
        socket.leave(`secret:conversation:${conversationId}`);
      }
    });

    socket.on('secret:typing:start', ({ conversationId }) => {
      if (conversationId) {
        socket.to(`secret:conversation:${conversationId}`).emit('secret:typing:user', {
          conversationId,
          userId
        });
      }
    });

    socket.on('secret:typing:stop', ({ conversationId }) => {
      if (conversationId) {
        socket.to(`secret:conversation:${conversationId}`).emit('secret:typing:stop', {
          conversationId,
          userId
        });
      }
    });

    // ==========================================
    // 3. VIDEO CALL SIGNALING (Phase 5: Agora RTC Control)
    // ==========================================
    socket.on('call:join-room', (channelName) => {
      if (channelName) {
        socket.join(`call:${channelName}`);
      }
    });

    socket.on('call:leave-room', (channelName) => {
      if (channelName) {
        socket.leave(`call:${channelName}`);
      }
    });

    socket.on('call:media-state', ({ targetUserId, channelName, isAudioMuted, isVideoMuted }) => {
      if (targetUserId) {
        emitToUser(targetUserId, 'call:media-state', {
          userId,
          isAudioMuted,
          isVideoMuted
        });
      } else if (channelName) {
        socket.to(`call:${channelName}`).emit('call:media-state', {
          userId,
          isAudioMuted,
          isVideoMuted
        });
      }
    });

    // Disconnect handling
    socket.on('disconnect', async () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast offline presence to all connected clients
          socket.broadcast.emit('user:offline', { userId });

          // Auto-cleanup any hanging calls on complete user disconnection
          try {
            const CallSession = (await import('../models/CallSession.js')).default;
            const activeCalls = await CallSession.find({
              $or: [{ caller: userId }, { receiver: userId }],
              status: { $in: ['ringing', 'active'] }
            });
            for (const call of activeCalls) {
              call.status = 'ended';
              call.endedAt = new Date();
              call.endedBy = userId;
              await call.save();

              const otherId =
                call.caller.toString() === userId ? call.receiver : call.caller;
              emitToUser(otherId, 'call:end', {
                callSessionId: call._id,
                endedBy: userId,
                reason: 'User disconnected'
              });
            }
          } catch (cleanErr) {
            console.warn('Socket disconnect call cleanup warning:', cleanErr.message);
          }
        }
      }
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = () => {
  return ioInstance;
};

export const isUserOnline = (userId) => {
  return onlineUsers.has(userId.toString());
};

export const getOnlineUserIds = () => {
  return Array.from(onlineUsers.keys());
};

export const emitToUser = (userId, event, data) => {
  if (ioInstance) {
    ioInstance.to(`user:${userId.toString()}`).emit(event, data);
  }
};

export const emitToConversation = (conversationId, event, data) => {
  if (ioInstance) {
    ioInstance.to(`conversation:${conversationId.toString()}`).emit(event, data);
  }
};

export const emitToSecretConversation = (conversationId, event, data) => {
  if (ioInstance) {
    ioInstance.to(`secret:conversation:${conversationId.toString()}`).emit(event, data);
  }
};
