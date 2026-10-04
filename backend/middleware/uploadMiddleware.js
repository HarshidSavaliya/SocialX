import path from 'path';
import multer from 'multer';

// Memory storage for memory-safe streaming to Cloudinary
const storage = multer.memoryStorage();

// Allowed video, image, audio, and encrypted binary mime types and extensions
const ALLOWED_EXTENSIONS = new Set([
  // Images
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.heic',
  // Videos
  '.mp4',
  '.webm',
  '.mov',
  '.mkv',
  // Audio
  '.mp3',
  '.wav',
  '.ogg',
  '.m4a',
  // Encrypted E2EE Binary (Secret Chat)
  '.enc',
  '.bin',
  '.dat'
]);

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  // Videos
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  // Audio
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/x-m4a',
  'audio/mp4',
  // Encrypted E2EE Binary (Secret Chat)
  'application/octet-stream',
  'application/encrypted'
]);

// Size Limits in MB
const LIMITS = {
  IMAGE_MB: 10,
  VIDEO_MB: 50,
  AUDIO_MB: 20,
  ENCRYPTED_MB: 50
};

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  // Allow encrypted secret binary even if original name was sanitized
  const isEncrypted = mime === 'application/octet-stream' || mime === 'application/encrypted' || ext === '.enc';
  const isMimeValid = ALLOWED_MIME_TYPES.has(mime);
  const isExtValid = ALLOWED_EXTENSIONS.has(ext) || isEncrypted;

  if (isMimeValid && isExtValid) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Supported formats: Images (JPG, PNG, WEBP, GIF), Videos (MP4, WEBM, MOV), Audio (MP3, WAV, OGG, M4A), and Encrypted Secret Blobs.'
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: LIMITS.VIDEO_MB * 1024 * 1024 // Top limit 50MB
  },
  fileFilter
});

export const uploadSingleMedia = (req, res, next) => {
  upload.single('media')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `File size exceeds the 50MB maximum upload limit.`
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload validation failed.'
      });
    }

    // Dynamic type-specific size checks
    if (req.file) {
      const mime = (req.file.mimetype || '').toLowerCase();
      const bytes = req.file.size || req.file.buffer?.length || 0;

      if (mime.startsWith('image/') && bytes > LIMITS.IMAGE_MB * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: `Image exceeds the ${LIMITS.IMAGE_MB}MB limit.`
        });
      }

      if (mime.startsWith('audio/') && bytes > LIMITS.AUDIO_MB * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: `Audio file exceeds the ${LIMITS.AUDIO_MB}MB limit.`
        });
      }

      if (mime.startsWith('video/') && bytes > LIMITS.VIDEO_MB * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: `Video exceeds the ${LIMITS.VIDEO_MB}MB limit.`
        });
      }
    }

    next();
  });
};
