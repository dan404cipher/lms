import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Course } from '../models/Course';
import { Category } from '../models/Category';
import { Enrollment } from '../models/Enrollment';
import { Session } from '../models/Session';
import { Material } from '../models/Material';
import { Assessment } from '../models/Assessment';
import SystemSettings from '../models/SystemSettings';
import { Module } from '../models/Module';
import { Lesson } from '../models/Lesson';
import { Announcement } from '../models/Announcement';
import { uploadFileLocally } from '../utils/fileUpload';
import ActivityLogger from '../utils/activityLogger';
import { getNotificationService } from '../config/socket';
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
    
    // Update profile fields individually to avoid schema validation issues
    if (bio !== undefined) {
      if (!user.profile) user.profile = {};
      user.profile.bio = bio;
    }
    if (location !== undefined) {
      if (!user.profile) user.profile = {};
      user.profile.location = location;
    }
    if (phone !== undefined) {
      if (!user.profile) user.profile = {};
      user.profile.phone = phone;
    }
    if (website !== undefined) {
      if (!user.profile) user.profile = {};
      user.profile.website = website;
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
      duration = 0,
      language = 'en',
      tags = [],
      requirements = [],
      learningOutcomes = [],
      thumbnail = 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800'
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
      language,
      tags,
      requirements,
      learningOutcomes,
      thumbnail,
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
      instructorId: (course.instructorId as any)?._id || course.instructorId,
      instructor: {
        name: (course.instructorId as any)?.name || 'Unknown Instructor',
        email: (course.instructorId as any)?.email || 'No email'
      },
      categoryId: (course.categoryId as any)?._id || course.categoryId,
      category: {
        name: (course.categoryId as any)?.name || 'Uncategorized'
      },
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

// @desc    Update course (Admin only)
// @route   PUT /api/admin/courses/:courseId
// @access  Private (Admin)
export const updateCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    // Update course fields
    const {
      title,
      description,
      shortDescription,
      courseCode,
      difficulty,
      duration,
      priceCredits,
      language,
      tags,
      requirements,
      learningOutcomes,
      instructorId
    } = req.body;

    if (title) course.title = title;
    if (description) course.description = description;
    if (shortDescription) course.shortDescription = shortDescription;
    if (courseCode) course.courseCode = courseCode;
    if (difficulty) course.difficulty = difficulty;
    if (duration) course.duration = duration;
    if (priceCredits !== undefined) course.priceCredits = priceCredits;
    if (language) course.language = language;
    if (tags) course.tags = tags;
    if (requirements) course.requirements = requirements;
    if (learningOutcomes) course.learningOutcomes = learningOutcomes;
    // Handle instructor change and enrollment
    if (instructorId && instructorId !== course.instructorId.toString()) {
      const oldInstructorId = course.instructorId;
      course.instructorId = instructorId;

      // Remove old instructor's enrollment if they exist
      if (oldInstructorId) {
        await Enrollment.findOneAndDelete({
          userId: oldInstructorId,
          courseId: course._id
        });
      }

      // Add new instructor's enrollment
      const existingEnrollment = await Enrollment.findOne({
        userId: instructorId,
        courseId: course._id
      });

      if (!existingEnrollment) {
        const newEnrollment = new Enrollment({
          userId: instructorId,
          courseId: course._id,
          status: 'active',
          creditsPaid: course.priceCredits || 0,
          progress: {
            completedLessons: [],
            currentLesson: null,
            completionPercentage: 0,
            timeSpent: 0,
            lastAccessedAt: new Date()
          }
        });
        await newEnrollment.save();
      }
    }

    await course.save();

    // Send notification to course participants
    try {
      const notificationService = getNotificationService();
      await notificationService.notifyCourseUpdate((course._id as any).toString(), {
        title: course.title,
        description: course.description,
        updatedFields: Object.keys(req.body)
      });
    } catch (error) {
      console.error('Error sending course update notification:', error);
    }

    // Populate instructor and category for response
    await course.populate('instructorId', 'name email');
    await course.populate('categoryId', 'name');

    res.json({
      success: true,
      data: { course }
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

    // Send notification to course participants
    try {
      const notificationService = getNotificationService();
      await notificationService.notifyCourseUpdate((course._id as any).toString(), {
        title: course.title,
        published: course.published,
        status: req.body.status
      });
    } catch (error) {
      console.error('Error sending course status update notification:', error);
    }

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
    let settings = await SystemSettings.findOne();
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = new SystemSettings({
        siteName: 'LMS Platform',
        maintenanceMode: false,
        registrationEnabled: true,
        maxFileSize: 0, // No limit
        allowedFileTypes: ['pdf', 'doc', 'docx', 'mp4', 'jpg', 'png'],
        emailNotifications: true,
        maxUsers: 1000,
        maxCourses: 500,
        sessionTimeout: 30,
        backupFrequency: 'daily'
      });
      await settings.save();
    }

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
    const updateData = req.body;
    
    // Find existing settings or create new ones
    let settings = await SystemSettings.findOne();
    
    if (settings) {
      // Update existing settings
      Object.assign(settings, updateData);
      await settings.save();
    } else {
      // Create new settings
      settings = new SystemSettings(updateData);
      await settings.save();
    }

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
    
    // Enrollments created successfully

    // Check if any of the new users are instructors and update course instructor if needed
    const newInstructors = newUserIds.filter(userId => {
      const user = users.find((u: any) => u._id.toString() === userId);
      return user?.role === 'instructor';
    });

    if (newInstructors.length > 0) {
      // If there are multiple instructors, use the first one
      const newInstructorId = newInstructors[0];
      
      // Update the course's instructorId
      await Course.findByIdAndUpdate(courseId, {
        instructorId: newInstructorId
      });
    }

    // Log enrollment activities for each user
    for (const enrollment of newEnrollments) {
      const user = users.find((u: any) => u._id.toString() === enrollment.userId);
      await ActivityLogger.logCourseEnrollment(
        enrollment.userId,
        courseId,
        course.title,
        req
      );
    }

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

    // If the removed user was an instructor and is the current course instructor, update the course
    if (user.role === 'instructor' && course.instructorId.toString() === userId) {
      // Find another instructor enrolled in this course
      const otherInstructorEnrollment = await Enrollment.findOne({
        courseId,
        userId: { $ne: userId },
        status: { $in: ['active', 'completed'] }
      }).populate('userId');

      if (otherInstructorEnrollment && (otherInstructorEnrollment.userId as any).role === 'instructor') {
        // Set the other instructor as the course instructor
        await Course.findByIdAndUpdate(courseId, {
          instructorId: otherInstructorEnrollment.userId._id
        });
        console.log(`removeStudentFromCourse - Updated course instructor to: ${otherInstructorEnrollment.userId._id}`);
      } else {
        // No other instructors, set instructorId to null or remove it
        await Course.findByIdAndUpdate(courseId, {
          $unset: { instructorId: 1 }
        });
        console.log(`removeStudentFromCourse - Removed instructor from course: ${courseId}`);
      }
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

// @desc    Publish/Unpublish assessment (Admin only)
// @route   PUT /api/admin/courses/:courseId/assessments/:assessmentId/publish
// @access  Private (Admin)
export const publishAssessment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, assessmentId } = req.params;
    const { isPublished } = req.body;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Find and update assessment
    const assessment = await Assessment.findOneAndUpdate(
      { _id: assessmentId, courseId },
      { isPublished },
      { new: true, runValidators: true }
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    res.json({
      success: true,
      message: `Assessment ${isPublished ? 'published' : 'unpublished'} successfully`,
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

// @desc    Download material (Admin only)
// @route   GET /api/admin/courses/:courseId/materials/:materialId/download
// @access  Private (Admin)
export const downloadMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { materialId } = req.params;

    // Find the material
    const material = await Material.findById(materialId).populate('courseId');
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Check if material has a file URL
    if (!material.fileUrl) {
      return res.status(404).json({
        success: false,
        message: 'Material file not available'
      });
    }

    // Increment download count
    await Material.findByIdAndUpdate(materialId, { $inc: { downloads: 1 } });

    // Log the download activity
    if (materialId) {
      await ActivityLogger.logMaterialDownload(
        req.user._id,
        materialId,
        material.title,
        material.courseId._id.toString(),
        material.fileSize || 0,
        req
      );
    }

    // If it's a local file, serve it directly
    if (material.fileUrl.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), material.fileUrl.replace('/', ''));
      
      if (fs.existsSync(filePath)) {
        // Set appropriate headers for file download
        res.setHeader('Content-Type', material.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${material.fileName || material.title}"`);
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        return;
      }
    }

    // If it's an external URL, redirect to it
    res.json({
      success: true,
      message: 'Material download initiated',
      data: {
        downloadUrl: material.fileUrl,
        fileName: material.fileName || material.title
      }
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

    // Upload file locally
    const uploadResult = await uploadFileLocally(req.file, 'materials');
    
    const material = new Material({
      courseId,
      instructorId: req.user._id, // Admin uploading the material
      title: req.file.originalname,
      description: `Uploaded material: ${req.file.originalname}`,
      type: 'document',
      fileUrl: uploadResult.Location,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
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
    console.log('uploadLessonContent - Starting upload process');
    const { courseId, moduleId, lessonId } = req.params;
    console.log('uploadLessonContent - Params:', { courseId, moduleId, lessonId });
    
    if (!req.file) {
      console.log('uploadLessonContent - No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('uploadLessonContent - File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const lesson = await Lesson.findOne({ _id: lessonId, moduleId });
    if (!lesson) {
      console.log('uploadLessonContent - Lesson not found');
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    console.log('uploadLessonContent - Lesson found, uploading file...');

    // Simple file upload without external utility
    const fileExtension = req.file.originalname.split('.').pop() || 'file';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const folderPath = path.join(__dirname, '../../uploads/lesson-content');
    
    console.log('uploadLessonContent - Folder path:', folderPath);
    
    // Create folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      console.log('uploadLessonContent - Creating folder:', folderPath);
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    const filePath = path.join(folderPath, fileName);
    console.log('uploadLessonContent - File path:', filePath);
    
    // Write file to disk
    console.log('uploadLessonContent - Writing file to disk...');
    fs.writeFileSync(filePath, req.file.buffer);
    console.log('uploadLessonContent - File written successfully');

    // Create file object for the lesson
    const fileObject = {
      _id: new mongoose.Types.ObjectId().toString(),
      name: req.file.originalname,
      url: `/uploads/lesson-content/${fileName}`,
      type: req.file.mimetype,
      size: req.file.size
    };

    console.log('uploadLessonContent - File object created:', fileObject);

    // Add file to lesson's files array
    console.log('uploadLessonContent - Adding file to lesson...');
    lesson.files.push(fileObject);
    await lesson.save();

    console.log('uploadLessonContent - Lesson saved successfully');

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: { file: fileObject }
    });
  } catch (error) {
    console.error('uploadLessonContent - Error:', error);
    console.error('uploadLessonContent - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('uploadLessonContent - Error message:', error instanceof Error ? error.message : 'No message');
    
    // Send a more detailed error response
    return res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// @desc    Download lesson content file (Admin)
// @route   GET /api/admin/courses/:courseId/modules/:moduleId/lessons/:lessonId/content/:fileId/download
// @access  Private (admin, super_admin)
export const downloadLessonContent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, moduleId, lessonId, fileId } = req.params;

    // Find the lesson
    const lesson = await Lesson.findOne({ _id: lessonId, moduleId });
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Find the specific file in the lesson
    const file = lesson.files?.find(f => f._id.toString() === fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found in this lesson'
      });
    }

    // Check if it's a local file
    if (file.url.startsWith('/uploads/')) {
      const path = require('path');
      const fs = require('fs');
      const filePath = path.join(process.cwd(), file.url.replace('/', ''));
      
      if (fs.existsSync(filePath)) {
        // Set appropriate headers for file download
        res.setHeader('Content-Type', file.type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        return;
      } else {
        return res.status(404).json({
          success: false,
          message: 'File not found on server'
        });
      }
    }

    // If it's an external URL, redirect to it
    res.json({
      success: true,
      message: 'File download initiated',
      data: {
        downloadUrl: file.url,
        fileName: file.name
      }
    });
  } catch (error) {
    next(error);
  }
};
