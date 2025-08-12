import express from 'express';
import { body } from 'express-validator';
import { 
  createSession, 
  getSessions, 
  getSession, 
  updateSession, 
  deleteSession,
  joinSession,
  getSessionAttendance,
  markAttendance,
  getMyActivities
} from '../controllers/sessionController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Validation middleware
const sessionValidation = [
  body('courseId').isMongoId().withMessage('Valid course ID is required'),
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('scheduledAt').isISO8601().withMessage('Valid scheduled date is required'),
  body('duration').isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes')
];

// Public routes (authenticated users)
router.get('/', getSessions);
router.get('/my-activities', getMyActivities);
router.get('/:id', getSession);
router.post('/:id/join', joinSession);

// Instructor/Admin routes
router.use(authorize('instructor', 'admin', 'super_admin'));

router.post('/', sessionValidation, createSession);
router.put('/:id', sessionValidation, updateSession);
router.delete('/:id', deleteSession);
router.get('/:id/attendance', getSessionAttendance);
router.post('/:id/attendance', markAttendance);

export default router;
