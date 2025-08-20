import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { User } from '../models/User';
import { Course } from '../models/Course';
import { Category } from '../models/Category';
import { Enrollment } from '../models/Enrollment';
import { Session } from '../models/Session';
import { Material } from '../models/Material';
import { Assessment } from '../models/Assessment';
import { Module } from '../models/Module';
import { Lesson } from '../models/Lesson';
import { Announcement } from '../models/Announcement';
import fs from 'fs';
import path from 'path';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Get all users (Admin only)
// @route   GET /api/admin/users
// @access  Private (Admin)
export const getAllUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = {};

    // Filter by role
    if (req.query.role) {
      query.role = req.query.role;
    }

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Search by name or email
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
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

// @desc    Get user by ID (Admin only)
// @route   GET /api/admin/users/:userId
// @access  Private (Admin)
export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new user (Admin only)
// @route   POST /api/admin/users
// @access  Private (Admin)
export const createUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { name, email, password, role, status, credits, bio, location, phone, website } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const user = new User({
      name,
      email,
      password,
      role: role || 'learner',
      status: status || 'active',
      credits: credits || 0,
      profile: {
        bio: bio || '',
        location: location || '',
        phone: phone || '',
        website: website || ''
      }
    });

    await user.save();

    res.status(201).json({
      success: true,
      data: { user: { ...user.toObject(), password: undefined } }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user (Admin only)
// @route   PUT /api/admin/users/:userId
// @access  Private (Admin)
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user fields
    const { name, email, role, status, credits, bio, location, phone, website } = req.body;
    
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (status) user.status = status;
    if (credits !== undefined) user.credits = credits;
    
    // Update profile fields
    if (bio !== undefined || location !== undefined || phone !== undefined || website !== undefined) {
      user.profile = {
        ...user.profile,
        bio: bio !== undefined ? bio : user.profile?.bio || '',
        location: location !== undefined ? location : user.profile?.location || '',
        phone: phone !== undefined ? phone : user.profile?.phone || '',
        website: website !== undefined ? website : user.profile?.website || ''
      };
    }

    // Handle password update separately
    if (req.body.password) {
      user.password = req.body.password;
    }

    await user.save();

    res.json({
      success: true,
      data: { user: { ...user.toObject(), password: undefined } }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/admin/users/:userId
// @access  Private (Admin)
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.findByIdAndDelete(req.params.userId);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user status (Admin only)
// @route   PATCH /api/admin/users/:userId/toggle-status
// @access  Private (Admin)
export const toggleUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.status = user.status === 'active' ? 'inactive' : 'active';
    await user.save();

    res.json({
      success: true,
      data: { user: { ...user.toObject(), password: undefined } }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new course (Admin only)
// @route   POST /api/admin/courses
// @access  Private (Admin)
export const createCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      shortDescription,
      categoryId,
      instructorId,
      courseCode,
      priceCredits = 0,
      difficulty = 'beginner',
      duration = 0
    } = req.body;

    // Validate required fields
    if (!title || !description || !categoryId || !instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, category, and instructor are required'
      });
    }

    // Check if instructor exists and is actually an instructor
    const instructor = await User.findById(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      return res.status(400).json({
        success: false,
        message: 'Invalid instructor selected'
      });
    }

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category selected'
      });
    }

    // Create the course
    const course = new Course({
      title,
      description,
      shortDescription,
      categoryId,
      instructorId,
      courseCode,
      priceCredits,
      difficulty,
      duration,
      published: false, // Start as draft
      createdBy: req.user?._id
    });

    await course.save();

    // Populate the created course with instructor and category details
    const populatedCourse = await Course.findById(course._id)
      .populate('instructorId', 'name email')
      .populate('categoryId', 'name');

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: {
        course: populatedCourse
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all courses (Admin only)
// @route   GET /api/admin/courses
// @access  Private (Admin)
export const getAllCourses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = {};

    // Filter by published status
    if (req.query.status) {
      query.published = req.query.status === 'active';
    }

    // Filter by category
    if (req.query.category) {
      query.categoryId = req.query.category;
    }

    // Search by title
    if (req.query.search) {
      query.title = { $regex: req.query.search, $options: 'i' };
    }

    const courses = await Course.find(query)
      .populate('instructorId', 'name email')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Course.countDocuments(query);

    res.json({
      success: true,
      data: {
        courses,
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

// @desc    Get course by ID (Admin only)
// @route   GET /api/admin/courses/:courseId
// @access  Private (Admin)
export const getCourseById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.courseId;
    
    const course = await Course.findById(courseId)
      .populate('instructorId', 'name email')
      .populate('categoryId', 'name');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get all related data for comprehensive admin view
    const [
      modules,
      lessons,
      sessions,
      assessments,
      materials,
      announcements,
      enrollments
    ] = await Promise.all([
      Module.find({ courseId }).sort({ order: 1 }),
      Lesson.find({ 
        moduleId: { $in: await Module.find({ courseId }).distinct('_id') } 
      }).sort({ order: 1 }),
      Session.find({ courseId }).sort({ scheduledAt: 1 }),
      Assessment.find({ courseId }).sort({ dueDate: 1 }),
      Material.find({ courseId }).sort({ createdAt: -1 }),
      Announcement.find({ courseId }).sort({ createdAt: -1 }),
      Enrollment.find({ courseId }).populate('userId', 'name email role')
    ]);

    // Calculate enrollment statistics
    const totalEnrollments = enrollments.length;
    const completedEnrollments = enrollments.filter((e: any) => e.progress?.completionPercentage === 100).length;
    const averageProgress = enrollments.length > 0 
      ? enrollments.reduce((sum: number, e: any) => sum + (e.progress?.completionPercentage || 0), 0) / enrollments.length 
      : 0;

    // Create comprehensive course object with all data
    const courseDetail = {
      _id: course._id,
      title: course.title,
      description: course.description,
      shortDescription: course.shortDescription,
      instructorId: course.instructorId,
      categoryId: course.categoryId,
      courseCode: course.courseCode,
      published: course.published,
      thumbnail: course.thumbnail,
      priceCredits: course.priceCredits,
      difficulty: course.difficulty,
      duration: course.duration,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      stats: {
        enrollments: totalEnrollments,
        completions: completedEnrollments,
        averageRating: course.stats?.averageRating || 0,
        totalRatings: course.stats?.totalRatings || 0,
        averageProgress: Math.round(averageProgress)
      },
      // Course content
      modules: modules.map((module: any) => ({
        _id: module._id,
        title: module.title,
        description: module.description,
        order: module.order,
        lessons: lessons.filter((lesson: any) => lesson.moduleId.toString() === module._id.toString())
      })),
      // Additional data
      sessions,
      assessments,
      materials,
      announcements,
      // Enrollment data for batch management
      enrollments: enrollments.map((enrollment: any) => ({
        _id: enrollment._id,
        userId: enrollment.userId,
        progress: enrollment.progress,
        enrolledAt: enrollment.createdAt,
        status: enrollment.status
      })),
      // Mock data for UI compatibility
      syllabus: [
        {
          _id: 'syllabus-1',
          title: `${course.courseCode || 'Course'}_Syllabus.pdf`,
          type: 'pdf',
          size: '123 KB',
          viewed: true
        }
      ],
      prerequisites: [
        {
          _id: 'prereq-1',
          title: 'Course Introduction',
          type: 'video',
          duration: '15:30',
          completed: false
        }
      ]
    };

    res.json({
      success: true,
      data: { course: courseDetail }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update course status (Admin only)
// @route   PATCH /api/admin/courses/:courseId/status
// @access  Private (Admin)
export const updateCourseStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    course.published = req.body.status === 'active';
    await course.save();

    res.json({
      success: true,
      data: { course }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete course (Admin only)
// @route   DELETE /api/admin/courses/:courseId
// @access  Private (Admin)
export const deleteCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    await Course.findByIdAndDelete(req.params.courseId);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system statistics (Admin only)
// @route   GET /api/admin/stats
// @access  Private (Admin)
export const getSystemStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [
      totalUsers,
      totalCourses,
      totalEnrollments,
      activeSessions,
      totalMaterials,
      totalAssessments
    ] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Enrollment.countDocuments(),
      Session.countDocuments({ status: 'live' }),
      Material.countDocuments(),
      Assessment.countDocuments()
    ]);

    // Calculate storage usage (mock data for now)
    const totalStorage = 2.5; // GB

    // Calculate monthly growth (mock data for now)
    const monthlyGrowth = {
      users: 12,
      courses: 3,
      enrollments: 8
    };

    res.json({
      success: true,
      data: {
        totalUsers,
        totalCourses,
        totalEnrollments,
        activeSessions,
        totalStorage,
        systemHealth: 'healthy',
        monthlyGrowth
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system health (Admin only)
// @route   GET /api/admin/health
// @access  Private (Admin)
export const getSystemHealth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Mock system health check
    const health = {
      status: 'healthy',
      database: 'connected',
      api: 'operational',
      storage: 'available',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: { health }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get analytics (Admin only)
// @route   GET /api/admin/analytics
// @access  Private (Admin)
export const getAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const timeframe = req.query.timeframe || 'month';

    // Mock analytics data
    const analytics = {
      timeframe,
      userGrowth: [10, 15, 20, 25, 30, 35],
      courseGrowth: [2, 4, 6, 8, 10, 12],
      enrollmentGrowth: [50, 75, 100, 125, 150, 175],
      revenue: [1000, 1500, 2000, 2500, 3000, 3500]
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate report (Admin only)
// @route   POST /api/admin/reports
// @access  Private (Admin)
export const generateReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reportType, filters } = req.body;

    // Mock report generation
    const report = {
      id: `report_${Date.now()}`,
      type: reportType,
      generatedAt: new Date().toISOString(),
      data: {
        summary: 'Report summary',
        details: 'Report details'
      }
    };

    res.json({
      success: true,
      data: { report }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system settings (Admin only)
// @route   GET /api/admin/settings
// @access  Private (Admin)
export const getSystemSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Mock system settings
    const settings = {
      siteName: 'LMS Platform',
      maintenanceMode: false,
      registrationEnabled: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedFileTypes: ['pdf', 'doc', 'docx', 'mp4', 'jpg', 'png'],
      emailNotifications: true
    };

    res.json({
      success: true,
      data: { settings }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update system settings (Admin only)
// @route   PUT /api/admin/settings
// @access  Private (Admin)
export const updateSystemSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Mock settings update
    const settings = req.body;

    res.json({
      success: true,
      data: { settings },
      message: 'Settings updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Backup system (Admin only)
// @route   POST /api/admin/backup
// @access  Private (Admin)
export const backupSystem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Mock backup process
    const backupId = `backup_${Date.now()}`;
    const downloadUrl = `/api/admin/backup/${backupId}/download`;

    res.json({
      success: true,
      data: {
        backupId,
        downloadUrl,
        message: 'Backup created successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get backup history (Admin only)
// @route   GET /api/admin/backup/history
// @access  Private (Admin)
export const getBackupHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Mock backup history
    const backups = [
      {
        id: 'backup_1',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        size: '1.2GB',
        status: 'completed'
      },
      {
        id: 'backup_2',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        size: '1.1GB',
        status: 'completed'
      }
    ];

    res.json({
      success: true,
      data: { backups }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get activity logs (Admin only)
// @route   GET /api/admin/activity-logs
// @access  Private (Admin)
export const getActivityLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Mock activity logs
    const logs = [
      {
        id: '1',
        userId: 'user1',
        action: 'login',
        timestamp: new Date().toISOString(),
        details: 'User logged in'
      },
      {
        id: '2',
        userId: 'user2',
        action: 'course_created',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        details: 'New course created'
      }
    ];

    res.json({
      success: true,
      data: { logs }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk update users (Admin only)
// @route   POST /api/admin/users/bulk-update
// @access  Private (Admin)
export const bulkUpdateUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userIds, updates } = req.body;

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: updates }
    );

    res.json({
      success: true,
      data: {
        updated: result.modifiedCount,
        failed: userIds.length - result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete users (Admin only)
// @route   POST /api/admin/users/bulk-delete
// @access  Private (Admin)
export const bulkDeleteUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userIds } = req.body;

    const result = await User.deleteMany({ _id: { $in: userIds } });

    res.json({
      success: true,
      data: {
        deleted: result.deletedCount,
        failed: userIds.length - result.deletedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send system notification (Admin only)
// @route   POST /api/admin/notifications
// @access  Private (Admin)
export const sendSystemNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { title, message, type, targetUsers, targetRoles } = req.body;

    // Mock notification sending
    const notification = {
      id: `notification_${Date.now()}`,
      title,
      message,
      type,
      targetUsers,
      targetRoles,
      sentAt: new Date().toISOString(),
      status: 'sent'
    };

    res.json({
      success: true,
      data: { notification },
      message: 'Notification sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notification history (Admin only)
// @route   GET /api/admin/notifications/history
// @access  Private (Admin)
export const getNotificationHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Mock notification history
    const notifications = [
      {
        id: '1',
        title: 'System Maintenance',
        message: 'Scheduled maintenance on Sunday',
        type: 'info',
        sentAt: new Date(Date.now() - 86400000).toISOString(),
        status: 'sent'
      },
      {
        id: '2',
        title: 'New Feature Available',
        message: 'Check out our new course creation tools',
        type: 'success',
        sentAt: new Date(Date.now() - 172800000).toISOString(),
        status: 'sent'
      }
    ];

    res.json({
      success: true,
      data: { notifications }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add students to course (Admin only)
// @route   POST /api/admin/courses/:courseId/enrollments
// @access  Private (Admin)
export const addStudentsToCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const { userIds } = req.body;

    console.log('addStudentsToCourse - Received request:');
    console.log('  courseId:', courseId, 'type:', typeof courseId);
    console.log('  userIds:', userIds, 'type:', typeof userIds);
    console.log('  req.body:', req.body);

    // Validate courseId format
    if (!courseId || courseId === 'undefined' || courseId === 'null') {
      console.log('addStudentsToCourse - Invalid courseId:', courseId);
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      console.log('addStudentsToCourse - Invalid userIds:', userIds);
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of user IDs'
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if users exist
    const users = await User.find({ 
      _id: { $in: userIds }
    });

    if (users.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some users were not found'
      });
    }

    // Check for existing enrollments
    const existingEnrollments = await Enrollment.find({
      courseId,
      userId: { $in: userIds }
    });

    const existingUserIds = existingEnrollments.map(e => e.userId.toString());
    const newUserIds = userIds.filter(id => !existingUserIds.includes(id));

    if (newUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All users are already enrolled in this course'
      });
    }

    // Create new enrollments
    const newEnrollments = newUserIds.map(userId => {
      const user = users.find((u: any) => u._id.toString() === userId);
      return {
        userId,
        courseId,
        role: user?.role || 'learner',
        progress: user?.role === 'learner' ? {
          completedLessons: [],
          currentLesson: null,
          completionPercentage: 0,
          timeSpent: 0,
          lastAccessedAt: new Date()
        } : undefined,
        status: 'active',
        creditsPaid: course.priceCredits || 0
      };
    });

    await Enrollment.insertMany(newEnrollments);

    res.json({
      success: true,
      message: `${newEnrollments.length} user(s) added to the course successfully`,
      data: {
        enrolled: newEnrollments.length,
        alreadyEnrolled: existingUserIds.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove student from course (Admin only)
// @route   DELETE /api/admin/courses/:courseId/enrollments/:userId
// @access  Private (Admin)
export const removeStudentFromCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, userId } = req.params;

    // Validate courseId format
    if (!courseId || courseId === 'undefined' || courseId === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find and remove enrollment
    const enrollment = await Enrollment.findOneAndDelete({
      courseId,
      userId
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'User is not enrolled in this course'
      });
    }

    res.json({
      success: true,
      message: 'Student removed from course successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get enrolled students for a course (Admin only)
// @route   GET /api/admin/courses/:courseId/enrollments
// @access  Private (Admin)
export const getEnrolledStudents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;

    // Validate courseId format
    if (!courseId || courseId === 'undefined' || courseId === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get enrollments with user details
    const enrollments = await Enrollment.find({ courseId })
      .populate('userId', 'name email role')
      .populate('courseId', 'title');

    const enrolledStudents = enrollments.map(enrollment => ({
      _id: enrollment.userId._id,
      name: (enrollment.userId as any).name,
      email: (enrollment.userId as any).email,
      role: (enrollment.userId as any).role,
      progress: enrollment.progress,
      enrolledAt: enrollment.enrolledAt,
      status: enrollment.status
    }));

    res.json({
      success: true,
      data: {
        students: enrolledStudents
      }
    });
  } catch (error) {
    console.error('Error in getEnrolledStudents:', error);
    next(error);
  }
};

// @desc    Create module (Admin only)
// @route   POST /api/admin/courses/:courseId/modules
// @access  Private (Admin)
export const createModule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const { title, description, order } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const module = new Module({
      courseId,
      title,
      description,
      order: order || 1
    });

    await module.save();

    res.status(201).json({
      success: true,
      data: { module }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create lesson (Admin only)
// @route   POST /api/admin/courses/:courseId/modules/:moduleId/lessons
// @access  Private (Admin)
export const createLesson = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, moduleId } = req.params;
    const { title, description, order } = req.body;

    const module = await Module.findOne({ _id: moduleId, courseId });
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    const lesson = new Lesson({
      moduleId,
      title,
      description,
      order: order || 1,
      isPublished: false
    });

    await lesson.save();

    res.status(201).json({
      success: true,
      data: { lesson }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create assessment (Admin only)
// @route   POST /api/admin/courses/:courseId/assessments
// @access  Private (Admin)
export const createAssessment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const { title, description, type, dueDate, totalPoints } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const assessment = new Assessment({
      courseId,
      title,
      description,
      type,
      dueDate,
      totalPoints: totalPoints || 100
    });

    await assessment.save();

    res.status(201).json({
      success: true,
      data: { assessment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create announcement (Admin only)
// @route   POST /api/admin/courses/:courseId/announcements
// @access  Private (Admin)
export const createAnnouncement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const { title, content } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const announcement = new Announcement({
      courseId,
      title,
      content,
      isPublished: true
    });

    await announcement.save();

    res.status(201).json({
      success: true,
      data: { announcement }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload material (Admin only)
// @route   POST /api/admin/courses/:courseId/materials
// @access  Private (Admin)
export const uploadMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const material = new Material({
      courseId,
      title: req.file.originalname,
      description: `Uploaded material: ${req.file.originalname}`,
      type: req.file.mimetype,
      fileUrl: req.file.path,
      isPublished: true
    });

    await material.save();

    res.status(201).json({
      success: true,
      data: { material }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload lesson content (Admin only)
// @route   POST /api/admin/courses/:courseId/modules/:moduleId/lessons/:lessonId/content
// @access  Private (Admin)
export const uploadLessonContent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const lesson = await Lesson.findOne({ _id: lessonId, moduleId });
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Add file to lesson (this would need to be implemented based on your lesson model structure)
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    next(error);
  }
};
