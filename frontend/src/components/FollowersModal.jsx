import React, { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { followService } from '../services/followService';
import { useTheme } from '../context/ThemeContext';
import UserList from './UserList';

export default function FollowersModal({
  isOpen,
  userId,
  targetUsername,
  onClose,
  onNavigateUser
}) {
  const { isDark } = useTheme();

  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchFollowers = async () => {
      try {
        setLoading(true);
        const data = await followService.getFollowers(userId);
        if (isMounted) {
          setFollowers(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Could not load followers');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (userId) {
      fetchFollowers();
    }
    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md rounded-3xl overflow-hidden border shadow-2xl transition-all ${isDark
            ? 'bg-[#14161f] border-white/10 text-white'
            : 'bg-white border-slate-200 text-slate-900'
          }`}
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-sm sm:text-base">
              Followers · @{targetUsername}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto">
          {error ? (
            <div className="text-center py-4 text-xs text-rose-500">{error}</div>
          ) : (
            <UserList
              users={followers}
              isLoading={loading}
              emptyMessage="No followers yet."
              onNavigate={(username) => {
                onClose();
                if (onNavigateUser) onNavigateUser(username);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
