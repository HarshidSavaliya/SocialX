/**
 * Lightweight, in-memory rate limiter middleware for college project scale.
 * Avoids heavy Redis dependencies while protecting upload, interaction, and view routes.
 */

export const createRateLimiter = ({
  windowMs = 60 * 1000, // 1 minute window
  max = 30, // max requests per window
  message = 'Too many requests. Please try again later.'
} = {}) => {
  const hits = new Map();

  // Periodically clean up stale records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.startTime > windowMs * 2) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req, res, next) => {
    // Identify client by user ID (if logged in) or IP address
    const key = (req.user?._id ? req.user._id.toString() : null) || req.ip || req.connection.remoteAddress || 'anonymous';
    const now = Date.now();

    let record = hits.get(key);

    if (!record || now - record.startTime > windowMs) {
      record = {
        count: 1,
        startTime: now
      };
      hits.set(key, record);
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      return res.status(429).json({
        success: false,
        message
      });
    }

    next();
  };
};

// Rate limiter presets
export const uploadRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 uploads per 15 minutes per user/IP
  message: 'Upload limit reached. Please wait a few minutes before uploading again.'
});

export const interactionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Max 60 likes/comments per minute
  message: 'Action rate limit reached. Please slow down.'
});

export const viewRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // Max 120 view logs per minute
  message: 'View rate limit reached.'
});
