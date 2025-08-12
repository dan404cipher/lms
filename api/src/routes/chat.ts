import express from 'express';
import { body } from 'express-validator';
import { 
  getChatMessages, 
  sendMessage, 
  getCourseChat, 
  getDirectMessages,
  markMessagesAsRead,
  deleteMessage,
  getChatUsers,
  getGlobalChatMessages,
  sendGlobalMessage,
  sendDirectMessageByEmail,
  getDirectMessagesWithUser
} from '../controllers/chatController';
import {
  sendMessage as sendDirectMessage,
  getChat,
  editMessage,
  deleteMessage as deleteDirectMessage,
  markMessageAsRead,
  markMessagesAsRead as markAllMessagesAsRead,
  getUnreadMessageCount
} from '../controllers/messageController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Validation middleware
const messageValidation = [
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
  body('type').optional().isIn(['text', 'image', 'file']).withMessage('Invalid message type')
];

// Chat routes
router.get('/course/:courseId', getCourseChat);
router.get('/course/:courseId/messages', getChatMessages);
router.post('/course/:courseId/messages', messageValidation, sendMessage);
router.get('/direct/:userId', getDirectMessages);
router.put('/messages/read', markMessagesAsRead);

// Global chat routes (cross-course messaging)
router.get('/users', getChatUsers);
router.get('/global/messages', getGlobalChatMessages);
router.post('/global/messages', messageValidation, sendGlobalMessage);

// Direct messaging routes
router.post('/direct/email', messageValidation, sendDirectMessageByEmail);
router.get('/direct/user/:userId', getDirectMessagesWithUser);

// New direct messaging routes
router.post('/send', sendDirectMessage);
router.get('/unread-count', getUnreadMessageCount);
router.get('/:userId', getChat);
router.put('/:userId/read', markAllMessagesAsRead);
router.put('/messages/:messageId', editMessage);
router.delete('/messages/:messageId', deleteDirectMessage);
router.patch('/messages/:messageId/read', markMessageAsRead);

// Admin/Instructor routes (for moderation)
router.use(authorize('instructor', 'admin', 'super_admin'));
router.delete('/messages/:messageId', deleteMessage);

export default router;
