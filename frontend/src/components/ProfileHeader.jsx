import React, { useState } from 'react';
import {
  MapPin,
  Link as LinkIcon,
  Edit3,
  Camera,
  ShieldCheck,
  Users,
  UserCheck,
  Loader2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { userService } from '../services/userService';
import FollowButton from './FollowButton';
import FollowersModal from './FollowersModal';
import FollowingModal from './FollowingModal';

export default function ProfileHeader({
  profile,
  onProfileUpdated,
  onFollowToggle
}) {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState(profile?.name || '');
  const [editBio, setEditBio] = useState(profile?.bio || '');
  const [editLocation, setEditLocation] = useState(profile?.location || '');
  const [editWebsite, setEditWebsite] = useState(profile?.website || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const isSelf = profile?.isSelf || (user && user.id === profile?.id);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const updated = await userService.updateProfile({
        name: editName.trim(),
        bio: editBio.trim(),
        location: editLocation.trim(),
        website: editWebsite.trim()
      });

      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
      setShowEditModal(false);
    } catch (err) {
      alert(err.message || 'Could not update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    try {
      const res = await userService.updateProfileImage(file);
      if (onProfileUpdated) {
        onProfileUpdated({ ...profile, profileImage: res.profileImage });
      }
    } catch (err) {
      alert(err.message || 'Could not upload profile image');
    } finally {
      setImageUploading(false);
    }
  };

  const coverImage =
    profile?.coverImage ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=80';
  const profileImage =
    profile?.profileImage ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';

  return (
    <div
      className={`rounded-3xl overflow-hidden transition-all duration-300 border ${isDark
          ? 'bg-white/[0.04] border-white/[0.08] shadow-xl'
          : 'bg-white border-slate-200/80 shadow-xs'
        }`}
    >
      {/* Cover Image */}
      <div className="relative h-44 sm:h-56 w-full overflow-hidden bg-slate-900">
        <img
          src={coverImage}
          alt="Cover"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Profile Details Container */}
      <div className="px-5 sm:px-8 pb-6 relative">
        <div className="flex flex-wrap items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-4">
          {/* Avatar with upload trigger for self */}
          <div className="relative group/avatar">
            <img
              src={profileImage}
              alt={profile?.name}
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover ring-4 ring-white dark:ring-[#14161f] shadow-xl"
            />
            {isSelf && (
              <label
                className="absolute inset-0 rounded-3xl bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-xs font-bold gap-1"
                title="Change profile photo"
              >
                {imageUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    <span>Upload</span>
                  </>
                )}
                <input
                  type="file"
                  onChange={handleAvatarFileChange}
                  accept="image/*"
                  className="hidden"
                  disabled={imageUploading}
                />
              </label>
            )}
          </div>

          {/* Action Button: Edit Profile OR FollowButton */}
          <div className="flex items-center gap-2">
            {isSelf ? (
              <button
                onClick={() => {
                  setEditName(profile?.name || '');
                  setEditBio(profile?.bio || '');
                  setEditLocation(profile?.location || '');
                  setEditWebsite(profile?.website || '');
                  setShowEditModal(true);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all ${isDark
                    ? 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                  }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <FollowButton
                userId={profile?.id}
                initialFollowing={profile?.isFollowing}
                onToggle={onFollowToggle}
                size="lg"
              />
            )}
          </div>
        </div>

        {/* Name, Handle & Bio */}
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {profile?.name}
            </h1>
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            @{profile?.username}
          </p>

          {profile?.bio && (
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-3 leading-relaxed whitespace-pre-line">
              {profile.bio}
            </p>
          )}

          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
            {profile?.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile?.website && (
              <div className="flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                <a
                  href={
                    profile.website.startsWith('http')
                      ? profile.website
                      : `https://${profile.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline text-indigo-400"
                >
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Stats Row with clickable Followers and Following */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-white/[0.06] max-w-md">
          <div>
            <span className="block text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {profile?.postsCount || 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">Posts</span>
          </div>

          <div
            onClick={() => setShowFollowersModal(true)}
            className="cursor-pointer group"
          >
            <span className="block text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
              {profile?.followersCount || 0}
            </span>
            <span className="text-xs text-slate-400 font-medium group-hover:text-indigo-500 transition-colors">
              Followers
            </span>
          </div>

          <div
            onClick={() => setShowFollowingModal(true)}
            className="cursor-pointer group"
          >
            <span className="block text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
              {profile?.followingCount || 0}
            </span>
            <span className="text-xs text-slate-400 font-medium group-hover:text-indigo-500 transition-colors">
              Following
            </span>
          </div>
        </div>
      </div>

      {/* Followers Modal */}
      {showFollowersModal && (
        <FollowersModal
          isOpen={showFollowersModal}
          userId={profile?.id}
          targetUsername={profile?.username}
          onClose={() => setShowFollowersModal(false)}
        />
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <FollowingModal
          isOpen={showFollowingModal}
          userId={profile?.id}
          targetUsername={profile?.username}
          onClose={() => setShowFollowingModal(false)}
        />
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-3xl overflow-hidden border shadow-2xl transition-all ${isDark
                ? 'bg-[#14161f] border-white/10 text-white'
                : 'bg-white border-slate-200 text-slate-900'
              }`}
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-base">Edit Profile Information</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="p-4 sm:p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs bg-transparent outline-none border ${isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                    }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Bio
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs bg-transparent outline-none border resize-none ${isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                    }`}
                  placeholder="Share a short bio..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs bg-transparent outline-none border ${isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                    }`}
                  placeholder="e.g. San Francisco, CA"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Website
                </label>
                <input
                  type="text"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs bg-transparent outline-none border ${isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                    }`}
                  placeholder="e.g. https://myportfolio.dev"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
                >
                  {isUpdating && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
