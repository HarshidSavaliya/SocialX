import multer from 'multer';

// Use memory storage for direct streaming to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    // Videos
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/mpeg'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only JPEG, PNG, WEBP, GIF images and MP4, WEBM, MOV videos are allowed.'
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB memory-safe limit
  },
  fileFilter
});

export const uploadSingleMedia = upload.single('media');
