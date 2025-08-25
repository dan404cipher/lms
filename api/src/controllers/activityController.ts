import { Request, Response, NextFunction } from 'express';
import { Activity } from '../models/Activity';
import { User } from '../models/User';
import { Course } from '../models/Course';
import { AuthRequest } from '../middleware/auth';

// @desc    Get user's activities (filtered by role)
// @route   GET /api/activities/my-activities
// @access  Private
export const getMyActivities = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 20, type, courseId, startDate, endDate } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Build query based on user role
    let query: any = {};

    if (userRole === 'learner') {
      // Learners can only see their own activities
      query.userId = userId;
    } else if (userRole === 'instructor') {
      // Instructors can see their own activities and activities in their courses
      const instructorCourses = await Course.find({ instructorId: userId }).select('_id');
      const courseIds = instructorCourses.map(course => course._id);
      
      query.$or = [
        { userId: userId },
        { 'metadata.courseId': { $in: courseIds } }
      ];
    } else if (['admin', 'super_admin'].includes(userRole)) {
      // Admins can see all activities
      // No additional query filters needed
    }

    // Apply filters
    if (type) {
      query.type = type;
    }

    if (courseId) {
      query['metadata.courseId'] = courseId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate as string);
      }
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    const total = await Activity.countDocuments(query);

    // Get activities with populated data
    const activities = await Activity.find(query)
      .populate('userId', 'name email role')
      .populate('metadata.courseId', 'title courseCode')
      .populate('metadata.sessionId', 'title')
      .populate('metadata.lessonId', 'title')
      .populate('metadata.assignmentId', 'title')
      .populate('metadata.quizId', 'title')
      .populate('metadata.materialId', 'title')
      .populate('metadata.discussionId', 'title')
      .populate('metadata.targetUserId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Format activities for frontend
    const formattedActivities = activities.map(activity => {
      const user = activity.userId as any;
      const course = activity.metadata?.courseId as any;
      const targetUser = activity.metadata?.targetUserId as any;

      return {
        _id: activity._id,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        course: course ? {
          id: course._id,
          title: course.title,
          courseCode: course.courseCode
        } : null,
        targetUser: targetUser ? {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email
        } : null,
        metadata: activity.metadata,
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
        formattedDate: (activity as any).formattedDate || activity.createdAt.toLocaleDateString('en-GB'),
        formattedTime: (activity as any).formattedTime || activity.createdAt.toLocaleTimeString('en-US'),
        timeAgo: (activity as any).timeAgo || 'Just now',
        createdAt: activity.createdAt
      };
    });

    res.json({
      success: true,
      data: {
        activities: formattedActivities,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get activity statistics
// @route   GET /api/activities/stats
// @access  Private
export const getActivityStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Build query based on user role
    let query: any = {};

    if (userRole === 'learner') {
      query.userId = userId;
    } else if (userRole === 'instructor') {
      const instructorCourses = await Course.find({ instructorId: userId }).select('_id');
      const courseIds = instructorCourses.map(course => course._id);
      
      query.$or = [
        { userId: userId },
        { 'metadata.courseId': { $in: courseIds } }
      ];
    }

    // Get activity counts by type
    const activityCounts = await Activity.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await Activity.countDocuments({
      ...query,
      createdAt: { $gte: sevenDaysAgo }
    });

    // Get today's activity
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayActivity = await Activity.countDocuments({
      ...query,
      createdAt: { $gte: today }
    });

    // Get most active users (for admins and instructors)
    let topUsers = [];
    if (['admin', 'super_admin', 'instructor'].includes(userRole)) {
      topUsers = await Activity.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: '$_id',
            name: '$user.name',
            email: '$user.email',
            count: 1
          }
        }
      ]);
    }

    res.json({
      success: true,
      data: {
        activityCounts,
        recentActivity,
        todayActivity,
        topUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get activity types for filtering
// @route   GET /api/activities/types
// @access  Private
export const getActivityTypes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const types = [
      { value: 'login', label: 'Login', icon: 'log-in' },
      { value: 'logout', label: 'Logout', icon: 'log-out' },
      { value: 'course_enrollment', label: 'Course Enrollment', icon: 'book-open' },
      { value: 'course_completion', label: 'Course Completion', icon: 'check-circle' },
      { value: 'session_join', label: 'Session Join', icon: 'video' },
      { value: 'session_leave', label: 'Session Leave', icon: 'video-off' },
      { value: 'assignment_submit', label: 'Assignment Submit', icon: 'file-text' },
      { value: 'quiz_attempt', label: 'Quiz Attempt', icon: 'help-circle' },
      { value: 'quiz_completion', label: 'Quiz Completion', icon: 'check-square' },
      { value: 'material_download', label: 'Material Download', icon: 'download' },
      { value: 'profile_update', label: 'Profile Update', icon: 'user' },
      { value: 'password_reset', label: 'Password Reset', icon: 'key' },
      { value: 'course_view', label: 'Course View', icon: 'eye' },
      { value: 'lesson_view', label: 'Lesson View', icon: 'book' },
      { value: 'discussion_post', label: 'Discussion Post', icon: 'message-square' },
      { value: 'discussion_reply', label: 'Discussion Reply', icon: 'message-circle' },
      { value: 'certificate_earned', label: 'Certificate Earned', icon: 'award' },
      { value: 'payment_made', label: 'Payment Made', icon: 'credit-card' },
      { value: 'admin_action', label: 'Admin Action', icon: 'shield' },
      { value: 'instructor_action', label: 'Instructor Action', icon: 'user-check' }
    ];

    res.json({
      success: true,
      data: { types }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export activities (for admins)
// @route   GET /api/activities/export
// @access  Private (Admin only)
export const exportActivities = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate, type, courseId } = req.query;

    // Check if user is admin
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
      return;
    }

    // Build query
    let query: any = {};

    if (type) {
      query.type = type;
    }

    if (courseId) {
      query['metadata.courseId'] = courseId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate as string);
      }
    }

    // Get activities with populated data
    const activities = await Activity.find(query)
      .populate('userId', 'name email role')
      .populate('metadata.courseId', 'title courseCode')
      .populate('metadata.targetUserId', 'name email')
      .sort({ createdAt: -1 });

    // Format for CSV export
    const csvData = activities.map(activity => {
      const user = activity.userId as any;
      const course = activity.metadata?.courseId as any;
      const targetUser = activity.metadata?.targetUserId as any;

      return {
        'Activity ID': activity._id,
        'Type': activity.type,
        'Title': activity.title,
        'Description': activity.description,
        'User Name': user?.name || 'N/A',
        'User Email': user?.email || 'N/A',
        'User Role': user?.role || 'N/A',
        'Course': course?.title || 'N/A',
        'Course Code': course?.courseCode || 'N/A',
        'Target User': targetUser?.name || 'N/A',
        'IP Address': activity.ipAddress || 'N/A',
        'User Agent': activity.userAgent || 'N/A',
        'Created At': activity.createdAt.toISOString(),
        'Date': (activity as any).formattedDate || activity.createdAt.toLocaleDateString('en-GB'),
        'Time': (activity as any).formattedTime || activity.createdAt.toLocaleTimeString('en-US')
      };
    });

    res.json({
      success: true,
      data: {
        activities: csvData,
        total: activities.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete activity (for admins)
// @route   DELETE /api/activities/:id
// @access  Private (Admin only)
export const deleteActivity = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if user is admin
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
      return;
    }

    const activity = await Activity.findByIdAndDelete(req.params.id);

    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
