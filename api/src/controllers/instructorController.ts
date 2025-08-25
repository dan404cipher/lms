import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Course } from '../models/Course';
import { Module } from '../models/Module';
import { Lesson } from '../models/Lesson';
import { Session } from '../models/Session';
import { Assessment } from '../models/Assessment';
import { Material } from '../models/Material';
import { Announcement } from '../models/Announcement';
import { Enrollment } from '../models/Enrollment';
import { User } from '../models/User';
import { uploadFileLocally } from '../utils/fileUpload';
import ActivityLogger from '../utils/activityLogger';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

interface AuthRequest extends Request {
  user?: any;
}

// Get instructor's courses
export const getMyCourses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('getMyCourses - User ID:', req.user._id, 'Role:', req.user.role);
    
    // Check if user is admin (admins can see all courses)
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
    console.log('getMyCourses - Is Admin:', isAdmin);
    
    // Note: Auto-enrollment logic removed - instructors should only see courses they are explicitly enrolled in
    // through batch management or course settings
    
    let courses: any[] = [];
    if (isAdmin) {
      // Admins can see all courses
      console.log('getMyCourses - Fetching all courses for admin');
      courses = await Course.find({})
        .populate('categoryId', 'name')
        .populate('instructorId', 'name')
        .sort({ createdAt: -1 });
    } else {
      // Instructors can only see courses they are enrolled in
      console.log('getMyCourses - Fetching courses for instructor ID:', req.user._id);
      
      // Get enrollments for this instructor (check all statuses for debugging)
      const instructorEnrollments = await Enrollment.find({ 
        userId: req.user._id
      });
      
      // For instructors, we ONLY use enrollment-based logic
      // This ensures that instructors see courses they are enrolled in through batch management
      
      // Filter for active/completed enrollments
      const activeEnrollments = instructorEnrollments.filter(enrollment => 
        ['active', 'completed'].includes(enrollment.status)
      );
      
      if (activeEnrollments.length === 0) {
        courses = [];
      } else {
        // Get course IDs from enrollments
        const courseIds = activeEnrollments.map(enrollment => enrollment.courseId);
        
        // Fetch courses where instructor is enrolled
        courses = await Course.find({ 
          _id: { $in: courseIds }
        })
        .populate('categoryId', 'name')
        .populate('instructorId', 'name')
        .sort({ createdAt: -1 });
        
        // Fetch courses where instructor is enrolled
      }
    }
    
    // Process courses with additional data

    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const enrollments = await Enrollment.find({ courseId: course._id });
        const totalEnrollments = enrollments.length;
        const completedEnrollments = enrollments.filter(e => e.progress.completionPercentage === 100).length;
        
        // Check if instructor is enrolled in this course
        const instructorEnrollment = await Enrollment.findOne({ 
          userId: req.user._id, 
          courseId: course._id 
        });
        
        // Calculate average rating (mock for now)
        const averageRating = 4.2;
        const totalRatings = Math.floor(totalEnrollments * 0.6);

        return {
          _id: course._id,
          title: course.title,
          description: course.description,
          category: { name: (course.categoryId as any)?.name || 'Uncategorized' },
          courseCode: course.courseCode,
          instructor: { name: (course.instructorId as any)?.name || 'Unknown' },
          stats: {
            enrollments: totalEnrollments,
            completions: completedEnrollments,
            averageRating,
            totalRatings
          },
          published: course.published,
          createdAt: course.createdAt,
          instructorEnrolled: !!instructorEnrollment
        };
      })
    );

    // Return courses with stats
    res.json({
      success: true,
      data: { courses: coursesWithStats }
    });
  } catch (error) {
    console.error('getMyCourses - Error:', error);
    next(error);
  }
};

// Get instructor course detail
export const getCourseDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user._id;

    // Check if user is admin (admins can access any course)
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
    
    let course;
    if (isAdmin) {
      // Admins can access any course
      course = await Course.findOne({ _id: courseId })
        .populate('instructorId', 'name email profile')
        .populate('categoryId', 'name description');
    } else {
      // For non-admins, check if they are the instructor or enrolled in the course
      course = await Course.findOne({ _id: courseId })
        .populate('instructorId', 'name email profile')
        .populate('categoryId', 'name description');
      
      if (course) {
        // Check if user is the instructor
        const isInstructor = course.instructorId._id.toString() === userId.toString();
        console.log('getCourseDetail - User ID:', userId, 'Course Instructor ID:', course.instructorId._id, 'Is Instructor:', isInstructor);
        
        if (!isInstructor) {
          // If not instructor, check if enrolled
          const enrollment = await Enrollment.findOne({ userId, courseId });
          console.log('getCourseDetail - Enrollment found:', !!enrollment);
          if (!enrollment) {
            return res.status(403).json({
              success: false,
              message: 'You are not enrolled in this course and do not have permission to access it'
            });
          }
        } else {
          // If user is the instructor, ensure they are enrolled (auto-enroll if not)
          const enrollment = await Enrollment.findOne({ userId, courseId });
          if (!enrollment) {
            console.log('getCourseDetail - Auto-enrolling instructor in course:', courseId);
            const newEnrollment = new Enrollment({
              userId: req.user._id,
              courseId: courseId,
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
            console.log('getCourseDetail - Instructor auto-enrolled successfully');
          }
        }
      }
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
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
            order: lesson.order,
            isPublished: lesson.isPublished,
            files: lesson.files || []
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
      courseCode, 
      priceCredits, 
      duration,
      difficulty,
      language,
      tags,
      requirements,
      learningOutcomes,
      thumbnail
    } = req.body;

    const course = new Course({
      title,
      description,
      shortDescription,
      categoryId,
      courseCode,
      instructorId: req.user._id,
      priceCredits: priceCredits || 0,
      duration: duration || 0,
      difficulty: difficulty || 'beginner',
      language: language || 'en',
      tags: tags || [],
      requirements: requirements || [],
      learningOutcomes: learningOutcomes || [],
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
      published: false
    });

    await course.save();

    // Automatically enroll the instructor in the course they created
    const enrollment = new Enrollment({
      userId: req.user._id,
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

    await enrollment.save();

    // Log instructor action for course creation
    await ActivityLogger.logInstructorAction(
      (req.user as any)._id.toString(),
      'Course Created',
      (course as any)._id.toString(),
      { courseTitle: course.title },
      req
    );

    // Log course enrollment for the instructor
    await ActivityLogger.logCourseEnrollment(
      (req.user as any)._id.toString(),
      (course as any)._id.toString(),
      course.title,
      req
    );

    console.log('createCourse - Created course and enrolled instructor:', {
      courseId: course._id,
      instructorId: req.user._id,
      courseTitle: course.title
    });

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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

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

// Get upcoming sessions for dashboard
export const getUpcomingSessions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user._id;
    const courses = await Course.find({ instructorId: userId });
    
    const sessions = await Session.find({ 
      courseId: { $in: courses.map(c => c._id) },
      status: 'scheduled'
    }).populate('courseId', 'title').sort({ scheduledAt: 1 }).limit(5);

    res.json({
      success: true,
      data: { sessions }
    });
  } catch (error) {
    next(error);
  }
};

// Get recent assessments for dashboard
export const getRecentAssessments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user._id;
    const courses = await Course.find({ instructorId: userId });
    
    const assessments = await Assessment.find({ 
      courseId: { $in: courses.map(c => c._id) }
    }).populate('courseId', 'title').sort({ createdAt: -1 }).limit(5);

    res.json({
      success: true,
      data: { assessments }
    });
  } catch (error) {
    next(error);
  }
};

// Get recent materials for dashboard
export const getRecentMaterials = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user._id;
    const courses = await Course.find({ instructorId: userId });
    
    const materials = await Material.find({ 
      courseId: { $in: courses.map(c => c._id) }
    }).populate('courseId', 'title').sort({ createdAt: -1 }).limit(5);

    res.json({
      success: true,
      data: { materials }
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

    const { title, description, order } = req.body;

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

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Upload file locally
    const uploadResult = await uploadFileLocally(req.file, 'materials');
    
    const { title, description, type } = req.body;

    const material = new Material({
      courseId,
      instructorId: userId,
      title: title || req.file.originalname,
      description: description || `Uploaded material: ${req.file.originalname}`,
      type: type || 'document',
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

// Upload lesson content (Instructor only)
export const uploadLessonContent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('uploadLessonContent (instructor) - Starting upload process');
    const { courseId, moduleId, lessonId } = req.params;
    const userId = req.user._id;
    console.log('uploadLessonContent (instructor) - Params:', { courseId, moduleId, lessonId, userId });
    
    if (!req.file) {
      console.log('uploadLessonContent (instructor) - No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('uploadLessonContent (instructor) - File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Check if user has permission to access this course
    const course = await Course.findOne({ _id: courseId, instructorId: userId });
    if (!course) {
      console.log('uploadLessonContent (instructor) - Course not found or no permission');
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    const lesson = await Lesson.findOne({ _id: lessonId, moduleId });
    if (!lesson) {
      console.log('uploadLessonContent (instructor) - Lesson not found');
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    console.log('uploadLessonContent (instructor) - Lesson found, uploading file...');

    // Simple file upload without external utility
    const fileExtension = req.file.originalname.split('.').pop() || 'file';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const folderPath = path.join(__dirname, '../../uploads/lesson-content');
    
    // Create folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    const filePath = path.join(folderPath, fileName);
    console.log('uploadLessonContent (instructor) - File path:', filePath);
    
    // Write file to disk
    fs.writeFileSync(filePath, req.file.buffer);
    console.log('uploadLessonContent (instructor) - File written successfully');

    // Create file object for the lesson
    const fileObject = {
      _id: new mongoose.Types.ObjectId().toString(),
      name: req.file.originalname,
      url: `/uploads/lesson-content/${fileName}`,
      type: req.file.mimetype,
      size: req.file.size
    };

    console.log('uploadLessonContent (instructor) - File object created:', fileObject);

    // Add file to lesson's files array
    lesson.files.push(fileObject);
    await lesson.save();

    console.log('uploadLessonContent (instructor) - Lesson saved successfully');

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: { file: fileObject }
    });
  } catch (error) {
    console.error('uploadLessonContent (instructor) - Error:', error);
    console.error('uploadLessonContent (instructor) - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    next(error);
  }
};
