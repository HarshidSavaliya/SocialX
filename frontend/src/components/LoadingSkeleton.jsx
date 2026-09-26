import React from 'react';
import { useTheme } from '../context/ThemeContext';

export function PostSkeleton() {
  const { isDark } = useTheme();
  const bgPulse = isDark ? 'bg-white/10' : 'bg-slate-200';

  return (
    <div
      className={`p-5 rounded-3xl animate-pulse space-y-4 border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-full ${bgPulse}`} />
        <div className="space-y-1.5 flex-1">
          <div className={`h-3 w-28 rounded-full ${bgPulse}`} />
          <div className={`h-2.5 w-20 rounded-full ${bgPulse}`} />
        </div>
      </div>

      <div className="space-y-2 py-1">
        <div className={`h-3 w-full rounded-full ${bgPulse}`} />
        <div className={`h-3 w-4/5 rounded-full ${bgPulse}`} />
      </div>

      <div className={`h-64 w-full rounded-2xl ${bgPulse}`} />

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
        <div className="flex gap-4">
          <div className={`h-4 w-12 rounded-full ${bgPulse}`} />
          <div className={`h-4 w-12 rounded-full ${bgPulse}`} />
        </div>
        <div className={`h-4 w-16 rounded-full ${bgPulse}`} />
      </div>
    </div>
  );
}

export function UserSkeleton() {
  const { isDark } = useTheme();
  const bgPulse = isDark ? 'bg-white/10' : 'bg-slate-200';

  return (
    <div className="flex items-center justify-between p-2.5 animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-full ${bgPulse}`} />
        <div className="space-y-1.5">
          <div className={`h-3 w-24 rounded-full ${bgPulse}`} />
          <div className={`h-2.5 w-16 rounded-full ${bgPulse}`} />
        </div>
      </div>
      <div className={`h-7 w-16 rounded-full ${bgPulse}`} />
    </div>
  );
}

export default function LoadingSkeleton({ count = 3, type = 'post' }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: count }).map((_, idx) => (
        type === 'user' ? <UserSkeleton key={idx} /> : <PostSkeleton key={idx} />
      ))}
    </div>
  );
}
