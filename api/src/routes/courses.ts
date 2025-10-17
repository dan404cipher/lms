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
  uploadLessonContent,
  downloadCourseMaterial,
  viewCourseMaterial,
  downloadLessonContent,
  viewLessonContent,
  markLessonComplete,
  getCourseAssessments,
  getAssessmentDetails,
  submitAssessment,
  getAssessmentSubmissions,
  gradeAssessmentSubmission,
  downloadAssessmentAttachment,
  viewAssessmentAttachment,
  downloadSubmittedFile
} from '../controllers/courseController';
import { protect, authorize } from '../middleware/auth';
import { upload, uploadAssessment, handleMulterError } from '../middleware/upload';

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
  body('order').isInt({ min: 1 }).withMessage('Order must be a positive integer')
];

// Public routes
router.get('/', getCourses);
router.get('/:id', getCourse);
router.get('/:id/modules', getCourseModules);
router.get('/:courseId/modules/:moduleId/lessons', getModuleLessons);

// Protected routes - All authenticated users
router.use(protect);
router.get('/:id/detail', getCourseDetail);
router.get('/:courseId/materials/:materialId/download', downloadCourseMaterial);
router.get('/:courseId/materials/:materialId/view', viewCourseMaterial);
router.get('/:courseId/modules/:moduleId/lessons/:lessonId/content/:fileId/download', downloadLessonContent);
router.get('/:courseId/modules/:moduleId/lessons/:lessonId/content/:fileId/view', viewLessonContent);
router.post('/:courseId/lessons/:lessonId/complete', markLessonComplete);

// Assessment routes - All authenticated users (students, instructors, admins)
router.get('/:courseId/assessments', getCourseAssessments);
router.get('/:courseId/assessments/:assessmentId', getAssessmentDetails);

// Assessment submission routes - Students only
router.post('/:courseId/assessments/:assessmentId/submit', uploadAssessment.array('files', 10), handleMulterError, submitAssessment);

// Assessment attachment download routes - All authenticated users (students, instructors, admins)
router.get('/:courseId/assessments/:assessmentId/attachments/:attachmentId/download', downloadAssessmentAttachment);
router.get('/:courseId/assessments/:assessmentId/attachments/:attachmentId/view', viewAssessmentAttachment);
router.get('/:courseId/assessments/:assessmentId/attachments/:attachmentId', viewAssessmentAttachment); // Serve inline for images

// Protected routes - Instructor and Admin only
router.use(authorize('instructor', 'admin', 'super_admin'));

// Course CRUD
router.post('/', courseValidation, createCourse);
router.put('/:id', courseValidation, updateCourse);
router.delete('/:id', deleteCourse);
router.post('/:id/publish', publishCourse);

// File uploads
router.post('/:id/thumbnail', upload.single('thumbnail'), handleMulterError, uploadThumbnail);

// Module management
router.post('/:courseId/modules', moduleValidation, createModule);
router.put('/:courseId/modules/:moduleId', moduleValidation, updateModule);
router.delete('/:courseId/modules/:moduleId', deleteModule);

// Lesson management
router.post('/:courseId/modules/:moduleId/lessons', lessonValidation, createLesson);
router.put('/:courseId/modules/:moduleId/lessons/:lessonId', lessonValidation, updateLesson);
router.delete('/:courseId/modules/:moduleId/lessons/:lessonId', deleteLesson);
router.post('/:courseId/modules/:moduleId/lessons/:lessonId/content', upload.single('content'), handleMulterError, uploadLessonContent);

// Assessment grading routes - Instructors and Admins only
router.get('/:courseId/assessments/:assessmentId/submissions', getAssessmentSubmissions);
router.put('/:courseId/assessments/:assessmentId/submissions/:submissionId/grade', gradeAssessmentSubmission);
router.get('/:courseId/assessments/:assessmentId/submissions/:submissionId/files/:filename', downloadSubmittedFile);

export default router;
