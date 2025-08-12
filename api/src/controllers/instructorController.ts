import { Request, Response, NextFunction } from 'express';
import { Course } from '../models/Course';
import { Module } from '../models/Module';
import { Lesson } from '../models/Lesson';
import { Session } from '../models/Session';
import { Assessment } from '../models/Assessment';
import { Material } from '../models/Material';
import { Announcement } from '../models/Announcement';
import { Enrollment } from '../models/Enrollment';
import { User } from '../models/User';
import mongoose from 'mongoose';

interface AuthRequest extends Request {
  user?: any;
}

// Get instructor's courses
export const getMyCourses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // In development, show all courses to instructors for testing
    let courses;
    if (process.env.NODE_ENV === 'development') {
      courses = await Course.find({})
        .populate('categoryId', 'name')
        .populate('instructorId', 'name')
        .sort({ createdAt: -1 });
    } else {
      courses = await Course.find({ instructorId: req.user._id })
        .populate('categoryId', 'name')
        .sort({ createdAt: -1 });
    }

    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const enrollments = await Enrollment.find({ courseId: course._id });
        const totalEnrollments = enrollments.length;
        const completedEnrollments = enrollments.filter(e => e.progress.completionPercentage === 100).length;
        
        // Calculate average rating (mock for now)
        const averageRating = 4.2;
        const totalRatings = Math.floor(totalEnrollments * 0.6);

        return {
          _id: course._id,
          title: course.title,
          description: course.description,
          category: { name: (course.categoryId as any)?.name || 'Uncategorized' },
          courseCode: course.courseCode,
          instructor: process.env.NODE_ENV === 'development' ? { name: (course.instructorId as any)?.name || 'Unknown' } : undefined,
          stats: {
            enrollments: totalEnrollments,
            completions: completedEnrollments,
            averageRating,
            totalRatings
          },
          published: course.published,
          createdAt: course.createdAt
        };
      })
    );

    res.json({
      success: true,
      data: { courses: coursesWithStats }
    });
  } catch (error) {
    next(error);
  }
};

// Get instructor course detail
export const getCourseDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user._id;

    // In development, allow instructors to access any course for testing
    let course;
    if (process.env.NODE_ENV === 'development') {
      course = await Course.findOne({ _id: courseId })
        .populate('instructorId', 'name email profile')
        .populate('categoryId', 'name description');
    } else {
      course = await Course.findOne({ _id: courseId, instructorId: userId })
        .populate('instructorId', 'name email profile')
        .populate('categoryId', 'name description');
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    // Get enrollments and stats
    const enrollments = await Enrollment.find({ courseId });
    const totalEnrollments = enrollments.length;
    const completedEnrollments = enrollments.filter(e => e.progress.completionPercentage === 100).length;
    const averageProgress = enrollments.length > 0 
      ? enrollments.reduce((sum, e) => sum + e.progress.completionPercentage, 0) / enrollments.length 
      : 0;

    // Get modules and lessons
    const modules = await Module.find({ courseId }).sort({ order: 1 });
    const lessons = await Lesson.find({ 
      moduleId: { $in: modules.map(m => m._id) } 
    }).sort({ order: 1 });

    // Get sessions
    const sessions = await Session.find({ courseId }).sort({ scheduledAt: 1 });

    // Get assessments, materials, and announcements
    const assessments = await Assessment.find({ courseId }).sort({ dueDate: 1 });
    const materials = await Material.find({ courseId }).sort({ createdAt: -1 });
    const announcements = await Announcement.find({ courseId }).sort({ createdAt: -1 });

    // Create the same data structure as student API but with instructor extras
    const syllabus = [
      {
        _id: 'syllabus-1',
        title: `${course.courseCode || 'Course'}_Syllabus.pdf`,
        type: 'pdf' as const,
        size: '123 KB',
        viewed: true
      }
    ];

    const prerequisites = [
      {
        _id: 'prereq-1',
        title: 'Introduction to AI',
        type: 'video' as const,
        duration: '15:30',
        completed: false
      },
      {
        _id: 'prereq-2',
        title: 'AI Fundamentals Guide',
        type: 'pdf' as const,
        size: '2.1 MB',
        viewed: false
      }
    ];

    const studentAssessments = [
      {
        _id: 'assessment-1',
        title: 'AI Fundamentals Quiz',
        type: 'quiz' as const,
        dueDate: '2025-08-20',
        completed: false
      },
      {
        _id: 'assessment-2',
        title: 'Machine Learning Assignment',
        type: 'assignment' as const,
        dueDate: '2025-08-25',
        completed: false
      }
    ];

    const recordings = [
      {
        _id: 'recording-1',
        title: 'Introduction to AI Concepts',
        date: '2025-08-10',
        duration: '45:30',
        instructor: (course.instructorId as any)?.name || 'Instructor'
      }
    ];

    const groups = [
      {
        _id: 'group-1',
        name: 'AI Study Group',
        members: 12,
        description: 'Collaborative study group for AI fundamentals'
      }
    ];

    const notes = [
      {
        _id: 'note-1',
        title: 'Key AI Concepts',
        content: 'Important notes from the first lecture...',
        createdAt: '2025-08-10',
        updatedAt: '2025-08-10'
      }
    ];

    const courseDetail = {
      _id: course._id,
      title: course.title,
      description: course.description,
      instructor: {
        name: (course.instructorId as any)?.name || 'Unknown Instructor',
        email: (course.instructorId as any)?.email || ''
      },
      category: { name: (course.categoryId as any)?.name || 'Uncategorized' },
      courseCode: course.courseCode,
      // Instructor-specific stats
      stats: {
        enrollments: totalEnrollments,
        completions: completedEnrollments,
        averageRating: 4.2,
        totalRatings: Math.floor(totalEnrollments * 0.6),
        averageProgress
      },
      published: course.published,
      createdAt: course.createdAt,
      // Same structure as student API
      syllabus,
      prerequisites,
      assessments: studentAssessments, // Use student format for consistency
      recordings,
      groups,
      notes,
      // Instructor-specific data
      modules: modules.map(module => ({
        _id: module._id,
        title: module.title,
        description: module.description,
        order: module.order,
        lessons: lessons
          .filter(lesson => lesson.moduleId.toString() === (module._id as any).toString())
          .map(lesson => ({
            _id: lesson._id,
            title: lesson.title,
            description: lesson.description,
            contentType: lesson.contentType,
            duration: lesson.duration,
            order: lesson.order,
            isPublished: lesson.isPublished
          }))
      })),
      instructorAssessments: assessments, // Keep original assessments for instructor features
      sessions: sessions.map(session => ({
        _id: session._id,
        title: session.title,
        description: session.description,
        type: session.type,
        scheduledAt: session.scheduledAt,
        duration: session.duration,
        status: session.status,
        participants: totalEnrollments,
        hasRecording: session.hasRecording,
        recordingUrl: session.recordingUrl
      })),
      materials,
      announcements
    };

    res.json({
      success: true,
      data: { course: courseDetail }
    });
  } catch (error) {
    next(error);
  }
};

// Create course
export const createCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, categoryId, courseCode, priceCredits, duration } = req.body;

    const course = new Course({
      title,
      description,
      categoryId,
      courseCode,
      instructorId: req.user._id,
      priceCredits: priceCredits || 0,
      duration: duration || 0,
      published: false
    });

    await course.save();

    res.status(201).json({
      success: true,
      data: { course }
    });
  } catch (error) {
    next(error);
  }
};

// Update course
export const updateCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to edit it'
      });
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: { course: updatedCourse }
    });
  } catch (error) {
    next(error);
  }
};

// Delete course
export const deleteCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to delete it'
      });
    }

    await Course.findByIdAndDelete(courseId);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get dashboard stats
export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user._id;

    const courses = await Course.find({ instructorId: userId });
    const totalCourses = courses.length;
    const publishedCourses = courses.filter(c => c.published).length;

    const enrollments = await Enrollment.find({ 
      courseId: { $in: courses.map(c => c._id) } 
    });
    const totalEnrollments = enrollments.length;
    const totalCompletions = enrollments.filter(e => e.progress.completionPercentage === 100).length;

    const sessions = await Session.find({ 
      courseId: { $in: courses.map(c => c._id) },
      status: 'scheduled'
    });
    const upcomingSessions = sessions.length;

    const stats = {
      totalCourses,
      publishedCourses,
      totalEnrollments,
      totalCompletions,
      upcomingSessions,
      averageRating: 4.2
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};

// Module Management
export const createModule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const { title, description, order } = req.body;

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

// Lesson Management
export const createLesson = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, moduleId } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const { title, description, contentType, duration, order } = req.body;

    const lesson = new Lesson({
      moduleId,
      title,
      description,
      contentType,
      duration: duration || 0,
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

// Session Management
export const createSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const { title, description, type, scheduledAt, duration } = req.body;

    const session = new Session({
      courseId,
      instructorId: userId,
      title,
      description,
      type: type || 'live-class',
      scheduledAt,
      duration: duration || 60,
      status: 'scheduled',
      hasRecording: false
    });

    await session.save();

    res.status(201).json({
      success: true,
      data: { session }
    });
  } catch (error) {
    next(error);
  }
};

// Assessment Management
export const createAssessment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const { title, description, type, dueDate, totalPoints, instructions, timeLimit, isPublished } = req.body;

    const assessment = new Assessment({
      courseId,
      instructorId: userId,
      title,
      description,
      type: type || 'quiz',
      dueDate,
      totalPoints: totalPoints || 100,
      instructions,
      timeLimit,
      isPublished: isPublished || false
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

// Material Management
export const uploadMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const { title, description, type, fileUrl, fileName, fileSize, mimeType, isPublished } = req.body;

    const material = new Material({
      courseId,
      instructorId: userId,
      title,
      description,
      type: type || 'document',
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      isPublished: isPublished || false
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

// Announcement Management
export const createAnnouncement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const { title, content, isPublished, priority, expiresAt } = req.body;

    const announcement = new Announcement({
      courseId,
      instructorId: userId,
      title,
      content,
      isPublished: isPublished || false,
      priority: priority || 'medium',
      expiresAt
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

// Update and Delete functions for all entities
export const updateModule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, moduleId } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const module = await Module.findOneAndUpdate(
      { _id: moduleId, courseId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    res.json({
      success: true,
      data: { module }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteModule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, moduleId } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const module = await Module.findOneAndDelete({ _id: moduleId, courseId });
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Also delete all lessons in this module
    await Lesson.deleteMany({ moduleId });

    res.json({
      success: true,
      message: 'Module and its lessons deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const updateLesson = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const lesson = await Lesson.findOneAndUpdate(
      { _id: lessonId, moduleId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    res.json({
      success: true,
      data: { lesson }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLesson = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const lesson = await Lesson.findOneAndDelete({ _id: lessonId, moduleId });
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    res.json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const updateSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, sessionId } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const session = await Session.findOneAndUpdate(
      { _id: sessionId, courseId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      data: { session }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, sessionId } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const session = await Session.findOneAndDelete({ _id: sessionId, courseId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const updateAssessment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, assessmentId } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const assessment = await Assessment.findOneAndUpdate(
      { _id: assessmentId, courseId },
      req.body,
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
      data: { assessment }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAssessment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, assessmentId } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const assessment = await Assessment.findOneAndDelete({ _id: assessmentId, courseId });
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    res.json({
      success: true,
      message: 'Assessment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const updateMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, materialId } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const material = await Material.findOneAndUpdate(
      { _id: materialId, courseId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    res.json({
      success: true,
      data: { material }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, materialId } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const material = await Material.findOneAndDelete({ _id: materialId, courseId });
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    res.json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const updateAnnouncement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, announcementId } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const announcement = await Announcement.findOneAndUpdate(
      { _id: announcementId, courseId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    res.json({
      success: true,
      data: { announcement }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, announcementId } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const announcement = await Announcement.findOneAndDelete({ _id: announcementId, courseId });
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
