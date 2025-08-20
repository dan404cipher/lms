import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { User } from '../models/User';
import { Enrollment } from '../models/Enrollment';
import { Course } from '../models/Course';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin)
export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

// @desc    Search users
// @route   GET /api/users/search
// @access  Private
export const searchUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ],
      _id: { $ne: req.user._id } // Exclude current user
    })
    .select('name email profilePic role')
    .limit(10);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id || req.user._id;
    
    const user = await User.findById(userId).select('-password');
    
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

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const userId = req.params.id || req.user._id;
    
    // Check if user is updating their own profile or is admin
    if (userId !== req.user._id.toString() && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deletion of super admin
    if (user.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete super admin user'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private (Admin)
export const updateUserRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { role, status } = req.body;

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent role changes on super admin
    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify super admin user'
      });
    }

    user.role = role;
    if (status) user.status = status;
    
    await user.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user enrollments
// @route   GET /api/users/enrollments
// @access  Private
export const getUserEnrollments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = { userId: req.user._id };

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    const enrollments = await Enrollment.find(query)
      .populate('courseId', 'title thumbnail instructorId')
      .populate('courseId.instructorId', 'name')
      .sort({ enrolledAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Enrollment.countDocuments(query);

    res.json({
      success: true,
      data: {
        enrollments,
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

// @desc    Get user courses (for instructors)
// @route   GET /api/users/courses
// @access  Private
export const getUserCourses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = { instructorId: req.user._id };

    // Filter by published status
    if (req.query.published !== undefined) {
      query.published = req.query.published === 'true';
    }

    const courses = await Course.find(query)
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

// @desc    Get user's enrolled courses (for learners)
// @route   GET /api/users/enrolled-courses
// @access  Private
export const getEnrolledCourses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get user's enrollments with course details
    const enrollments = await Enrollment.find({ userId: req.user._id })
      .populate({
        path: 'courseId',
        populate: [
          { path: 'instructorId', select: 'name profile.avatar' },
          { path: 'categoryId', select: 'name' }
        ]
      })
      .sort({ enrolledAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Enrollment.countDocuments({ userId: req.user._id });

    // Transform enrollments to course format with progress
    const courses = enrollments.map((enrollment: any) => ({
      _id: enrollment.courseId._id,
      title: enrollment.courseId.title,
      description: enrollment.courseId.description,
      instructor: {
        name: enrollment.courseId.instructorId?.name || 'Unknown Instructor'
      },
      category: {
        name: enrollment.courseId.categoryId?.name || 'Uncategorized'
      },
      courseCode: enrollment.courseId.courseCode,
      progress: enrollment.progress.completionPercentage,
      stats: enrollment.courseId.stats || {
        enrollments: 0,
        completions: 0,
        averageRating: 0,
        totalRatings: 0
      },
      published: enrollment.courseId.published,
      enrolledAt: enrollment.enrolledAt,
      status: enrollment.status
    }));

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

// @desc    Get user analytics
// @route   GET /api/users/analytics
// @access  Private
export const getUserAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user._id;

    // Get enrollment statistics
    const totalEnrollments = await Enrollment.countDocuments({ userId });
    const completedEnrollments = await Enrollment.countDocuments({ 
      userId, 
      status: 'completed' 
    });
    const activeEnrollments = await Enrollment.countDocuments({ 
      userId, 
      status: 'active' 
    });

    // Get course creation statistics (for instructors)
    let courseStats = null;
    if (['instructor', 'admin', 'super_admin'].includes(req.user.role)) {
      const totalCourses = await Course.countDocuments({ instructorId: userId });
      const publishedCourses = await Course.countDocuments({ 
        instructorId: userId, 
        published: true 
      });
      
      courseStats = {
        totalCourses,
        publishedCourses,
        unpublishedCourses: totalCourses - publishedCourses
      };
    }

    // Get recent activity
    const recentEnrollments = await Enrollment.find({ userId })
      .populate('courseId', 'title')
      .sort({ enrolledAt: -1 })
      .limit(5);

    const analytics = {
      enrollments: {
        total: totalEnrollments,
        completed: completedEnrollments,
        active: activeEnrollments,
        completionRate: totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0
      },
      courses: courseStats,
      recentActivity: {
        enrollments: recentEnrollments
      }
    };

    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    next(error);
  }
};
