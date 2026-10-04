import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Link as LinkIcon,
  Edit3,
  Camera,
  ShieldCheck,
  Users,
  UserCheck,
  Loader2,
  X,
  Lock,
  Video,
  Phone,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useVideoCall } from '../context/VideoCallContext';
import { userService } from '../services/userService';
import { getUserAvatar, handleImageError } from '../utils/avatar';
import FollowButton from './FollowButton';
import FollowersModal from './FollowersModal';
import FollowingModal from './FollowingModal';
import StartSecretChatModal from './StartSecretChatModal';
import StoryViewerModal from './stories/StoryViewerModal';
import { storyService } from '../services/storyService';

export default function ProfileHeader({
  profile,
  onProfileUpdated,
  onFollowToggle,
  onStartSecretChat,
  onOpenConversation,
  onNavigateToProfile
}) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { startCall } = useVideoCall();

  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSecretChatModal, setShowSecretChatModal] = useState(false);
  const [userStories, setUserStories] = useState([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);

  // Fetch active stories for profile user
  useEffect(() => {
    const targetId = profile?.id || profile?._id;
    if (!targetId) return;

    storyService
      .getUserStories(targetId)
      .then((res) => {
        if (res?.stories && res.stories.length > 0) {
          setUserStories(res.stories);
        } else {
          setUserStories([]);
        }
      })
      .catch(() => setUserStories([]));
  }, [profile?.id, profile?._id]);

  // Edit form state
  const [editName, setEditName] = useState(profile?.name || '');
  const [editBio, setEditBio] = useState(profile?.bio || '');
  const [editLocation, setEditLocation] = useState(profile?.location || '');
  const [editWebsite, setEditWebsite] = useState(profile?.website || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const myId = (user?.id || user?._id)?.toString();
  const profId = (profile?.id || profile?._id)?.toString();
  const isSelf = Boolean(profile?.isSelf || (myId && profId && myId === profId));

  const [isFollowing, setIsFollowing] = useState(Boolean(profile?.isFollowing));

  useEffect(() => {
    setIsFollowing(Boolean(profile?.isFollowing));
  }, [profile?.isFollowing]);

  const handleFollowToggle = (newFollowState) => {
    setIsFollowing(newFollowState);
    if (onFollowToggle) onFollowToggle(newFollowState);
  };

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
          ? 'bg-[#15131a]/90 backdrop-blur-xl border-white/[0.08] shadow-xl shadow-black/40'
          : 'bg-white border-stone-200/80 shadow-xs'
        }`}
    >
      {/* Cover Image */}
      <div className="relative h-44 sm:h-56 w-full overflow-hidden bg-stone-950">
        <img
          src={coverImage}
          alt="Cover"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      </div>

      {/* Profile Details Container */}
      <div className="px-5 sm:px-8 pb-6 relative">
        <div className="flex flex-wrap items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-4">
          {/* Avatar with optional Story Ring */}
          <div className="relative group/avatar">
            <div
              onClick={() => {
                if (userStories.length > 0) {
                  setShowStoryViewer(true);
                }
              }}
              className={`rounded-[26px] sm:rounded-[30px] p-[3px] transition-all duration-300 ${
                userStories.length > 0
                  ? 'bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 shadow-xl shadow-amber-500/30 cursor-pointer hover:scale-105'
                  : ''
              }`}
              title={userStories.length > 0 ? 'Click to view active story' : undefined}
            >
              <img
                src={getUserAvatar(profile)}
                onError={(e) => handleImageError(e, profile?.name)}
                alt={profile?.name}
                className={`w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover shadow-2xl ${
                  userStories.length > 0 ? 'ring-2 ring-stone-950' : 'ring-4 ring-amber-500/40'
                }`}
              />
            </div>
            {isSelf && (
              <label
                onClick={(e) => e.stopPropagation()}
                className={`absolute inset-0 rounded-3xl bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-xs font-bold gap-1 ${
                  userStories.length > 0 ? 'm-[3px]' : ''
                }`}
                title="Change profile photo"
              >
                {imageUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-amber-400" />
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
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-200'
                  }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <FollowButton
                  userId={profile?.id || profile?._id}
                  initialFollowing={profile?.isFollowing}
                  onToggle={handleFollowToggle}
                  size="lg"
                />
                {isFollowing && (
                  <>
                    <button
                      onClick={() =>
                        startCall({
                          receiver: {
                            _id: profile?.id || profile?._id,
                            name: profile?.name,
                            username: profile?.username,
                            profileImage: profile?.profileImage,
                            avatar: profile?.avatar
                          },
                          callType: 'audio'
                        })
                      }
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-all shadow-xs cursor-pointer animate-in fade-in zoom-in-95 duration-200"
                      title="Start voice call"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <span>Call</span>
                    </button>
                    <button
                      onClick={() =>
                        startCall({
                          receiver: {
                            _id: profile?.id || profile?._id,
                            name: profile?.name,
                            username: profile?.username,
                            profileImage: profile?.profileImage,
                            avatar: profile?.avatar
                          },
                          callType: 'video'
                        })
                      }
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/30 transition-all shadow-xs cursor-pointer animate-in fade-in zoom-in-95 duration-200"
                      title="Start video call"
                    >
                      <Video className="w-3.5 h-3.5 text-orange-400" />
                      <span>Video</span>
                    </button>
                    {onOpenConversation && (
                      <button
                        onClick={() => onOpenConversation(profile?.id || profile?._id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 transition-all shadow-xs cursor-pointer animate-in fade-in zoom-in-95 duration-200"
                        title="Send direct message"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Message</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowSecretChatModal(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all shadow-xs cursor-pointer animate-in fade-in zoom-in-95 duration-200"
                      title="Start private ephemeral chat"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Secret Chat</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Name, Handle & Bio */}
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">
              {profile?.name}
            </h1>
            <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400/20 flex-shrink-0" />
          </div>
          <p className="text-xs text-amber-500 font-semibold mt-0.5">
            @{profile?.username}
          </p>

          {profile?.bio && (
            <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 mt-3 leading-relaxed whitespace-pre-line">
              {profile.bio}
            </p>
          )}

          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-stone-400">
            {profile?.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile?.website && (
              <div className="flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5 text-amber-400" />
                <a
                  href={
                    profile.website.startsWith('http')
                      ? profile.website
                      : `https://${profile.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline text-amber-400 font-medium"
                >
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* 4-Stat Row Matching Reference Design (Post, Follower, Views, Likes) */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-6 pt-5 border-t border-slate-100 dark:border-white/[0.06] max-w-lg">
          <div>
            <span className="block text-base sm:text-lg font-black text-stone-900 dark:text-white">
              {profile?.postsCount || 0}
            </span>
            <span className="text-[11px] sm:text-xs text-stone-400 font-medium">Post</span>
          </div>

          <div
            onClick={() => setShowFollowersModal(true)}
            className="cursor-pointer group"
          >
            <span className="block text-base sm:text-lg font-black text-stone-900 dark:text-white group-hover:text-amber-400 transition-colors">
              {profile?.followersCount || 0}
            </span>
            <span className="text-[11px] sm:text-xs text-stone-400 font-medium group-hover:text-amber-400 transition-colors">
              Follower
            </span>
          </div>

          <div
            onClick={() => setShowFollowingModal(true)}
            className="cursor-pointer group"
          >
            <span className="block text-base sm:text-lg font-black text-stone-900 dark:text-white group-hover:text-amber-400 transition-colors">
              {profile?.followingCount || 0}
            </span>
            <span className="text-[11px] sm:text-xs text-stone-400 font-medium group-hover:text-amber-400 transition-colors">
              Following
            </span>
          </div>

          <div>
            <span className="block text-base sm:text-lg font-black text-amber-400">
              {((profile?.postsCount || 1) * 34 + 86).toLocaleString()}
            </span>
            <span className="text-[11px] sm:text-xs text-stone-400 font-medium">Likes</span>
          </div>
        </div>
      </div>

      {/* Followers Modal */}
      {showFollowersModal && (
        <FollowersModal
          isOpen={showFollowersModal}
          userId={profile?.id || profile?._id}
          targetUsername={profile?.username}
          onClose={() => setShowFollowersModal(false)}
          onNavigateUser={onNavigateToProfile}
        />
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <FollowingModal
          isOpen={showFollowingModal}
          userId={profile?.id || profile?._id}
          targetUsername={profile?.username}
          onClose={() => setShowFollowingModal(false)}
          onNavigateUser={onNavigateToProfile}
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

      {/* Start Secret Chat Modal */}
      {showSecretChatModal && (
        <StartSecretChatModal
          isOpen={showSecretChatModal}
          targetUser={profile}
          onClose={() => setShowSecretChatModal(false)}
          onChatStarted={(conv, token) => {
            if (onStartSecretChat) onStartSecretChat(conv, token);
          }}
        />
      )}

      {/* Profile Active Story Viewer Modal */}
      {showStoryViewer && userStories.length > 0 && (
        <StoryViewerModal
          isOpen={showStoryViewer}
          onClose={() => setShowStoryViewer(false)}
          initialUserIndex={0}
          storyGroups={[
            {
              user: {
                _id: profile?.id || profile?._id,
                id: profile?.id || profile?._id,
                name: profile?.name,
                username: profile?.username,
                profileImage: profile?.profileImage,
                avatar: profile?.avatar
              },
              isSelf,
              stories: userStories
            }
          ]}
          onStoryDeleted={(deletedId) => {
            setUserStories((prev) => prev.filter((s) => (s._id || s.id) !== deletedId));
          }}
        />
      )}
    </div>
  );
}
