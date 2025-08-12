import express from 'express';
import { body } from 'express-validator';
import { 
  enrollInCourse, 
  getEnrollments, 
  getEnrollment, 
  updateEnrollment, 
  cancelEnrollment,
  updateProgress,
  markLessonComplete,
  getCourseProgress,
  getMyCourses
} from '../controllers/enrollmentController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Validation middleware
const enrollmentValidation = [
  body('courseId').isMongoId().withMessage('Valid course ID is required')
];

const progressValidation = [
  body('lessonId').isMongoId().withMessage('Valid lesson ID is required'),
  body('timeSpent').optional().isInt({ min: 0 }).withMessage('Time spent must be a non-negative integer')
];

// Learner routes
router.post('/', enrollmentValidation, enrollInCourse);
router.get('/', getEnrollments);
router.get('/my-courses', getMyCourses);
router.get('/:id', getEnrollment);
router.put('/:id/progress', progressValidation, updateProgress);
router.post('/:id/lessons/:lessonId/complete', markLessonComplete);
router.get('/course/:courseId/progress', getCourseProgress);

// Admin/Instructor routes
router.use(authorize('instructor', 'admin', 'super_admin'));
router.put('/:id', updateEnrollment);
router.delete('/:id', cancelEnrollment);

export default router;
