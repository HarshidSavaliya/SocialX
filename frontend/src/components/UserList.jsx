import React from 'react';
import UserCard from './UserCard';
import { UserSkeleton } from './LoadingSkeleton';

export default function UserList({
  users = [],
  isLoading = false,
  emptyMessage = 'No users found.',
  onNavigate,
  onFollowToggle
}) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        <UserSkeleton />
        <UserSkeleton />
        <UserSkeleton />
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-1 divide-y divide-slate-100/60 dark:divide-white/[0.04]">
      {users.map((user) => (
        <UserCard
          key={user.id || user._id}
          user={user}
          onNavigate={onNavigate}
          onFollowToggle={onFollowToggle}
        />
      ))}
    </div>
  );
}
