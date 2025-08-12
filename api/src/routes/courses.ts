import express from 'express';
import { body } from 'express-validator';
import { 
  getCourses, 
  getCourse, 
  getCourseDetail,
  createCourse, 
  updateCourse, 
  deleteCourse, 
  publishCourse,
  uploadThumbnail,
  getCourseModules,
  createModule,
  updateModule,
  deleteModule,
  getModuleLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  uploadLessonContent
} from '../controllers/courseController';
import { protect, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

// Validation middleware
const courseValidation = [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
  body('shortDescription').trim().isLength({ min: 10, max: 200 }).withMessage('Short description must be between 10 and 200 characters'),
  body('categoryId').isMongoId().withMessage('Valid category ID is required'),
  body('priceCredits').isInt({ min: 0 }).withMessage('Price credits must be a non-negative integer'),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid difficulty level'),
  body('language').optional().isLength({ min: 2, max: 5 }).withMessage('Language code must be 2-5 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array')
];

const moduleValidation = [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('order').isInt({ min: 1 }).withMessage('Order must be a positive integer'),
  body('objectives').optional().isArray().withMessage('Objectives must be an array')
];

const lessonValidation = [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('contentType').isIn(['video', 'pdf', 'scorm', 'html', 'quiz', 'assignment']).withMessage('Invalid content type'),
  body('order').isInt({ min: 1 }).withMessage('Order must be a positive integer'),
  body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be a non-negative integer')
];

// Public routes
router.get('/', getCourses);
router.get('/:id', getCourse);
router.get('/:id/modules', getCourseModules);
router.get('/:courseId/modules/:moduleId/lessons', getModuleLessons);

// Protected routes - All authenticated users
router.use(protect);
router.get('/:id/detail', getCourseDetail);

// Protected routes - Instructor and Admin only
router.use(protect);
router.use(authorize('instructor', 'admin', 'super_admin'));

// Course CRUD
router.post('/', courseValidation, createCourse);
router.put('/:id', courseValidation, updateCourse);
router.delete('/:id', deleteCourse);
router.post('/:id/publish', publishCourse);

// File uploads
router.post('/:id/thumbnail', upload.single('thumbnail'), uploadThumbnail);

// Module management
router.post('/:courseId/modules', moduleValidation, createModule);
router.put('/:courseId/modules/:moduleId', moduleValidation, updateModule);
router.delete('/:courseId/modules/:moduleId', deleteModule);

// Lesson management
router.post('/:courseId/modules/:moduleId/lessons', lessonValidation, createLesson);
router.put('/:courseId/modules/:moduleId/lessons/:lessonId', lessonValidation, updateLesson);
router.delete('/:courseId/modules/:moduleId/lessons/:lessonId', deleteLesson);
router.post('/:courseId/modules/:moduleId/lessons/:lessonId/content', upload.single('content'), uploadLessonContent);

export default router;
