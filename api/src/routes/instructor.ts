import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth';
import { upload, handleMulterError } from '../middleware/upload';
import {
  getMyCourses,
  getCourseDetail,
  createCourse,
  updateCourse,
  deleteCourse,
  getDashboardStats,
  getUpcomingSessions,
  getRecentAssessments,
  getRecentMaterials,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  startSession,
  endSession,
  getSessionParticipants,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  uploadMaterial,
  downloadMaterial,
  updateMaterial,
  deleteMaterial,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  uploadLessonContent
} from '../controllers/instructorController';

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
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('requirements').optional().isArray().withMessage('Requirements must be an array'),
  body('learningOutcomes').optional().isArray().withMessage('Learning outcomes must be an array'),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be at least 1 minute')
];

// Apply authentication and authorization middleware to all routes
router.use(protect);
router.use(authorize('instructor', 'admin', 'super_admin'));

// Dashboard
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/sessions', getUpcomingSessions);
router.get('/dashboard/assessments', getRecentAssessments);
router.get('/dashboard/materials', getRecentMaterials);

// Course Management
router.get('/courses', getMyCourses);
router.post('/courses', courseValidation, createCourse);
router.get('/courses/:courseId', getCourseDetail);
router.put('/courses/:courseId', courseValidation, updateCourse);
router.delete('/courses/:courseId', deleteCourse);

// Module Management
router.post('/courses/:courseId/modules', createModule);
router.put('/courses/:courseId/modules/:moduleId', updateModule);
router.delete('/courses/:courseId/modules/:moduleId', deleteModule);

// Lesson Management
router.post('/courses/:courseId/modules/:moduleId/lessons', createLesson);
router.put('/courses/:courseId/modules/:moduleId/lessons/:lessonId', updateLesson);
router.delete('/courses/:courseId/modules/:moduleId/lessons/:lessonId', deleteLesson);
router.post('/courses/:courseId/modules/:moduleId/lessons/:lessonId/content', upload.single('content'), handleMulterError, uploadLessonContent);

// Session Management
router.get('/sessions', getSessions);
router.post('/sessions', createSession);
router.put('/sessions/:sessionId', updateSession);
router.delete('/sessions/:sessionId', deleteSession);
router.post('/sessions/:sessionId/start', startSession);
router.post('/sessions/:sessionId/end', endSession);
router.get('/sessions/:sessionId/participants', getSessionParticipants);

// Course-specific Session Management
router.post('/courses/:courseId/sessions', createSession);
router.put('/courses/:courseId/sessions/:sessionId', updateSession);
router.delete('/courses/:courseId/sessions/:sessionId', deleteSession);

// Assessment Management
router.post('/courses/:courseId/assessments', createAssessment);
router.put('/courses/:courseId/assessments/:assessmentId', updateAssessment);
router.delete('/courses/:courseId/assessments/:assessmentId', deleteAssessment);

// Material Management
router.post('/courses/:courseId/materials', upload.single('material'), handleMulterError, uploadMaterial);
router.get('/courses/:courseId/materials/:materialId/download', downloadMaterial);
router.put('/courses/:courseId/materials/:materialId', updateMaterial);
router.delete('/courses/:courseId/materials/:materialId', deleteMaterial);

// Announcement Management
router.post('/courses/:courseId/announcements', createAnnouncement);
router.put('/courses/:courseId/announcements/:announcementId', updateAnnouncement);
router.delete('/courses/:courseId/announcements/:announcementId', deleteAnnouncement);

// Analytics
router.get('/courses/:courseId/analytics', getCourseDetail);
router.get('/courses/:courseId/students/progress', getCourseDetail);

export default router;
