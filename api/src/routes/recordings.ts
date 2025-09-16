import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect, authorize } from '../middleware/auth';
import { Recording } from '../models/Recording';
import { Session } from '../models/Session';

const router = express.Router();

// @desc    Test authorization for recording uploads
// @route   GET /api/recordings/test-auth/:sessionId
// @access  Private (Instructor, Admin)
router.get('/test-auth/:sessionId', 
  protect, 
  authorize('instructor', 'admin', 'super_admin'),
  async (req: any, res: any, next: any) => {
    try {
      const { sessionId } = req.params;

      // Check if session exists
      const session = await Session.findById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      // Check authorization
      const isAuthorized = session.instructorId.toString() === req.user._id.toString() || 
                          ['admin', 'super_admin'].includes(req.user.role);

      res.json({
        success: true,
        message: 'Authorization test completed',
        data: {
          sessionId: sessionId,
          sessionInstructorId: session.instructorId.toString(),
          userId: req.user._id.toString(),
          userRole: req.user.role,
          isAuthorized: isAuthorized,
          isInstructor: session.instructorId.toString() === req.user._id.toString(),
          isAdmin: ['admin', 'super_admin'].includes(req.user.role)
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

// Configure multer for video file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const recordingsDir = path.join(__dirname, '../../recordings');
    // Ensure directory exists
    const fs = require('fs');
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
      console.log('Created recordings directory for upload:', recordingsDir);
    }
    cb(null, recordingsDir);
  },
  filename: (req, file, cb) => {
    const sessionId = req.params.sessionId;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `session_${sessionId}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
  limits: {
    fileSize: 0 // No file size limit for recordings
  }
});

// @desc    Upload recording for a session
// @route   POST /api/recordings/upload/:sessionId
// @access  Private (Instructor, Admin)
router.post('/upload/:sessionId', 
  protect, 
  authorize('instructor', 'admin', 'super_admin'),
  (req: any, res: any, next: any) => {
    console.log('Recording upload middleware - User info:', {
      userId: req.user?._id,
      userRole: req.user?.role,
      sessionId: req.params.sessionId
    });
    next();
  },
  upload.single('recording'),
  (error: any, req: any, res: any, next: any) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: 'File too large. Please check your server configuration and try again.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${error.message}`
      });
    }
    next();
  },
  async (req: any, res: any, next: any) => {
    try {
      const { sessionId } = req.params;
      const { title, description } = req.body;

      // Check if session exists
      const session = await Session.findById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      // Check authorization with detailed logging
      const isSessionInstructor = session.instructorId.toString() === req.user._id.toString();
      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      const isAuthorized = isSessionInstructor || isAdmin;

      console.log('Authorization check for recording upload:', {
        sessionId: sessionId,
        sessionInstructorId: session.instructorId.toString(),
        userId: req.user._id.toString(),
        userRole: req.user.role,
        isInstructor: isSessionInstructor,
        isAdmin: isAdmin,
        isAuthorized: isAuthorized
      });

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to upload recordings for this session',
          debug: {
            sessionInstructorId: session.instructorId.toString(),
            userId: req.user._id.toString(),
            userRole: req.user.role,
            isInstructor: isSessionInstructor,
            isAdmin: isAdmin
          }
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No recording file uploaded'
        });
      }

      // Create recording record
      const recording = await Recording.create({
        sessionId: session._id,
        courseId: session.courseId,
        zoomRecordingId: `local_${sessionId}_${Date.now()}`,
        title: title || `${session.title} - Recording`,
        description: description || `Recording for ${session.title}`,
        recordingUrl: `${req.protocol}://${req.get('host')}/recordings/${req.file.filename}`,
        localFilePath: `/recordings/${req.file.filename}`,
        duration: 0, // Will need to be updated manually or via metadata
        fileSize: req.file.size,
        recordedAt: new Date(),
        isProcessed: true
      });

      // Update session to mark it has recording
      await Session.findByIdAndUpdate(sessionId, { hasRecording: true });

      res.status(201).json({
        success: true,
        message: 'Recording uploaded successfully',
        data: { recording }
      });

    } catch (error) {
      next(error);
    }
  }
);

export default router;
