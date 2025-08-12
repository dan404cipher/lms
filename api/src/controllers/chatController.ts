import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Chat } from '../models/Chat';
import { Course } from '../models/Course';
import { Enrollment } from '../models/Enrollment';
import { User } from '../models/User';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Get course chat
// @route   GET /api/chat/course/:courseId
// @access  Private
export const getCourseChat = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;

    // Check if user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
      status: { $in: ['active', 'completed'] }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to access the chat'
      });
    }

    // Check if course allows chat
    const course = await Course.findById(courseId);
    if (!course?.settings.allowChat) {
      return res.status(403).json({
        success: false,
        message: 'Chat is disabled for this course'
      });
    }

    res.json({
      success: true,
      data: { 
        courseId,
        chatEnabled: true,
        courseTitle: course.title
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get chat messages
// @route   GET /api/chat/course/:courseId/messages
// @access  Private
export const getChatMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Check if user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
      status: { $in: ['active', 'completed'] }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to view messages'
      });
    }

    const messages = await Chat.find({ courseId })
      .populate('fromUserId', 'name profile.avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Chat.countDocuments({ courseId });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Show oldest first
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send message
// @route   POST /api/chat/course/:courseId/messages
// @access  Private
export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { courseId } = req.params;
    const { message, type = 'text' } = req.body;

    // Check if user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
      status: { $in: ['active', 'completed'] }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to send messages'
      });
    }

    // Check if course allows chat
    const course = await Course.findById(courseId);
    if (!course?.settings.allowChat) {
      return res.status(403).json({
        success: false,
        message: 'Chat is disabled for this course'
      });
    }

    const chatMessage = await Chat.create({
      courseId,
      fromUserId: req.user._id,
      message,
      type
    });

    const populatedMessage = await Chat.findById(chatMessage._id)
      .populate('fromUserId', 'name profile.avatar');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: populatedMessage }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get direct messages
// @route   GET /api/chat/direct/:userId
// @access  Private
export const getDirectMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Get messages between the two users
    const messages = await Chat.find({
      courseId: null,
      $or: [
        { fromUserId: req.user._id, toUserId: userId },
        { fromUserId: userId, toUserId: req.user._id }
      ]
    })
      .populate('fromUserId', 'name profile.avatar')
      .populate('toUserId', 'name profile.avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Chat.countDocuments({
      courseId: null,
      $or: [
        { fromUserId: req.user._id, toUserId: userId },
        { fromUserId: userId, toUserId: req.user._id }
      ]
    });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chat/messages/read
// @access  Private
export const markMessagesAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds)) {
      return res.status(400).json({
        success: false,
        message: 'Message IDs must be an array'
      });
    }

    // Mark messages as read
    await Chat.updateMany(
      {
        _id: { $in: messageIds },
        toUserId: req.user._id
      },
      {
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete message (Admin/Instructor only)
// @route   DELETE /api/chat/messages/:messageId
// @access  Private (Instructor, Admin)
export const deleteMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const message = await Chat.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the message author, course instructor, or admin
    let canDelete = false;

    if (message.fromUserId.toString() === req.user._id.toString()) {
      canDelete = true;
    } else if (['admin', 'super_admin'].includes(req.user.role)) {
      canDelete = true;
    } else if (message.courseId) {
      const course = await Course.findById(message.courseId);
      if (course && course.instructorId.toString() === req.user._id.toString()) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }

    await Chat.findByIdAndDelete(req.params.messageId);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users from courses user is enrolled in
// @route   GET /api/chat/users
// @access  Private
export const getChatUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get all courses the user is enrolled in
    const enrollments = await Enrollment.find({
      userId: req.user._id,
      status: { $in: ['active', 'completed'] }
    }).populate('courseId', 'title instructorId');

    if (enrollments.length === 0) {
      return res.json({
        success: true,
        data: {
          users: [],
          courses: []
        }
      });
    }

    const courseIds = enrollments.map(enrollment => enrollment.courseId._id);
    
    // Get all users enrolled in these courses (including instructors)
    const courseUsers = await Enrollment.find({
      courseId: { $in: courseIds },
      status: { $in: ['active', 'completed'] }
    }).populate('userId', 'name email role profile.avatar');

    // Get course instructors
    const courses = await Course.find({ _id: { $in: courseIds } })
      .populate('instructorId', 'name email role profile.avatar');

    // Create a map of unique users
    const userMap = new Map();
    
    // Add enrolled users
    courseUsers.forEach(enrollment => {
      if (enrollment.userId._id.toString() !== req.user._id.toString()) {
        const user = enrollment.userId as any;
        userMap.set(user._id.toString(), {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile: user.profile,
          courseId: enrollment.courseId,
          courseTitle: (enrollments.find(e => e.courseId._id.toString() === enrollment.courseId.toString())?.courseId as any)?.title
        });
      }
    });

    // Add course instructors
    courses.forEach(course => {
      if (course.instructorId._id.toString() !== req.user._id.toString()) {
        const instructor = course.instructorId as any;
        userMap.set(instructor._id.toString(), {
          _id: instructor._id,
          name: instructor.name,
          email: instructor.email,
          role: instructor.role,
          profile: instructor.profile,
          courseId: course._id,
          courseTitle: course.title,
          isInstructor: true
        });
      }
    });

    const users = Array.from(userMap.values());

    res.json({
      success: true,
      data: {
        users,
        courses: courses.map(course => ({
          _id: course._id,
          title: course.title,
          instructorId: course.instructorId._id
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get global chat messages (across all enrolled courses)
// @route   GET /api/chat/global/messages
// @access  Private
export const getGlobalChatMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Get all courses the user is enrolled in
    const enrollments = await Enrollment.find({
      userId: req.user._id,
      status: { $in: ['active', 'completed'] }
    });

    if (enrollments.length === 0) {
      return res.json({
        success: true,
        data: {
          messages: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0
          }
        }
      });
    }

    const courseIds = enrollments.map(enrollment => enrollment.courseId);

    // Get messages from all enrolled courses
    const messages = await Chat.find({ 
      courseId: { $in: courseIds },
      $or: [
        { fromUserId: req.user._id },
        { toUserId: req.user._id },
        { toUserId: { $exists: false } } // Course-wide messages
      ]
    })
      .populate('fromUserId', 'name profile.avatar')
      .populate('toUserId', 'name profile.avatar')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Chat.countDocuments({ 
      courseId: { $in: courseIds },
      $or: [
        { fromUserId: req.user._id },
        { toUserId: req.user._id },
        { toUserId: { $exists: false } }
      ]
    });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send global message (to all users in enrolled courses)
// @route   POST /api/chat/global/messages
// @access  Private
export const sendGlobalMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { message, type = 'text', courseId, toUserId } = req.body;

    // If courseId is provided, verify user is enrolled
    if (courseId) {
      const enrollment = await Enrollment.findOne({
        userId: req.user._id,
        courseId,
        status: { $in: ['active', 'completed'] }
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to send messages'
        });
      }
    }

    // If toUserId is provided, verify the target user is in one of your courses
    if (toUserId) {
      const userEnrollments = await Enrollment.find({
        userId: req.user._id,
        status: { $in: ['active', 'completed'] }
      });

      const targetUserEnrollments = await Enrollment.find({
        userId: toUserId,
        status: { $in: ['active', 'completed'] }
      });

      const userCourseIds = userEnrollments.map(e => e.courseId.toString());
      const targetUserCourseIds = targetUserEnrollments.map(e => e.courseId.toString());

      const commonCourses = userCourseIds.filter(id => targetUserCourseIds.includes(id));

      if (commonCourses.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only message users from courses you are enrolled in'
        });
      }
    }

    const chatMessage = await Chat.create({
      courseId: courseId || null,
      fromUserId: req.user._id,
      toUserId: toUserId || null,
      message,
      type
    });

    const populatedMessage = await Chat.findById(chatMessage._id)
      .populate('fromUserId', 'name profile.avatar')
      .populate('toUserId', 'name profile.avatar')
      .populate('courseId', 'title');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: populatedMessage }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send direct message to user by email
// @route   POST /api/chat/direct/email
// @access  Private
export const sendDirectMessageByEmail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { message, type = 'text', recipientEmail } = req.body;

    // Find the recipient user by email
    const recipientUser = await User.findOne({ email: recipientEmail });
    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found with that email address'
      });
    }

    // Don't allow messaging yourself
    if ((recipientUser as any)._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot message yourself'
      });
    }

    const chatMessage = await Chat.create({
      courseId: null, // Direct message, not course-specific
      fromUserId: req.user._id,
      toUserId: (recipientUser as any)._id,
      message,
      type
    });

    const populatedMessage = await Chat.findById(chatMessage._id)
      .populate('fromUserId', 'name profile.avatar')
      .populate('toUserId', 'name profile.avatar');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: populatedMessage }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get direct messages with a specific user
// @route   GET /api/chat/direct/user/:userId
// @access  Private
export const getDirectMessagesWithUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Get messages between the two users
    const messages = await Chat.find({
      courseId: null,
      $or: [
        { fromUserId: req.user._id, toUserId: userId },
        { fromUserId: userId, toUserId: req.user._id }
      ]
    })
      .populate('fromUserId', 'name profile.avatar')
      .populate('toUserId', 'name profile.avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Chat.countDocuments({
      courseId: null,
      $or: [
        { fromUserId: req.user._id, toUserId: userId },
        { fromUserId: userId, toUserId: req.user._id }
      ]
    });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
