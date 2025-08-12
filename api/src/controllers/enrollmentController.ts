import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Enrollment } from '../models/Enrollment';
import { Course } from '../models/Course';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { sendEmail } from '../utils/email';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Enroll in course
// @route   POST /api/enrollments
// @access  Private
export const enrollInCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { courseId } = req.body;
    const userId = req.user._id;

    // Check if course exists and is published
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (!course.published) {
      return res.status(400).json({
        success: false,
        message: 'Course is not published'
      });
    }

    // Check if user is already enrolled
    const existingEnrollment = await Enrollment.findOne({ userId, courseId });
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    // Check if user has enough credits
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.credits < course.priceCredits) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient credits to enroll in this course'
      });
    }

    // Deduct credits and create enrollment
    user.credits -= course.priceCredits;
    await user.save();

    const enrollment = await Enrollment.create({
      userId,
      courseId,
      creditsPaid: course.priceCredits,
      status: 'active'
    });

    // Send enrollment confirmation email
    try {
      await sendEmail({
        to: user.email,
        subject: `Enrolled in ${course.title}`,
        template: 'courseEnrollment',
        data: {
          studentName: user.name,
          courseTitle: course.title,
          instructorName: course.instructorId.toString(), // You might want to populate this
          creditsUsed: course.priceCredits,
          enrollmentDate: new Date().toLocaleDateString(),
          courseUrl: `${process.env.FRONTEND_URL}/courses/${courseId}`
        }
      });
    } catch (emailError) {
      console.error('Failed to send enrollment email:', emailError);
    }

    // Update course enrollment count
    course.stats.enrollments += 1;
    await course.save();

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in course',
      data: { enrollment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user enrollments
// @route   GET /api/enrollments
// @access  Private
export const getEnrollments = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

// @desc    Get single enrollment
// @route   GET /api/enrollments/:id
// @access  Private
export const getEnrollment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('courseId')
      .populate('userId', 'name email');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if user owns this enrollment or is admin/instructor
    if (enrollment.userId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this enrollment'
      });
    }

    res.json({
      success: true,
      data: { enrollment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update enrollment
// @route   PUT /api/enrollments/:id
// @access  Private (Instructor, Admin)
export const updateEnrollment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check authorization
    const course = await Course.findById(enrollment.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this enrollment'
      });
    }

    const updatedEnrollment = await Enrollment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Enrollment updated successfully',
      data: { enrollment: updatedEnrollment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel enrollment
// @route   DELETE /api/enrollments/:id
// @access  Private (Instructor, Admin)
export const cancelEnrollment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check authorization
    const course = await Course.findById(enrollment.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this enrollment'
      });
    }

    enrollment.status = 'cancelled';
    await enrollment.save();

    res.json({
      success: true,
      message: 'Enrollment cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update progress
// @route   PUT /api/enrollments/:id/progress
// @access  Private
export const updateProgress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { lessonId, timeSpent } = req.body;

    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if user owns this enrollment
    if (enrollment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this enrollment'
      });
    }

    // Update progress
    enrollment.progress.currentLesson = lessonId;
    enrollment.progress.timeSpent += timeSpent || 0;
    enrollment.progress.lastAccessedAt = new Date();

    await enrollment.save();

    res.json({
      success: true,
      message: 'Progress updated successfully',
      data: { enrollment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark lesson as complete
// @route   POST /api/enrollments/:id/lessons/:lessonId/complete
// @access  Private
export const markLessonComplete = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { lessonId } = req.params;

    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if user owns this enrollment
    if (enrollment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this enrollment'
      });
    }

    // Add lesson to completed lessons if not already there
    if (lessonId && !enrollment.progress.completedLessons.includes(lessonId as any)) {
      enrollment.progress.completedLessons.push(lessonId as any);
    }

    // Update completion percentage (this would need to be calculated based on total lessons)
    // For now, we'll use a simple calculation
    enrollment.progress.completionPercentage = Math.min(
      (enrollment.progress.completedLessons.length / 10) * 100, // Assuming 10 lessons per course
      100
    );

    await enrollment.save();

    res.json({
      success: true,
      message: 'Lesson marked as complete',
      data: { enrollment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get course progress
// @route   GET /api/enrollments/course/:courseId/progress
// @access  Private
export const getCourseProgress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: req.params.courseId
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    res.json({
      success: true,
      data: { progress: enrollment.progress }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's enrolled courses with progress
// @route   GET /api/enrollments/my-courses
// @access  Private
export const getMyCourses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const enrollments = await Enrollment.find({ 
      userId: req.user._id,
      status: 'active'
    })
    .populate({
      path: 'courseId',
      populate: {
        path: 'instructorId',
        select: 'name'
      }
    })
    .populate({
      path: 'courseId',
      populate: {
        path: 'categoryId',
        select: 'name'
      }
    })
    .sort({ enrolledAt: -1 });

    const courses = enrollments.map(enrollment => {
      const course = enrollment.courseId as any;
      return {
        _id: course._id,
        title: course.title,
        description: course.description,
        instructor: {
          name: course.instructorId?.name || 'Unknown Instructor'
        },
        category: {
          name: course.categoryId?.name || 'Uncategorized'
        },
        courseCode: course.courseCode,
        progress: enrollment.progress.completionPercentage,
        icon: getCourseIcon(course.title),
        iconColor: getCourseIconColor(course.title)
      };
    });

    res.json({
      success: true,
      data: { courses }
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions for course icons and colors
const getCourseIcon = (title: string): string => {
  if (title.includes('Program Overview')) return '📊';
  if (title.includes('Artificial Intelligence')) return '🤖';
  if (title.includes('Statistics')) return '📈';
  if (title.includes('Machine Learning')) return '🧠';
  if (title.includes('Research')) return '📚';
  if (title.includes('Pre Work')) return '⚙️';
  return '📖';
};

const getCourseIconColor = (title: string): string => {
  if (title.includes('Program Overview')) return 'bg-yellow-500';
  if (title.includes('Artificial Intelligence')) return 'bg-green-500';
  if (title.includes('Statistics')) return 'bg-green-500';
  if (title.includes('Machine Learning')) return 'bg-orange-500';
  if (title.includes('Research')) return 'bg-blue-500';
  if (title.includes('Pre Work')) return 'bg-teal-500';
  return 'bg-gray-500';
};
