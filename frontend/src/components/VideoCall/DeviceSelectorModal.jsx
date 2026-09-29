import React from 'react';
import { Camera, Mic, X, Check, Volume2 } from 'lucide-react';
import { useVideoCall } from '../../context/VideoCallContext';

export default function DeviceSelectorModal({ isOpen, onClose }) {
  const {
    cameras,
    microphones,
    selectedCamera,
    selectedMic,
    localVolumeLevel,
    switchCamera,
    switchMicrophone,
    refreshDevices
  } = useVideoCall();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl bg-[#161822] border border-white/10 p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">Audio & Video Devices</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Device Settings"
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Camera Selection */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
              <Camera className="w-4 h-4 text-indigo-400" />
              <span>Camera</span>
            </label>
            {cameras.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No cameras detected</p>
            ) : (
              <select
                value={selectedCamera}
                onChange={(e) => switchCamera(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {cameras.map((cam, idx) => (
                  <option key={cam.deviceId || idx} value={cam.deviceId} className="bg-slate-900 text-white">
                    {cam.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Microphone Selection */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
              <Mic className="w-4 h-4 text-indigo-400" />
              <span>Microphone</span>
            </label>
            {microphones.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No microphones detected</p>
            ) : (
              <select
                value={selectedMic}
                onChange={(e) => switchMicrophone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {microphones.map((mic, idx) => (
                  <option key={mic.deviceId || idx} value={mic.deviceId} className="bg-slate-900 text-white">
                    {mic.label || `Microphone ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}

            {/* Live Microphone Volume Meter */}
            <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-medium">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Live Input Volume</span>
                </span>
                <span className="font-mono text-emerald-400">{localVolumeLevel}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 rounded-full ${
                    localVolumeLevel > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, localVolumeLevel * 2)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                Speak into your mic — the green bar should jump to indicate active audio capture.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={() => {
              refreshDevices();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}
