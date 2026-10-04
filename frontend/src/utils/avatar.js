/**
 * Utility functions for user avatars, fallback graphics, and default profile photos
 */

export const getDefaultAvatar = (name = 'User') => {
  const cleanName = encodeURIComponent((name || 'User').trim());
  return `https://ui-avatars.com/api/?name=${cleanName}&background=4f46e5&color=fff&bold=true&format=svg`;
};

export const getUserAvatar = (user) => {
  if (user?.profileImage && typeof user.profileImage === 'string' && user.profileImage.trim() !== '') {
    return user.profileImage;
  }
  if (user?.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== '') {
    return user.avatar;
  }
  return getDefaultAvatar(user?.name || user?.username || 'SocialX User');
};

export const handleImageError = (e, fallbackName = 'User') => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = getDefaultAvatar(fallbackName);
};
