import express from 'express';
import { body } from 'express-validator';
import { 
  getUsers, 
  getUser, 
  updateUser, 
  deleteUser, 
  updateUserRole,
  getUserEnrollments,
  getUserCourses,
  getEnrolledCourses,
  getUserAnalytics,
  searchUsers,
  getUserSettings,
  updateUserSettings
} from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Validation middleware
const createUserValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['learner', 'instructor']).withMessage('Invalid role')
];

const updateUserValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('profile.bio').optional().trim().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
  body('profile.phone').optional().trim().isMobilePhone('any').withMessage('Invalid phone number'),
  body('profile.website').optional().trim().custom((value) => {
    if (value && value !== '') {
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(value)) {
        throw new Error('Invalid website URL');
      }
    }
    return true;
  }).withMessage('Invalid website URL'),
  body('preferences.language').optional().isLength({ min: 2, max: 5 }).withMessage('Language code must be 2-5 characters'),
  body('preferences.timezone').optional().isLength({ min: 3, max: 50 }).withMessage('Timezone must be between 3 and 50 characters')
];

const updateRoleValidation = [
  body('role').isIn(['learner', 'instructor', 'admin']).withMessage('Invalid role'),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status')
];

// Public user routes (authenticated users can access their own data)
router.get('/profile', getUser);
router.put('/profile', updateUserValidation, updateUser);
router.get('/enrollments', getUserEnrollments);
router.get('/courses', getUserCourses);
router.get('/enrolled-courses', getEnrolledCourses);
router.get('/analytics', getUserAnalytics);
router.get('/search', searchUsers);
router.get('/settings', getUserSettings);
router.put('/settings', updateUserSettings);

// Admin only routes
router.use(authorize('admin', 'super_admin'));

router.get('/', getUsers);
router.get('/:id', getUser);
router.put('/:id', updateUserValidation, updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/role', updateRoleValidation, updateUserRole);

export default router;
