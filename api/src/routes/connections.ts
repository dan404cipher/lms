import express from 'express';
import { protect } from '../middleware/auth';
import {
  getMyConnections,
  sendConnectionRequest,
  acceptConnection,
  rejectConnection
} from '../controllers/connectionController';

const router = express.Router();

// All routes are protected
router.use(protect);

// @route   GET /api/connections
router.get('/', getMyConnections);

// @route   POST /api/connections
router.post('/', sendConnectionRequest);

// @route   PUT /api/connections/:id/accept
router.put('/:id/accept', acceptConnection);

// @route   PUT /api/connections/:id/reject
router.put('/:id/reject', rejectConnection);

export default router;
