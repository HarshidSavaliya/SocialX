import React, { useState } from 'react';
import { Lock, ShieldCheck, X, Loader2, AlertCircle, Clock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { secretChatService } from '../services/secretChatService';

export default function StartSecretChatModal({
  isOpen,
  targetUser,
  onClose,
  onChatStarted
}) {
  const { isDark } = useTheme();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [autoDeleteLimit, setAutoDeleteLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !targetUser) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!pin || !/^\d{4,6}$/.test(pin)) {
      setError('PIN must be 4 to 6 digits (numbers only)');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    try {
      setLoading(true);
      const res = await secretChatService.startSecretChat({
        targetUserId: targetUser.id || targetUser._id,
        pin,
        autoDeleteLimit
      });

      if (onChatStarted) {
        onChatStarted(res.conversation, res.secretToken);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to initialize secret chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4 relative ${
          isDark ? 'bg-[#0e111a] border-emerald-500/30 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight">Initialize Secret Chat</h3>
            <span className="text-xs text-slate-400">
              With <strong>@{targetUser.username}</strong>
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Create a private, ephemeral channel protected by a security PIN. Messages are strictly isolated from normal chat history and auto-destruct when message limits are reached.
        </p>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* PIN Input */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              Create Security PIN (4–6 digits)
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="e.g. 1234"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className={`w-full p-2.5 rounded-xl text-sm font-mono tracking-widest text-center bg-transparent border outline-none ${
                isDark ? 'border-white/10 text-white focus:border-emerald-500/50' : 'border-slate-200 text-slate-900'
              }`}
              required
            />
          </div>

          {/* Confirm PIN */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              Confirm Security PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Re-enter PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              className={`w-full p-2.5 rounded-xl text-sm font-mono tracking-widest text-center bg-transparent border outline-none ${
                isDark ? 'border-white/10 text-white focus:border-emerald-500/50' : 'border-slate-200 text-slate-900'
              }`}
              required
            />
          </div>

          {/* Auto-Delete Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Delete Message Limit</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[20, 50, 100].map((limit) => (
                <button
                  key={limit}
                  type="button"
                  onClick={() => setAutoDeleteLimit(limit)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    autoDeleteLimit === limit
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                      : 'bg-white/[0.03] text-slate-400 border-white/5 hover:bg-white/5'
                  }`}
                >
                  {limit} msgs
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Oldest messages are wiped automatically once the limit is exceeded.
            </span>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !pin || !confirmPin}
              className="w-full py-3 rounded-full text-xs font-bold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-black transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Start Protected Secret Chat</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
