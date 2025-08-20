import express from 'express';
import { protect, authorize } from '../middleware/auth';
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
  createSession,
  updateSession,
  deleteSession,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  uploadMaterial,
  updateMaterial,
  deleteMaterial,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} from '../controllers/instructorController';

const router = express.Router();

// Apply authentication and authorization middleware to all routes
router.use(protect);
router.use(authorize('instructor'));

// Dashboard
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/sessions', getUpcomingSessions);
router.get('/dashboard/assessments', getRecentAssessments);
router.get('/dashboard/materials', getRecentMaterials);

// Course Management
router.get('/courses', getMyCourses);
router.post('/courses', createCourse);
router.get('/courses/:courseId', getCourseDetail);
router.put('/courses/:courseId', updateCourse);
router.delete('/courses/:courseId', deleteCourse);

// Module Management
router.post('/courses/:courseId/modules', createModule);
router.put('/courses/:courseId/modules/:moduleId', updateModule);
router.delete('/courses/:courseId/modules/:moduleId', deleteModule);

// Lesson Management
router.post('/courses/:courseId/modules/:moduleId/lessons', createLesson);
router.put('/courses/:courseId/modules/:moduleId/lessons/:lessonId', updateLesson);
router.delete('/courses/:courseId/modules/:moduleId/lessons/:lessonId', deleteLesson);

// Session Management
router.post('/courses/:courseId/sessions', createSession);
router.put('/courses/:courseId/sessions/:sessionId', updateSession);
router.delete('/courses/:courseId/sessions/:sessionId', deleteSession);

// Assessment Management
router.post('/courses/:courseId/assessments', createAssessment);
router.put('/courses/:courseId/assessments/:assessmentId', updateAssessment);
router.delete('/courses/:courseId/assessments/:assessmentId', deleteAssessment);

// Material Management
router.post('/courses/:courseId/materials', uploadMaterial);
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
