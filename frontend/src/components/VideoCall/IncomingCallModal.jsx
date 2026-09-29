import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useVideoCall } from '../../context/VideoCallContext';

export default function IncomingCallModal() {
  const { incomingCall, acceptCall, rejectCall } = useVideoCall();

  if (!incomingCall) return null;

  const caller = incomingCall.caller || {};

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#12141c] border border-white/10 p-6 sm:p-8 text-center shadow-2xl overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-16 -left-16 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-44 h-44 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Call Type Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-semibold mb-6">
          <Video className="w-3.5 h-3.5 text-indigo-400" />
          <span>Incoming Video Call</span>
        </div>

        {/* Caller Avatar with Pulsing Ring */}
        <div className="relative mx-auto mb-5 w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping [animation-duration:2s]" />
          <div className="absolute -inset-1.5 rounded-full border-2 border-indigo-500/50 animate-pulse" />
          <img
            src={caller.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
            alt={caller.name || 'Caller'}
            className="relative w-full h-full rounded-full object-cover shadow-xl border-2 border-white/20"
          />
        </div>

        {/* Caller Info */}
        <h3 className="text-xl font-bold text-white tracking-tight">
          {caller.name || 'Unknown Caller'}
        </h3>
        <p className="text-xs text-white/60 font-medium mt-0.5 mb-8">
          @{caller.username || 'user'} is calling you...
        </p>

        {/* Action Buttons: Accept & Reject */}
        <div className="flex items-center justify-center gap-6">
          {/* Reject Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => rejectCall('declined')}
              aria-label="Decline Video Call"
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-[11px] font-semibold text-rose-400">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={acceptCall}
              aria-label="Accept Video Call"
              className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 transition-all animate-bounce [animation-duration:1.5s] cursor-pointer"
            >
              <Phone className="w-6 h-6" />
            </button>
            <span className="text-[11px] font-semibold text-emerald-400">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
