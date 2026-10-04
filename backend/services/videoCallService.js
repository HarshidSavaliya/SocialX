import CallSession from '../models/CallSession.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import agoraService from './agoraService.js';
import notificationService from './notificationService.js';
import { emitToUser } from '../socket/socketServer.js';

class VideoCallService {
  /**
   * Initiates a 1-to-1 video call session.
   */
  async initiateCall({ callerId, receiverId, conversationId = null, callType = 'video' }) {
    // 1. Prevent self-call
    if (callerId.toString() === receiverId.toString()) {
      const err = new Error('You cannot call yourself');
      err.statusCode = 400;
      throw err;
    }

    // 2. Validate caller
    const caller = await User.findById(callerId).select('name username profileImage accountStatus blockedUsers');
    if (!caller) {
      const err = new Error('Caller account not found');
      err.statusCode = 404;
      throw err;
    }
    if (caller.accountStatus === 'BLOCKED') {
      const err = new Error('Your account is suspended');
      err.statusCode = 403;
      throw err;
    }

    // 3. Validate receiver
    const receiver = await User.findById(receiverId).select('name username profileImage accountStatus blockedUsers');
    if (!receiver) {
      const err = new Error('Recipient user not found');
      err.statusCode = 404;
      throw err;
    }
    if (receiver.accountStatus === 'BLOCKED') {
      const err = new Error('Cannot call a suspended user');
      err.statusCode = 403;
      throw err;
    }

    // Check block list in both directions
    const isBlockedByReceiver = receiver.blockedUsers?.some((b) => b.toString() === callerId.toString());
    const hasBlockedReceiver = caller.blockedUsers?.some((b) => b.toString() === receiverId.toString());
    if (isBlockedByReceiver || hasBlockedReceiver) {
      const err = new Error('Cannot call this user due to privacy or block settings');
      err.statusCode = 403;
      throw err;
    }

    // 4. Check if receiver is already in an active or ringing call (Busy check)
    const existingActiveSession = await CallSession.findOne({
      $or: [
        { caller: receiverId, status: { $in: ['ringing', 'accepted', 'active'] } },
        { receiver: receiverId, status: { $in: ['ringing', 'accepted', 'active'] } }
      ]
    });

    if (existingActiveSession) {
      // Record a busy session
      const busySession = await CallSession.create({
        caller: callerId,
        receiver: receiverId,
        conversation: conversationId,
        channelName: `socialx_busy_${Date.now()}`,
        callerUid: agoraService.generateUid(callerId),
        receiverUid: agoraService.generateUid(receiverId),
        status: 'busy',
        callType,
        endedAt: new Date(),
        endedBy: receiverId
      });

      emitToUser(callerId, 'call:busy', {
        callSessionId: busySession._id,
        receiverId,
        message: 'User is currently on another call.'
      });

      const err = new Error('User is currently on another call.');
      err.statusCode = 486; // Busy Here
      err.data = { status: 'busy', callSessionId: busySession._id };
      throw err;
    }

    // 5. Generate channel name and unique UIDs
    const timestamp = Date.now();
    const channelName = `socialx_${callerId.toString().slice(-4)}_${receiverId.toString().slice(-4)}_${timestamp}`;
    const callerUid = agoraService.generateUid(callerId);
    let receiverUid = agoraService.generateUid(receiverId);
    if (callerUid === receiverUid) {
      receiverUid = callerUid + 1;
    }

    // 6. Generate Agora token for caller
    const agoraData = agoraService.generateRtcToken(channelName, callerUid, 'publisher');

    // 7. Persist CallSession
    const session = await CallSession.create({
      caller: callerId,
      receiver: receiverId,
      conversation: conversationId,
      channelName,
      callerUid,
      receiverUid,
      status: 'ringing',
      startedAt: new Date(),
      callType
    });

    // 8. Create real-time notification in DB & emit to recipient
    try {
      await notificationService.createNotification({
        recipient: receiverId,
        sender: callerId,
        type: callType === 'audio' ? 'AUDIO_CALL' : 'VIDEO_CALL',
        title: callType === 'audio' ? 'Incoming Voice Call' : 'Incoming Video Call',
        message: `${caller.name} (@${caller.username}) is ${callType === 'audio' ? 'voice' : 'video'} calling you...`,
        relatedConversation: conversationId,
        relatedUser: callerId
      });
    } catch (notifErr) {
      console.warn('Call notification error:', notifErr.message);
    }

    // 9. Emit Socket.IO invitation to receiver
    emitToUser(receiverId, 'call:invite', {
      callSessionId: session._id,
      channelName: session.channelName,
      caller: {
        _id: caller._id,
        name: caller.name,
        username: caller.username,
        profileImage: caller.profileImage
      },
      receiver: {
        _id: receiver._id,
        name: receiver.name,
        username: receiver.username,
        profileImage: receiver.profileImage
      },
      callerUid,
      receiverUid,
      callType,
      conversationId
    });

    // 10. Emit Socket.IO ringing event to caller
    emitToUser(callerId, 'call:ringing', {
      callSessionId: session._id,
      channelName: session.channelName,
      receiver: {
        _id: receiver._id,
        name: receiver.name,
        username: receiver.username,
        profileImage: receiver.profileImage
      }
    });

    return {
      callSession: session,
      agora: {
        appId: agoraData.appId,
        channelName: session.channelName,
        uid: callerUid,
        token: agoraData.token,
        expiration: agoraData.expiration,
        isDemoKey: agoraData.isDemoKey
      }
    };
  }

  /**
   * Accepts an incoming video call session.
   */
  async acceptCall({ callSessionId, userId }) {
    const session = await CallSession.findById(callSessionId)
      .populate('caller', 'name username profileImage accountStatus')
      .populate('receiver', 'name username profileImage accountStatus');

    if (!session) {
      const err = new Error('Call session not found');
      err.statusCode = 404;
      throw err;
    }

    // Verify participant authorization
    if (session.receiver._id.toString() !== userId.toString()) {
      const err = new Error('Not authorized to accept this call');
      err.statusCode = 403;
      throw err;
    }

    if (session.status !== 'ringing' && session.status !== 'initiated') {
      const err = new Error(`Call cannot be accepted in '${session.status}' state`);
      err.statusCode = 400;
      throw err;
    }

    // Update session state
    session.status = 'active';
    session.answeredAt = new Date();
    await session.save();

    // Generate Agora token for receiver
    const agoraData = agoraService.generateRtcToken(
      session.channelName,
      session.receiverUid,
      'publisher'
    );

    // Notify caller that receiver accepted
    emitToUser(session.caller._id, 'call:accept', {
      callSessionId: session._id,
      channelName: session.channelName,
      receiverUid: session.receiverUid,
      answeredAt: session.answeredAt,
      callType: session.callType
    });

    return {
      callSession: session,
      callType: session.callType,
      agora: {
        appId: agoraData.appId,
        channelName: session.channelName,
        uid: session.receiverUid,
        token: agoraData.token,
        expiration: agoraData.expiration,
        isDemoKey: agoraData.isDemoKey
      }
    };
  }

  /**
   * Rejects an incoming call session.
   */
  async rejectCall({ callSessionId, userId, reason = 'declined' }) {
    const session = await CallSession.findById(callSessionId);
    if (!session) {
      const err = new Error('Call session not found');
      err.statusCode = 404;
      throw err;
    }

    const isParticipant =
      session.caller.toString() === userId.toString() ||
      session.receiver.toString() === userId.toString();

    if (!isParticipant) {
      const err = new Error('Not authorized');
      err.statusCode = 403;
      throw err;
    }

    session.status = 'rejected';
    session.endedAt = new Date();
    session.endedBy = userId;
    await session.save();

    // Notify the other user
    const otherUserId =
      session.caller.toString() === userId.toString() ? session.receiver : session.caller;

    emitToUser(otherUserId, 'call:reject', {
      callSessionId: session._id,
      reason: 'Call declined',
      endedBy: userId
    });

    return session;
  }

  /**
   * Ends an active or ringing call.
   */
  async endCall({ callSessionId, userId, reason = 'ended' }) {
    const session = await CallSession.findById(callSessionId);
    if (!session) {
      const err = new Error('Call session not found');
      err.statusCode = 404;
      throw err;
    }

    const isParticipant =
      session.caller.toString() === userId.toString() ||
      session.receiver.toString() === userId.toString();

    if (!isParticipant) {
      const err = new Error('Not authorized to end this call');
      err.statusCode = 403;
      throw err;
    }

    // If already terminated, return
    if (['ended', 'rejected', 'missed', 'failed'].includes(session.status)) {
      return session;
    }

    const endedAt = new Date();
    let duration = 0;
    if (session.answeredAt) {
      duration = Math.max(0, Math.round((endedAt - new Date(session.answeredAt)) / 1000));
    }

    session.status = 'ended';
    session.endedAt = endedAt;
    session.endedBy = userId;
    session.duration = duration;
    await session.save();

    const otherUserId =
      session.caller.toString() === userId.toString() ? session.receiver : session.caller;

    // Emit call:end event to other user
    emitToUser(otherUserId, 'call:end', {
      callSessionId: session._id,
      endedBy: userId,
      duration,
      reason
    });

    return session;
  }

  /**
   * Handles missed call timeout.
   */
  async markMissedCall({ callSessionId, callerId }) {
    const session = await CallSession.findById(callSessionId).populate(
      'caller',
      'name username profileImage'
    );

    if (!session) {
      const err = new Error('Call session not found');
      err.statusCode = 404;
      throw err;
    }

    // Only mark missed if still ringing
    if (session.status !== 'ringing' && session.status !== 'initiated') {
      return session;
    }

    session.status = 'missed';
    session.endedAt = new Date();
    await session.save();

    // Create persistent missed call notification for receiver
    try {
      await notificationService.createNotification({
        recipient: session.receiver,
        sender: session.caller._id,
        type: 'MISSED_VIDEO_CALL',
        title: 'Missed Video Call',
        message: `Missed video call from ${session.caller.name} (@${session.caller.username})`,
        relatedConversation: session.conversation,
        relatedUser: session.caller._id
      });
    } catch (notifErr) {
      console.warn('Missed call notification error:', notifErr.message);
    }

    // Emit missed call event to both parties
    emitToUser(session.caller._id, 'call:missed', {
      callSessionId: session._id,
      message: 'Receiver did not answer (Missed Call)'
    });

    emitToUser(session.receiver, 'call:missed', {
      callSessionId: session._id,
      caller: session.caller,
      message: `Missed video call from ${session.caller.name}`
    });

    return session;
  }

  /**
   * Secure Agora Token Retrieval (PART 18: Strict Authorization).
   * Verifies authenticated user is authorized participant in active session.
   * NEVER exposes AGORA_APP_CERTIFICATE.
   */
  async getAgoraToken({ callSessionId, userId }) {
    const session = await CallSession.findById(callSessionId);
    if (!session) {
      const err = new Error('Call session not found');
      err.statusCode = 404;
      throw err;
    }

    const isCaller = session.caller.toString() === userId.toString();
    const isReceiver = session.receiver.toString() === userId.toString();

    if (!isCaller && !isReceiver) {
      const err = new Error('Not authorized to access Agora credentials for this call session');
      err.statusCode = 403;
      throw err;
    }

    if (['ended', 'rejected', 'missed', 'failed'].includes(session.status)) {
      const err = new Error('Call session is no longer active');
      err.statusCode = 410; // Gone
      throw err;
    }

    const uid = isCaller ? session.callerUid : session.receiverUid;
    const agoraData = agoraService.generateRtcToken(session.channelName, uid, 'publisher');

    return {
      appId: agoraData.appId,
      channelName: session.channelName,
      uid,
      token: agoraData.token,
      expiration: agoraData.expiration,
      isDemoKey: agoraData.isDemoKey
    };
  }

  /**
   * Fetches call history for authenticated user.
   */
  async getUserCallHistory(userId, { page = 1, limit = 20 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    const query = {
      $or: [{ caller: userId }, { receiver: userId }]
    };

    const [sessions, total] = await Promise.all([
      CallSession.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('caller', 'name username profileImage')
        .populate('receiver', 'name username profileImage')
        .populate('endedBy', 'name username')
        .lean(),
      CallSession.countDocuments(query)
    ]);

    return {
      sessions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    };
  }

  /**
   * Fetches specific call session by ID with authorization.
   */
  async getCallSessionById(callSessionId, userId) {
    const session = await CallSession.findById(callSessionId)
      .populate('caller', 'name username profileImage')
      .populate('receiver', 'name username profileImage');

    if (!session) {
      const err = new Error('Call session not found');
      err.statusCode = 404;
      throw err;
    }

    const isParticipant =
      session.caller._id.toString() === userId.toString() ||
      session.receiver._id.toString() === userId.toString();

    if (!isParticipant) {
      const err = new Error('Not authorized to access this call session');
      err.statusCode = 403;
      throw err;
    }

    return session;
  }
}

export default new VideoCallService();
