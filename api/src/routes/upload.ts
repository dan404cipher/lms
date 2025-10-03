import express from 'express';
import { getUploadUrl } from '../controllers/uploadController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/upload/url
router.get('/url', getUploadUrl);

export default router;
