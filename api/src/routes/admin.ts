import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getAllCourses,
  createCourse,
  getCourseById,
  updateCourseStatus,
  deleteCourse,
  addStudentsToCourse,
  removeStudentFromCourse,
  getEnrolledStudents,
  createModule,
  createLesson,
  createAssessment,
  createAnnouncement,
  uploadMaterial,
  uploadLessonContent,
  getSystemStats,
  getSystemHealth,
  getAnalytics,
  generateReport,
  getSystemSettings,
  updateSystemSettings,
  backupSystem,
  getBackupHistory,
  getActivityLogs,
  bulkUpdateUsers,
  bulkDeleteUsers,
  sendSystemNotification,
  getNotificationHistory
} from '../controllers/adminController';

const router = express.Router();

// All routes require authentication and admin authorization
router.use(protect);
router.use(authorize('admin', 'super_admin'));

// Validation middleware
const userValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['learner', 'instructor', 'admin']).withMessage('Invalid role')
];

const updateUserValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('role').optional().isIn(['learner', 'instructor', 'admin']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
];

const courseStatusValidation = [
  body('status').isIn(['active', 'inactive']).withMessage('Invalid status')
];

const courseValidation = [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('shortDescription').optional().trim().isLength({ min: 5, max: 200 }).withMessage('Short description must be between 5 and 200 characters'),
  body('categoryId').isMongoId().withMessage('Valid category ID is required'),
  body('instructorId').isMongoId().withMessage('Valid instructor ID is required'),
  body('courseCode').optional().trim().isLength({ min: 2, max: 20 }).withMessage('Course code must be between 2 and 20 characters'),
  body('priceCredits').optional().isInt({ min: 0 }).withMessage('Price credits must be a non-negative integer'),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Difficulty must be beginner, intermediate, or advanced'),
  body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be a non-negative integer')
];

const notificationValidation = [
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
  body('type').isIn(['info', 'warning', 'error', 'success']).withMessage('Invalid notification type'),
  body('targetUsers').optional().isArray().withMessage('targetUsers must be an array'),
  body('targetRoles').optional().isArray().withMessage('targetRoles must be an array')
];

// User Management Routes
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserById);
router.post('/users', userValidation, createUser);
router.put('/users/:userId', updateUserValidation, updateUser);
router.delete('/users/:userId', deleteUser);
router.patch('/users/:userId/toggle-status', toggleUserStatus);

// Course Management Routes
router.get('/courses', getAllCourses);
router.post('/courses', courseValidation, createCourse);
router.get('/courses/:courseId', getCourseById);
router.patch('/courses/:courseId/status', courseStatusValidation, updateCourseStatus);
router.delete('/courses/:courseId', deleteCourse);

// Enrollment Management Routes
router.get('/courses/:courseId/enrollments', getEnrolledStudents);
router.post('/courses/:courseId/enrollments', addStudentsToCourse);
router.delete('/courses/:courseId/enrollments/:userId', removeStudentFromCourse);

// Course Content Management Routes (same as instructor routes)
router.post('/courses/:courseId/modules', createModule);
router.post('/courses/:courseId/modules/:moduleId/lessons', createLesson);
router.post('/courses/:courseId/assessments', createAssessment);
router.post('/courses/:courseId/announcements', createAnnouncement);
router.post('/courses/:courseId/materials', upload.single('material'), uploadMaterial);
router.post('/courses/:courseId/modules/:moduleId/lessons/:lessonId/content', upload.single('content'), uploadLessonContent);

// System Statistics Routes
router.get('/stats', getSystemStats);
router.get('/health', getSystemHealth);
router.get('/analytics', getAnalytics);
router.post('/reports', generateReport);

// System Management Routes
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);
router.post('/backup', backupSystem);
router.get('/backup/history', getBackupHistory);

// Activity and Logs Routes
router.get('/activity-logs', getActivityLogs);

// Bulk Operations Routes
router.post('/users/bulk-update', bulkUpdateUsers);
router.post('/users/bulk-delete', bulkDeleteUsers);

// Notification Routes
router.post('/notifications', notificationValidation, sendSystemNotification);
router.get('/notifications/history', getNotificationHistory);

export default router;
