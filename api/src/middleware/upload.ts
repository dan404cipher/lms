import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Ensure uploads directory exists
const uploadsDir = path.resolve(__dirname, '../../uploads');
const tempDir = path.join(uploadsDir, 'temp');

// Create directories if they don't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure multer for file uploads using disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Store temporarily in temp directory
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with original extension
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    cb(null, fileName);
  }
});

// File filter function
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/mkv', 'video/wmv', 'video/flv'];
  const allowedDocumentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/rtf'];
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
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB limit
    files: 1 // Only allow 1 file at a time
  }
});

// Multiple file upload for resources
export const uploadMultiple = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB limit
    files: 5 // Allow up to 5 files
  }
});

// Assessment file upload - allows multiple files with no size limit and any format
export const uploadAssessment = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow any file type for assessments
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB per file (effectively no limit)
    files: 10 // Allow up to 10 files for assessment submissions
  }
});

// Assessment attachment upload for instructors - allows any file type and size
export const uploadAssessmentAttachment = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow any file type for assessment attachments
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB per file (effectively no limit)
    files: 5 // Allow up to 5 files for assessment attachments
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
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB limit
    files: 1
  }
});

export const videoUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/mkv'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video type. Only MP4, WebM, OGG, AVI, MOV, and MKV are allowed.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB limit
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
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB limit
    files: 1
  }
});

// Multer error handling middleware
export const handleMulterError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Please check your server configuration and try again.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Please upload fewer files.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`
    });
  }
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next();
};
