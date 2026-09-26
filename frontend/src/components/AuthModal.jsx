import React, { useState } from 'react';
import { X, Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { demoAccounts } from '../data/demoAccounts';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, quickDemoLogin } = useAuth();
  const { isDark } = useTheme();

  const [isRegisterTab, setIsRegisterTab] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please provide email or username and password');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login({ emailOrUsername: identifier, password });
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regName || !regUsername || !regEmail || !regPassword) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await register({
        name: regName,
        username: regUsername,
        email: regEmail,
        password: regPassword
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (username) => {
    setLoading(true);
    setError(null);
    try {
      await quickDemoLogin(username);
      onClose();
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md rounded-3xl overflow-hidden border shadow-2xl transition-all ${isDark
            ? 'bg-[#14161f] border-white/10 text-white'
            : 'bg-white border-slate-200 text-slate-900'
          }`}
      >
        {/* Header & Tabs */}
        <div className="p-5 pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                SX
              </div>
              <h3 className="font-extrabold text-base tracking-tight">
                Welcome to SocialX
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setIsRegisterTab(false);
                setError(null);
              }}
              className={`py-2 rounded-xl transition-all ${!isRegisterTab
                  ? isDark
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterTab(true);
                setError(null);
              }}
              className={`py-2 rounded-xl transition-all ${isRegisterTab
                  ? isDark
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 text-xs font-semibold">
              {error}
            </div>
          )}

          {!isRegisterTab ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Email or Username
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 absolute left-3 text-slate-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="alex@socialx.com or alexrivera"
                    className={`w-full py-2.5 pl-9 pr-3.5 rounded-xl text-xs bg-transparent outline-none border ${isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                      }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute left-3 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full py-2.5 pl-9 pr-3.5 rounded-xl text-xs bg-transparent outline-none border ${isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                      }`}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In</span>}
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Maya Lin"
                  className={`w-full p-2.5 rounded-xl text-xs bg-transparent outline-none border ${isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                    }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="e.g. mayalin"
                  className={`w-full p-2.5 rounded-xl text-xs bg-transparent outline-none border ${isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                    }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. maya@socialx.com"
                  className={`w-full p-2.5 rounded-xl text-xs bg-transparent outline-none border ${isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                    }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className={`w-full p-2.5 rounded-xl text-xs bg-transparent outline-none border ${isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                    }`}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Account</span>}
              </button>
            </form>
          )}

          {/* Quick Demo Login Section */}
          <div className="pt-3 border-t border-slate-100 dark:border-white/10">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2">
              ⚡ Instant 1-Click Demo Accounts
            </span>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.slice(0, 4).map((account, index) => (
                <button
                  key={account.username}
                  type="button"
                  onClick={() => handleDemoLogin(account.username)}
                  disabled={loading}
                  className={`p-2 rounded-xl text-left border transition-colors ${index === 0
                    ? 'border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
                    }`}
                >
                  <span className={`block text-xs font-bold truncate ${index === 0 ? 'text-indigo-500' : 'text-slate-800 dark:text-slate-200'}`}>
                    {account.name}
                  </span>
                  <span className="block text-[10px] text-slate-400 truncate">{account.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
