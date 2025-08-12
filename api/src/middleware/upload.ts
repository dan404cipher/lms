import multer from 'multer';
import path from 'path';

// Configure multer for file uploads
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
  const allowedDocumentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const allowedScormTypes = ['application/zip', 'application/x-zip-compressed'];

  const allowedTypes = [
    ...allowedImageTypes,
    ...allowedVideoTypes,
    ...allowedDocumentTypes,
    ...allowedScormTypes
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, documents, and SCORM packages are allowed.'));
  }
};

// Create multer instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 1 // Only allow 1 file at a time
  }
});

// Multiple file upload for resources
export const uploadMultiple = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
    files: 5 // Allow up to 5 files
  }
});

// Specific upload configurations
export const imageUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for images
    files: 1
  }
});

export const videoUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video type. Only MP4, WebM, and OGG are allowed.'));
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB for videos
    files: 1
  }
});

export const documentUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid document type. Only PDF and Word documents are allowed.'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for documents
    files: 1
  }
});
