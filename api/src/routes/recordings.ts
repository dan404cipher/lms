import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect, authorize } from '../middleware/auth';
import { Recording } from '../models/Recording';
import { Session } from '../models/Session';

const router = express.Router();

// Configure multer for video file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../recordings'));
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
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// @desc    Upload recording for a session
// @route   POST /api/recordings/upload/:sessionId
// @access  Private (Instructor, Admin)
router.post('/upload/:sessionId', 
  protect, 
  authorize('instructor', 'admin', 'super_admin'),
  upload.single('recording'),
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

      // Check authorization
      if (session.instructorId.toString() !== req.user._id.toString() && 
          !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to upload recordings for this session'
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
