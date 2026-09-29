import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Settings,
  Signal,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useVideoCall } from '../../context/VideoCallContext';
import DeviceSelectorModal from './DeviceSelectorModal';

export default function ActiveCallModal() {
  const {
    callStatus,
    activeSession,
    incomingCall,
    outgoingCall,
    callDuration,
    isMicMuted,
    isCamMuted,
    isSpeakerMuted,
    peerMediaState,
    permissionError,
    agoraNotice,
    networkQuality,
    remoteUsers,
    localVideoTrack,
    localAudioTrack,
    isAudioAutoplayBlocked,
    speakingUsers,
    localVolumeLevel,
    remoteVolumeLevel,
    toggleMic,
    toggleCam,
    toggleSpeaker,
    resumeAudio,
    endCall,
    dismissNotice
  } = useVideoCall();

  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Determine peer user details
  const peer =
    incomingCall?.caller ||
    outgoingCall?.receiver ||
    (activeSession?.caller?.name ? activeSession.caller : activeSession?.receiver) ||
    {};

  // -------------------------------------------------------------
  // 1. Declaratively attach Local Video Track to Picture-in-Picture
  // -------------------------------------------------------------
  useEffect(() => {
    if (callStatus !== 'connected' || !localVideoRef.current || !localVideoTrack) return;

    try {
      localVideoTrack.play(localVideoRef.current);
    } catch (err) {
      console.warn('Error playing local video track:', err.message);
    }
  }, [callStatus, localVideoTrack]);

  // -------------------------------------------------------------
  // 2. Declaratively attach Remote Video Track to Main Stage
  // -------------------------------------------------------------
  useEffect(() => {
    if (callStatus !== 'connected' || !remoteVideoRef.current) return;

    const userWithVideo = remoteUsers.find((u) => u.videoTrack);
    if (userWithVideo?.videoTrack) {
      try {
        userWithVideo.videoTrack.play(remoteVideoRef.current);
      } catch (err) {
        console.warn('Error playing remote video track:', err.message);
      }
    }
  }, [callStatus, remoteUsers]);

  // -------------------------------------------------------------
  // 3. Ensure Remote Audio Playback (Only if not already playing)
  // -------------------------------------------------------------
  useEffect(() => {
    if (callStatus !== 'connected') return;

    remoteUsers.forEach(async (u) => {
      if (u.audioTrack) {
        try {
          u.audioTrack.setVolume(isSpeakerMuted ? 0 : 100);
          if (!u.audioTrack.isPlaying) {
            await u.audioTrack.play();
          }
        } catch (err) {
          console.warn('Autoplay check notice for remote audio:', err.message);
        }
      }
    });
  }, [callStatus, remoteUsers]);

  // -------------------------------------------------------------
  // 4. Update speaker volume independently without restarting playback
  // -------------------------------------------------------------
  useEffect(() => {
    remoteUsers.forEach((u) => {
      if (u.audioTrack) {
        try {
          u.audioTrack.setVolume(isSpeakerMuted ? 0 : 100);
        } catch (e) {}
      }
    });
  }, [isSpeakerMuted, remoteUsers]);

  if (callStatus !== 'connected') {
    return null;
  }

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const hasRemoteVideo = remoteUsers.some((u) => u.videoTrack && !peerMediaState.isVideoMuted);

  return (
    <div
      onClick={() => {
        if (isAudioAutoplayBlocked) {
          resumeAudio();
        }
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-2 sm:p-4 md:p-6 animate-in fade-in duration-300"
    >
      {/* Video Container Shell */}
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[840px] rounded-3xl overflow-hidden bg-[#0c0d14] border border-white/10 shadow-2xl flex flex-col justify-between">
        
        {/* =========================================================================
            REMOTE VIDEO STAGE (PRIMARY FOCUS)
            ========================================================================= */}
        <div className="absolute inset-0 z-0 bg-slate-950 flex items-center justify-center overflow-hidden">
          {/* Agora Remote Video Render Container */}
          <div
            ref={remoteVideoRef}
            id="remote-video-container"
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              hasRemoteVideo ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Fallback when Remote Video is Off or Connecting */}
          {!hasRemoteVideo && (
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl">
                <img
                  src={
                    peer.profileImage ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
                  }
                  alt={peer.name || 'Peer'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white tracking-tight">
                  {peer.name || 'Connected User'}
                </h4>
                <p className="text-xs text-white/60 font-medium">
                  {peerMediaState.isVideoMuted
                    ? 'Camera is switched off'
                    : 'Connecting video stream...'}
                </p>
              </div>
            </div>
          )}

          {/* Vignette Gradients */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/85 via-transparent to-black/60" />
        </div>

        {/* =========================================================================
            TOP HEADER BAR (PEER INFO, DURATION & CONNECTION STATUS)
            ========================================================================= */}
        <div className="relative z-10 p-4 sm:p-6 flex items-center justify-between gap-3">
          {/* Contact Details & Timer */}
          <div className="flex items-center gap-3 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-tight truncate max-w-[120px] sm:max-w-[180px]">
                {peer.name || 'SocialX Call'}
              </span>

              {/* Dynamic Remote Audio Volume Indicator */}
              <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] text-emerald-400 font-semibold">
                <div className="flex items-end gap-0.5 h-2.5 w-2.5">
                  <span className={`w-0.5 bg-emerald-400 rounded-full transition-all duration-100 ${remoteVolumeLevel > 3 ? 'h-2.5' : 'h-1'}`} />
                  <span className={`w-0.5 bg-emerald-400 rounded-full transition-all duration-100 ${remoteVolumeLevel > 15 ? 'h-2.5' : 'h-1.5'}`} />
                  <span className={`w-0.5 bg-emerald-400 rounded-full transition-all duration-100 ${remoteVolumeLevel > 30 ? 'h-2.5' : 'h-1'}`} />
                </div>
                <span>{remoteVolumeLevel > 4 ? 'Speaking' : 'Audio On'}</span>
              </div>
            </div>
            <span className="text-xs text-white/70 font-mono">
              {formatDuration(callDuration)}
            </span>
          </div>

          {/* Connection Quality & Device Settings Pill */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[11px] text-white/80">
              <Signal
                className={`w-3.5 h-3.5 ${
                  networkQuality === 'excellent'
                    ? 'text-emerald-400'
                    : networkQuality === 'poor'
                    ? 'text-amber-400'
                    : 'text-indigo-400'
                }`}
              />
              <span className="hidden sm:inline">Agora RTC HD</span>
              <span className="text-emerald-400 font-mono text-[10px]">
                {networkQuality === 'reconnecting' ? 'Reconnecting' : 'Live'}
              </span>
            </div>

            {/* Hardware Device Settings Modal Trigger */}
            <button
              onClick={() => setShowDeviceSelector(true)}
              aria-label="Audio and Video Settings"
              className="p-2 rounded-full bg-black/50 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="Select Camera & Microphone"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            NOTICES / AUTOPLAY RESTRICTION UNLOCK BANNER (CENTER STAGE)
            ========================================================================= */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto pointer-events-none px-4 space-y-3">
          {/* Autoplay Unlock Button Banner */}
          {isAudioAutoplayBlocked && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resumeAudio();
              }}
              className="flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-6 py-3 rounded-full shadow-2xl border border-white/20 animate-bounce cursor-pointer text-xs sm:text-sm tracking-wide pointer-events-auto"
            >
              <Volume2 className="w-4 h-4 text-white animate-pulse" />
              <span>Click to Enable Audio (Browser Autoplay Restricted)</span>
            </button>
          )}

          {/* Permission Warning Banner */}
          {permissionError && (
            <div className="flex items-center gap-2 bg-amber-500/90 backdrop-blur-md text-amber-950 font-bold px-4 py-2 rounded-2xl shadow-xl text-xs pointer-events-auto">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{permissionError}</span>
            </div>
          )}

          {/* Agora Sandbox Notice Banner */}
          {agoraNotice && (
            <div className="flex items-center gap-2 bg-indigo-900/80 backdrop-blur-md text-indigo-100 font-medium px-4 py-2 rounded-2xl border border-indigo-400/30 text-xs shadow-xl pointer-events-auto">
              <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>{agoraNotice}</span>
              <button
                onClick={dismissNotice}
                className="ml-2 text-indigo-300 hover:text-white text-[11px] underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Peer Muted Mic Notification */}
          {peerMediaState.isAudioMuted && (
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/10 text-[11px] text-white/80">
              <MicOff className="w-3.5 h-3.5 text-rose-400" />
              <span>{peer.name || 'User'} muted their microphone</span>
            </div>
          )}
        </div>

        {/* =========================================================================
            LOCAL VIDEO PREVIEW (PICTURE-IN-PICTURE)
            ========================================================================= */}
        <div
          className={`absolute bottom-24 right-4 sm:right-6 z-20 w-32 sm:w-44 h-44 sm:h-56 rounded-2xl overflow-hidden shadow-2xl border-2 transition-all ${
            speakingUsers?.local || localVolumeLevel > 5
              ? 'border-emerald-400 ring-4 ring-emerald-400/30'
              : 'border-white/20'
          } bg-slate-900 group`}
        >
          {/* Local Video Render Container */}
          <div
            ref={localVideoRef}
            id="local-video-container"
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isCamMuted ? 'opacity-0' : 'opacity-100'
            }`}
          />

          {/* Camera Off Placeholder */}
          {isCamMuted && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs bg-slate-900">
              <VideoOff className="w-6 h-6 mb-1 text-rose-400" />
              <span>Camera Off</span>
            </div>
          )}

          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] text-white font-medium flex items-center gap-1.5">
            <span>You</span>
            {isMicMuted ? (
              <MicOff className="w-2.5 h-2.5 text-rose-400" />
            ) : (
              <div className="flex items-end gap-0.5 h-2.5 w-2.5" title={`Mic input: ${localVolumeLevel}%`}>
                <span className={`w-0.5 bg-emerald-400 rounded-full transition-all duration-100 ${localVolumeLevel > 3 ? 'h-2.5' : 'h-1'}`} />
                <span className={`w-0.5 bg-emerald-400 rounded-full transition-all duration-100 ${localVolumeLevel > 15 ? 'h-2.5' : 'h-1.5'}`} />
                <span className={`w-0.5 bg-emerald-400 rounded-full transition-all duration-100 ${localVolumeLevel > 30 ? 'h-2.5' : 'h-1'}`} />
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            BOTTOM CONTROLS DOCK (GLASSMORPHIC BAR)
            🎤  📹  🔊  ☎
            ========================================================================= */}
        <div className="relative z-20 p-4 sm:p-6 flex items-center justify-center">
          <div className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 shadow-2xl">
            {/* 🎤 Microphone Toggle */}
            <button
              onClick={toggleMic}
              aria-label={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              className={`p-3 sm:p-3.5 rounded-full transition-all cursor-pointer ${
                !isMicMuted
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
              }`}
              title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {!isMicMuted ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {/* 📹 Camera Toggle */}
            <button
              onClick={toggleCam}
              aria-label={isCamMuted ? 'Turn Camera On' : 'Turn Camera Off'}
              className={`p-3 sm:p-3.5 rounded-full transition-all cursor-pointer ${
                !isCamMuted
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
              }`}
              title={isCamMuted ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {!isCamMuted ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {/* 🔊 Speaker Output Toggle */}
            <button
              onClick={toggleSpeaker}
              aria-label={isSpeakerMuted ? 'Unmute Audio' : 'Mute Audio'}
              className={`p-3 sm:p-3.5 rounded-full transition-all cursor-pointer ${
                !isSpeakerMuted
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
              }`}
              title={isSpeakerMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {!isSpeakerMuted ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* ☎ End Call (Crimson Pill) */}
            <button
              onClick={() => endCall('user_ended')}
              aria-label="End Video Call"
              className="px-5 py-3 sm:py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold flex items-center gap-2 shadow-lg shadow-rose-600/40 transition-all cursor-pointer"
              title="End Call"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="text-xs tracking-wider uppercase font-extrabold hidden sm:inline">
                End
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* Device Selector Modal */}
      {showDeviceSelector && (
        <DeviceSelectorModal isOpen={showDeviceSelector} onClose={() => setShowDeviceSelector(false)} />
      )}
    </div>
  );
}
