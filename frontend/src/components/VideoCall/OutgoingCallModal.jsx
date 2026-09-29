import React from 'react';
import { PhoneOff, Video, AlertCircle } from 'lucide-react';
import { useVideoCall } from '../../context/VideoCallContext';

export default function OutgoingCallModal() {
  const { callStatus, outgoingCall, agoraNotice, endCall } = useVideoCall();

  if (callStatus !== 'outgoing' && callStatus !== 'busy' && callStatus !== 'missed') {
    return null;
  }

  const receiver = outgoingCall?.receiver || {};

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#12141c] border border-white/10 p-6 sm:p-8 text-center shadow-2xl overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-16 -left-16 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-44 h-44 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Call Type Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-semibold mb-6">
          <Video className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            {callStatus === 'busy'
              ? 'User Busy'
              : callStatus === 'missed'
              ? 'No Answer'
              : 'Video Calling...'}
          </span>
        </div>

        {/* Recipient Avatar with Ripple Effect */}
        <div className="relative mx-auto mb-5 w-24 h-24">
          {callStatus === 'outgoing' && (
            <>
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping [animation-duration:2.5s]" />
              <div className="absolute -inset-2 rounded-full border border-indigo-400/30 animate-pulse" />
            </>
          )}
          <img
            src={receiver.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
            alt={receiver.name || 'Recipient'}
            className="relative w-full h-full rounded-full object-cover shadow-xl border-2 border-white/20"
          />
        </div>

        {/* Recipient Name */}
        <h3 className="text-xl font-bold text-white tracking-tight">
          {receiver.name || 'Calling...'}
        </h3>
        <p className="text-xs text-white/60 font-medium mt-0.5 mb-2">
          @{receiver.username || 'user'}
        </p>

        {/* Status Message */}
        <div className="my-6">
          {agoraNotice ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-300 text-xs font-medium border border-amber-500/25">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{agoraNotice}</span>
            </div>
          ) : callStatus === 'outgoing' ? (
            <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              <span>Ringing... waiting for answer</span>
            </div>
          ) : null}
        </div>

        {/* Cancel Call Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => endCall('cancelled')}
            aria-label="Cancel Video Call"
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
          <span className="text-[11px] font-semibold text-rose-400">Cancel</span>
        </div>
      </div>
    </div>
  );
}
