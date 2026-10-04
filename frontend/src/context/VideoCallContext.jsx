import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { videoCallService } from '../services/videoCallService';

const VideoCallContext = createContext(null);

// Configure Agora Web SDK Logging
try {
  AgoraRTC.setLogLevel(2); // 0: DEBUG, 1: INFO, 2: WARNING, 3: ERROR, 4: NONE
} catch (e) {
  // Ignored in SSR / test
}

export function VideoCallProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const { socket } = useSocket() || {};

  // Call States: 'idle' | 'outgoing' | 'incoming' | 'connected' | 'ended' | 'busy' | 'missed'
  const [callStatus, setCallStatus] = useState('idle');
  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [callDuration, setCallDuration] = useState(0);

  // Media & Hardware States
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamMuted, setIsCamMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [peerMediaState, setPeerMediaState] = useState({ isAudioMuted: false, isVideoMuted: false });
  const [permissionError, setPermissionError] = useState(null);
  const [agoraNotice, setAgoraNotice] = useState(null);
  const [networkQuality, setNetworkQuality] = useState('good');

  // Device lists
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');

  // Agora Client & Track References
  const agoraClientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isAudioAutoplayBlocked, setIsAudioAutoplayBlocked] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState({ local: false, remote: false });
  const [localVolumeLevel, setLocalVolumeLevel] = useState(0);
  const [remoteVolumeLevel, setRemoteVolumeLevel] = useState(0);

  const durationTimerRef = useRef(null);
  const ringtoneTimeoutRef = useRef(null);
  const lastVolumeUpdateRef = useRef(0);

  // Keep ref of callStatus for stable socket listeners
  const callStatusRef = useRef(callStatus);
  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  const activeSessionRef = useRef(activeSession);
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  const outgoingCallRef = useRef(outgoingCall);
  useEffect(() => {
    outgoingCallRef.current = outgoingCall;
  }, [outgoingCall]);

  const incomingCallRef = useRef(incomingCall);
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  // -------------------------------------------------------------
  // 1. Initialize Agora Client instance
  // -------------------------------------------------------------
  const getOrCreateAgoraClient = useCallback(() => {
    if (!agoraClientRef.current) {
      agoraClientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

      // Throttle volume events so they do not spam React re-renders
      try {
        agoraClientRef.current.enableAudioVolumeIndicator();
        agoraClientRef.current.on('volume-indicator', (volumes) => {
          const now = Date.now();
          if (now - lastVolumeUpdateRef.current < 400) return;
          lastVolumeUpdateRef.current = now;

          let localSpeaking = false;
          let remoteSpeaking = false;
          volumes.forEach(({ uid, level }) => {
            if (uid === 0) {
              setLocalVolumeLevel(level);
              if (level > 6) localSpeaking = true;
            } else {
              setRemoteVolumeLevel(level);
              if (level > 6) remoteSpeaking = true;
            }
          });
          setSpeakingUsers({ local: localSpeaking, remote: remoteSpeaking });
        });
      } catch (volErr) {
        console.warn('Volume indicator notice:', volErr.message);
      }

      // Modern Agora Web SDK Autoplay Failure Handling
      AgoraRTC.onAutoplayFailed = () => {
        setIsAudioAutoplayBlocked(true);
      };

      if (typeof AgoraRTC.on === 'function') {
        try {
          AgoraRTC.on('autoplay-failed', () => {
            setIsAudioAutoplayBlocked(true);
          });
        } catch (e) {}
      }

      // Handle remote user publication
      agoraClientRef.current.on('user-published', async (remoteUser, mediaType) => {
        try {
          await agoraClientRef.current.subscribe(remoteUser, mediaType);

          setRemoteUsers((prev) => {
            const existing = prev.find((u) => u.uid === remoteUser.uid);
            if (existing) {
              return prev.map((u) => (u.uid === remoteUser.uid ? remoteUser : u));
            }
            return [...prev, remoteUser];
          });

          // Play remote tracks
          if (mediaType === 'video' && remoteUser.videoTrack) {
            setTimeout(() => {
              const remoteContainer =
                document.getElementById(`remote-video-${remoteUser.uid}`) ||
                document.getElementById('remote-video-container');
              if (remoteContainer) {
                try {
                  remoteUser.videoTrack.play(remoteContainer);
                } catch (e) {
                  console.warn('Remote video play notice:', e.message);
                }
              }
            }, 100);
          }

          if (mediaType === 'audio' && remoteUser.audioTrack) {
            try {
              remoteUser.audioTrack.setVolume(100);
              if (!remoteUser.audioTrack.isPlaying) {
                await remoteUser.audioTrack.play();
              }
            } catch (playErr) {
              console.warn('Remote audio autoplay notice:', playErr.message);
              setIsAudioAutoplayBlocked(true);
            }
          }
        } catch (subErr) {
          console.warn('Agora subscribe notice:', subErr.message);
        }
      });

      agoraClientRef.current.on('user-unpublished', (remoteUser, mediaType) => {
        if (mediaType === 'video' && remoteUser.videoTrack) {
          try {
            remoteUser.videoTrack.stop();
          } catch (e) {}
        }
        if (mediaType === 'audio' && remoteUser.audioTrack) {
          try {
            remoteUser.audioTrack.stop();
          } catch (e) {}
        }
        setRemoteUsers((prev) => prev.map((u) => (u.uid === remoteUser.uid ? remoteUser : u)));
      });

      agoraClientRef.current.on('user-left', (remoteUser) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== remoteUser.uid));
      });

      // Network quality monitor
      agoraClientRef.current.on('network-quality', (stats) => {
        if (stats.downlinkNetworkQuality <= 2) setNetworkQuality('excellent');
        else if (stats.downlinkNetworkQuality <= 4) setNetworkQuality('good');
        else setNetworkQuality('poor');
      });

      agoraClientRef.current.on('connection-state-change', (curState) => {
        if (curState === 'RECONNECTING') {
          setNetworkQuality('reconnecting');
        } else if (curState === 'CONNECTED') {
          setNetworkQuality('good');
        }
      });
    }
    return agoraClientRef.current;
  }, []);

  // -------------------------------------------------------------
  // 2. Hardware Devices Enumeration
  // -------------------------------------------------------------
  const refreshDevices = useCallback(async () => {
    try {
      const [cams, mics] = await Promise.all([
        AgoraRTC.getCameras().catch(() => []),
        AgoraRTC.getMicrophones().catch(() => [])
      ]);
      setCameras(cams);
      setMicrophones(mics);
      if (cams.length > 0 && !selectedCamera) setSelectedCamera(cams[0].deviceId);
      if (mics.length > 0 && !selectedMic) setSelectedMic(mics[0].deviceId);
    } catch (e) {
      console.warn('Device enumeration notice:', e.message);
    }
  }, [selectedCamera, selectedMic]);

  // -------------------------------------------------------------
  // 3. Cleanup all media hardware and Agora connections
  // -------------------------------------------------------------
  const cleanupMedia = useCallback(async () => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    if (ringtoneTimeoutRef.current) clearTimeout(ringtoneTimeoutRef.current);

    // Stop and close local audio
    if (localAudioTrackRef.current) {
      try {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
      } catch (e) {}
      localAudioTrackRef.current = null;
    }

    // Stop and close local video
    if (localVideoTrackRef.current) {
      try {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
      } catch (e) {}
      localVideoTrackRef.current = null;
    }

    // Leave Agora channel
    if (agoraClientRef.current) {
      try {
        await agoraClientRef.current.leave();
      } catch (e) {}
    }

    setLocalVideoTrack(null);
    setLocalAudioTrack(null);
    setRemoteUsers([]);
    setCallDuration(0);
    setPermissionError(null);
    setIsAudioAutoplayBlocked(false);
    setSpeakingUsers({ local: false, remote: false });
    setPeerMediaState({ isAudioMuted: false, isVideoMuted: false });
  }, []);

  // -------------------------------------------------------------
  // 4. Stable Socket.IO Signaling Listeners (NO churn on state changes)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    // A. Incoming call invite from remote peer
    const handleIncomingCall = (data) => {
      const curStatus = callStatusRef.current;
      if (curStatus === 'connected' || curStatus === 'outgoing' || curStatus === 'incoming') {
        socket.emit('call:busy', {
          callSessionId: data.callSessionId,
          targetUserId: data.caller?._id
        });
        return;
      }

      setIncomingCall(data);
      setCurrentCallType(data.callType || 'video');
      setCallStatus('incoming');
      refreshDevices();
    };

    // B. Caller receives ringing signal
    const handleCallRinging = () => {
      // Ringing feedback
    };

    // C. Caller receives call acceptance from receiver
    const handleCallAccept = async () => {
      setCallStatus('connected');
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    };

    // D. Call rejected by peer
    const handleCallReject = () => {
      setCallStatus('ended');
      setAgoraNotice('Call was declined');
      setTimeout(() => {
        cleanupMedia();
        setCallStatus('idle');
        setOutgoingCall(null);
        setIncomingCall(null);
      }, 2000);
    };

    // E. Peer is busy on another call
    const handleCallBusy = (data) => {
      setCallStatus('busy');
      setAgoraNotice(data.message || 'User is currently on another call');
      setTimeout(() => {
        cleanupMedia();
        setCallStatus('idle');
        setOutgoingCall(null);
      }, 2500);
    };

    // F. Call ended by peer
    const handleCallEnd = () => {
      setCallStatus('ended');
      setAgoraNotice('Call ended');
      setTimeout(() => {
        cleanupMedia();
        setCallStatus('idle');
        setOutgoingCall(null);
        setIncomingCall(null);
        setActiveSession(null);
      }, 1500);
    };

    // G. Missed call timeout signal
    const handleCallMissed = (data) => {
      setCallStatus('missed');
      setAgoraNotice(data.message || 'Call missed');
      setTimeout(() => {
        cleanupMedia();
        setCallStatus('idle');
        setOutgoingCall(null);
        setIncomingCall(null);
      }, 2000);
    };

    // H. Peer audio/video toggle state
    const handlePeerMediaState = ({ isAudioMuted, isVideoMuted }) => {
      setPeerMediaState({
        isAudioMuted: Boolean(isAudioMuted),
        isVideoMuted: Boolean(isVideoMuted)
      });
    };

    socket.on('call:invite', handleIncomingCall);
    socket.on('call:ringing', handleCallRinging);
    socket.on('call:accept', handleCallAccept);
    socket.on('call:reject', handleCallReject);
    socket.on('call:busy', handleCallBusy);
    socket.on('call:end', handleCallEnd);
    socket.on('call:missed', handleCallMissed);
    socket.on('call:media-state', handlePeerMediaState);

    return () => {
      socket.off('call:invite', handleIncomingCall);
      socket.off('call:ringing', handleCallRinging);
      socket.off('call:accept', handleCallAccept);
      socket.off('call:reject', handleCallReject);
      socket.off('call:busy', handleCallBusy);
      socket.off('call:end', handleCallEnd);
      socket.off('call:missed', handleCallMissed);
      socket.off('call:media-state', handlePeerMediaState);
    };
  }, [socket, isAuthenticated, cleanupMedia, refreshDevices]);

  // Page unload cleanup
  useEffect(() => {
    const handleUnload = () => {
      const active = activeSessionRef.current;
      if (active?._id) {
        videoCallService.endCall({ callSessionId: active._id, reason: 'Page closed' });
      }
      cleanupMedia();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [cleanupMedia]);

  // Call Type State: 'video' | 'audio'
  const [currentCallType, setCurrentCallType] = useState('video');

  // -------------------------------------------------------------
  // 5. Initialize Local Agora Media Tracks
  // -------------------------------------------------------------
  const initLocalTracks = async (callType = 'video') => {
    setPermissionError(null);
    let audioTrack = null;
    let videoTrack = null;

    try {
      audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        microphoneId: selectedMic || undefined,
        encoderConfig: 'speech_standard',
        AEC: true,
        ANS: false,
        AGC: true
      });
      audioTrack.setVolume(100);
      localAudioTrackRef.current = audioTrack;
      setLocalAudioTrack(audioTrack);
    } catch (micErr) {
      console.warn('Microphone permission or hardware notice:', micErr.message);
      setPermissionError('Microphone permission is required for audio.');
    }

    if (callType === 'video') {
      try {
        videoTrack = await AgoraRTC.createCameraVideoTrack(
          selectedCamera ? { cameraId: selectedCamera } : undefined
        );
        localVideoTrackRef.current = videoTrack;
        setLocalVideoTrack(videoTrack);
      } catch (camErr) {
        console.warn('Camera permission or hardware notice:', camErr.message);
        setPermissionError((prev) =>
          prev
            ? 'Camera and microphone permissions are required.'
            : 'Camera permission is required for video.'
        );
      }
    } else {
      localVideoTrackRef.current = null;
      setLocalVideoTrack(null);
    }

    return { audioTrack, videoTrack };
  };

  // -------------------------------------------------------------
  // 6. Action: Start Outgoing Call (Caller Flow)
  // -------------------------------------------------------------
  const startCall = async ({ receiver, conversationId = null, callType = 'video' }) => {
    if (!receiver || !receiver._id) return;
    if (callStatusRef.current !== 'idle') return;

    try {
      setCurrentCallType(callType);
      setCallStatus('outgoing');
      setOutgoingCall({ receiver, callType });
      setAgoraNotice(null);
      setPermissionError(null);

      // Call Backend to validate, create session, and generate Agora token
      const res = await videoCallService.initiateCall({
        receiverId: receiver._id,
        conversationId,
        callType
      });

      const session = res.data.callSession;
      const agoraData = res.data.agora;
      setActiveSession(session);

      // Join Agora RTC Channel as Caller
      const client = getOrCreateAgoraClient();

      try {
        await client.join(
          agoraData.appId,
          agoraData.channelName,
          agoraData.token,
          agoraData.uid
        );

        // Create local tracks and publish
        const { audioTrack, videoTrack } = await initLocalTracks(callType);
        const tracksToPublish = [audioTrack, videoTrack].filter(Boolean);
        if (tracksToPublish.length > 0) {
          await client.publish(tracksToPublish);
        }

        // Render local video preview
        if (videoTrack) {
          setTimeout(() => {
            const localContainer = document.getElementById('local-video-container');
            if (localContainer) videoTrack.play(localContainer);
          }, 150);
        }
      } catch (agoraErr) {
        console.warn('Agora RTC join status:', agoraErr.message);
        if (agoraData.isDemoKey) {
          setAgoraNotice(
            'Agora Dev Sandbox: Set real AGORA_APP_ID in backend/.env for production media streaming.'
          );
        }
      }

      // Auto-timeout after 35 seconds if unanswered (Missed Call)
      ringtoneTimeoutRef.current = setTimeout(async () => {
        if (callStatusRef.current === 'outgoing') {
          try {
            await videoCallService.markMissed({ callSessionId: session._id });
          } catch (e) {}
          setCallStatus('missed');
          setAgoraNotice('No answer (Missed Call)');
          setTimeout(() => {
            cleanupMedia();
            setCallStatus('idle');
            setOutgoingCall(null);
          }, 2000);
        }
      }, 35000);
    } catch (err) {
      console.warn('Start call notice:', err.message);
      if (err.response?.status === 486 || err.statusCode === 486) {
        setCallStatus('busy');
        setAgoraNotice('User is currently on another call.');
      } else {
        setCallStatus('ended');
        setAgoraNotice(err.response?.data?.message || err.message || 'Unable to connect call');
      }
      setTimeout(() => {
        cleanupMedia();
        setCallStatus('idle');
        setOutgoingCall(null);
      }, 2500);
    }
  };

  // -------------------------------------------------------------
  // 7. Action: Accept Call (Receiver Flow)
  // -------------------------------------------------------------
  const acceptCall = async () => {
    const inc = incomingCallRef.current;
    if (!inc) return;

    try {
      setCallStatus('connected');
      const sessionId = inc.callSessionId;

      const res = await videoCallService.acceptCall({ callSessionId: sessionId });
      const session = res.data.callSession;
      const agoraData = res.data.agora;
      const callType = inc.callType || session?.callType || res.data?.callType || 'video';
      setCurrentCallType(callType);
      setActiveSession(session);

      // Join Agora RTC Channel as Receiver
      const client = getOrCreateAgoraClient();

      try {
        await client.join(
          agoraData.appId,
          agoraData.channelName,
          agoraData.token,
          agoraData.uid
        );

        // Create local tracks and publish
        const { audioTrack, videoTrack } = await initLocalTracks(callType);
        const tracksToPublish = [audioTrack, videoTrack].filter(Boolean);
        if (tracksToPublish.length > 0) {
          await client.publish(tracksToPublish);
        }

        // Render local preview
        if (videoTrack) {
          setTimeout(() => {
            const localContainer = document.getElementById('local-video-container');
            if (localContainer) videoTrack.play(localContainer);
          }, 150);
        }
      } catch (agoraErr) {
        console.warn('Agora receiver join status:', agoraErr.message);
        if (agoraData.isDemoKey) {
          setAgoraNotice(
            'Agora Dev Sandbox: Set real AGORA_APP_ID in backend/.env for production media streaming.'
          );
        }
      }

      // Start duration counter
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Accept call notice:', err.message);
      setCallStatus('ended');
      setAgoraNotice('Failed to accept call');
      setTimeout(() => {
        cleanupMedia();
        setCallStatus('idle');
        setIncomingCall(null);
      }, 2000);
    }
  };

  // -------------------------------------------------------------
  // 8. Action: Reject Call (Receiver Flow)
  // -------------------------------------------------------------
  const rejectCall = async (reason = 'declined') => {
    const inc = incomingCallRef.current;
    if (!inc) return;
    const sessionId = inc.callSessionId;

    try {
      await videoCallService.rejectCall({ callSessionId: sessionId, reason });
    } catch (err) {
      console.warn('Reject call notice:', err.message);
    } finally {
      cleanupMedia();
      setCallStatus('idle');
      setIncomingCall(null);
    }
  };

  // -------------------------------------------------------------
  // 9. Action: End Call (Either participant)
  // -------------------------------------------------------------
  const endCall = async (reason = 'ended') => {
    const active = activeSessionRef.current;
    const outg = outgoingCallRef.current;
    const inc = incomingCallRef.current;
    const sessionId = active?._id || outg?.callSessionId || inc?.callSessionId;

    if (sessionId) {
      try {
        await videoCallService.endCall({ callSessionId: sessionId, reason });
      } catch (err) {
        console.warn('End call notice:', err.message);
      }
    }

    setCallStatus('ended');
    setAgoraNotice('Call ended');

    setTimeout(() => {
      cleanupMedia();
      setCallStatus('idle');
      setOutgoingCall(null);
      setIncomingCall(null);
      setActiveSession(null);
    }, 1200);
  };

  // -------------------------------------------------------------
  // 10. Hardware Toggles (Mute Mic / Disable Camera)
  // -------------------------------------------------------------
  const toggleMic = () => {
    if (localAudioTrackRef.current) {
      const nextState = !isMicMuted;
      localAudioTrackRef.current.setEnabled(!nextState);
      setIsMicMuted(nextState);

      // Notify peer via Socket.IO
      if (socket) {
        const callerId = activeSession?.caller?._id?.toString() || activeSession?.caller?.toString();
        const receiverId = activeSession?.receiver?._id?.toString() || activeSession?.receiver?.toString();
        const myId = user?._id?.toString();

        const targetUserId =
          callerId === myId
            ? receiverId
            : callerId || outgoingCall?.receiver?._id || incomingCall?.caller?._id;

        if (targetUserId) {
          socket.emit('call:media-state', {
            targetUserId,
            isAudioMuted: nextState,
            isVideoMuted: isCamMuted
          });
        }
      }
    }
  };

  const toggleCam = () => {
    if (localVideoTrackRef.current) {
      const nextState = !isCamMuted;
      localVideoTrackRef.current.setEnabled(!nextState);
      setIsCamMuted(nextState);

      // Notify peer via Socket.IO
      if (socket) {
        const callerId = activeSession?.caller?._id?.toString() || activeSession?.caller?.toString();
        const receiverId = activeSession?.receiver?._id?.toString() || activeSession?.receiver?.toString();
        const myId = user?._id?.toString();

        const targetUserId =
          callerId === myId
            ? receiverId
            : callerId || outgoingCall?.receiver?._id || incomingCall?.caller?._id;

        if (targetUserId) {
          socket.emit('call:media-state', {
            targetUserId,
            isAudioMuted: isMicMuted,
            isVideoMuted: nextState
          });
        }
      }
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerMuted((prev) => {
      const nextMuted = !prev;
      remoteUsers.forEach((u) => {
        if (u.audioTrack) {
          u.audioTrack.setVolume(nextMuted ? 0 : 100);
        }
      });
      return nextMuted;
    });
  };

  // -------------------------------------------------------------
  // 11. Resume Audio (Browser Autoplay Policy Resolution)
  // -------------------------------------------------------------
  const resumeAudio = useCallback(async () => {
    setIsAudioAutoplayBlocked(false);

    for (const u of remoteUsers) {
      if (u.audioTrack) {
        try {
          u.audioTrack.setVolume(isSpeakerMuted ? 0 : 100);
          if (!u.audioTrack.isPlaying) {
            await u.audioTrack.play();
          }
        } catch (e) {
          console.warn('Resume audio notice:', e.message);
        }
      }
    }
  }, [remoteUsers, isSpeakerMuted]);

  // -------------------------------------------------------------
  // 12. Device Switching
  // -------------------------------------------------------------
  const switchCamera = async (deviceId) => {
    setSelectedCamera(deviceId);
    if (localVideoTrackRef.current && deviceId) {
      try {
        await localVideoTrackRef.current.setDevice(deviceId);
      } catch (e) {
        console.warn('Switch camera notice:', e.message);
      }
    }
  };

  const switchMicrophone = async (deviceId) => {
    setSelectedMic(deviceId);
    if (localAudioTrackRef.current && deviceId) {
      try {
        await localAudioTrackRef.current.setDevice(deviceId);
      } catch (e) {
        console.warn('Switch mic notice:', e.message);
      }
    }
  };

  const value = {
    callStatus,
    callType: currentCallType,
    incomingCall,
    outgoingCall,
    activeSession,
    callDuration,
    isMicMuted,
    isCamMuted,
    isSpeakerMuted,
    peerMediaState,
    permissionError,
    agoraNotice,
    networkQuality,
    cameras,
    microphones,
    selectedCamera,
    selectedMic,
    remoteUsers,
    localVideoTrack,
    localAudioTrack,
    isAudioAutoplayBlocked,
    speakingUsers,
    localVolumeLevel,
    remoteVolumeLevel,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCam,
    toggleSpeaker,
    resumeAudio,
    switchCamera,
    switchMicrophone,
    refreshDevices,
    dismissNotice: () => setAgoraNotice(null)
  };

  return <VideoCallContext.Provider value={value}>{children}</VideoCallContext.Provider>;
}

export function useVideoCall() {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error('useVideoCall must be used within a VideoCallProvider');
  }
  return context;
}
