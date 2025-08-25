import express from 'express';
import { protect } from '../middleware/auth';
import {
  getMyActivities,
  getActivityStats,
  getActivityTypes,
  exportActivities,
  deleteActivity
} from '../controllers/activityController';

const router = express.Router();

// All routes are protected
router.use(protect);

// Get user's activities (filtered by role)
router.get('/my-activities', getMyActivities);

// Get activity statistics
router.get('/stats', getActivityStats);

// Get activity types for filtering
router.get('/types', getActivityTypes);

// Export activities (admin only)
router.get('/export', exportActivities);

// Delete activity (admin only)
router.delete('/:id', deleteActivity);

export default router;
