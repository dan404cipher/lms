import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';

import { Course } from '../models/Course';
import { Module } from '../models/Module';
import { Lesson } from '../models/Lesson';
import { uploadFileLocally, deleteFileLocally } from '../utils/fileUpload';
import { Material, Recording, Session, Enrollment } from '../models';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
export const getCourses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = { published: true };
    
    // If user is authenticated, filter based on their role and enrollment
    if (req.user) {
      const userId = req.user._id;
      const userRole = req.user.role;
      
      // Admins can see all courses
      if (['admin', 'super_admin'].includes(userRole)) {
        // No additional filtering needed for admins
      } else if (userRole === 'instructor') {
        // Instructors can see courses they teach
        query.instructorId = userId;
      } else {
        // Learners can only see courses they are enrolled in
        const userEnrollments = await Enrollment.find({ userId });
        const enrolledCourseIds = userEnrollments.map(e => e.courseId);
        query._id = { $in: enrolledCourseIds };
      }
    }

    // Filter by category
    if (req.query.category) {
      query.categoryId = req.query.category;
    }

    // Filter by difficulty
    if (req.query.difficulty) {
      query.difficulty = req.query.difficulty;
    }

    // Search by title or description
    if (req.query.search) {
      query.$text = { $search: req.query.search as string };
    }

    // Filter by instructor
    if (req.query.instructor) {
      query.instructorId = req.query.instructor;
    }

    // Sort options
    let sort: any = { createdAt: -1 };
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'rating':
          sort = { 'stats.averageRating': -1 };
          break;
        case 'enrollments':
          sort = { 'stats.enrollments': -1 };
          break;
        case 'newest':
          sort = { createdAt: -1 };
          break;
        case 'oldest':
          sort = { createdAt: 1 };
          break;
      }
    }

    const courses = await Course.find(query)
      .populate('instructorId', 'name profile.avatar')
      .populate('categoryId', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-requirements -learningOutcomes -settings');

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

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
export const getCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructorId', 'name profile.bio profile.avatar profile.socialLinks')
      .populate('categoryId', 'name description');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    console.log('course',course);

    // Only show published courses to non-instructors
    if (!course.published && req.user?.role !== 'instructor' && req.user?.role !== 'admin') {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      data: { course }
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
};

// @desc    Create course
// @route   POST /api/courses
// @access  Private (Instructor, Admin)
export const createCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const courseData = {
      ...req.body,
      instructorId: req.user._id
    };

    const course = await Course.create(courseData);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: { course }
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Instructor, Admin)
export const updateCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is the instructor or admin
    if (course.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this course'
      });
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: { course: updatedCourse }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Instructor, Admin)
export const deleteCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is the instructor or admin
    if (course.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this course'
      });
    }

    // Delete thumbnail from local storage if exists
    if (course.thumbnail) {
      try {
        await deleteFileLocally(course.thumbnail);
      } catch (error) {
        console.error('Failed to delete thumbnail from local storage:', error);
      }
    }

    await Course.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Publish course
// @route   POST /api/courses/:id/publish
// @access  Private (Instructor, Admin)
export const publishCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is the instructor or admin
    if (course.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to publish this course'
      });
    }

    course.published = true;
    await course.save();

    res.json({
      success: true,
      message: 'Course published successfully',
      data: { course }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload course thumbnail
// @route   POST /api/courses/:id/thumbnail
// @access  Private (Instructor, Admin)
export const uploadThumbnail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is the instructor or admin
    if (course.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this course'
      });
    }

    // Upload to local storage
    const uploadResult = await uploadFileLocally(req.file, 'course-thumbnails');

    // Delete old thumbnail if exists
    if (course.thumbnail) {
      try {
        await deleteFileLocally(course.thumbnail);
      } catch (error) {
        console.error('Failed to delete old thumbnail:', error);
      }
    }

    // Update course thumbnail
    course.thumbnail = uploadResult.Location;
    await course.save();

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      data: { thumbnail: uploadResult.Location }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get course modules
// @route   GET /api/courses/:id/modules
// @access  Public
export const getCourseModules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const modules = await Module.find({ 
      courseId: req.params.id,
      isPublished: true 
    }).sort('order');

    res.json({
      success: true,
      data: { modules }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create module
// @route   POST /api/courses/:courseId/modules
// @access  Private (Instructor, Admin)
export const createModule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
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

    // Check authorization
    if (course.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create modules for this course'
      });
    }

    const moduleData = {
      ...req.body,
      courseId: req.params.courseId
    };

    const module = await Module.create(moduleData);

    res.status(201).json({
      success: true,
      message: 'Module created successfully',
      data: { module }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update module
// @route   PUT /api/courses/:courseId/modules/:moduleId
// @access  Private (Instructor, Admin)
export const updateModule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const module = await Module.findById(req.params.moduleId);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    const course = await Course.findById(module.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check authorization
    if (course.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this module'
      });
    }

    const updatedModule = await Module.findByIdAndUpdate(
      req.params.moduleId,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Module updated successfully',
      data: { module: updatedModule }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete module
// @route   DELETE /api/courses/:courseId/modules/:moduleId
// @access  Private (Instructor, Admin)
export const deleteModule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const module = await Module.findById(req.params.moduleId);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    const course = await Course.findById(module.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check authorization
    if (course.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this module'
      });
    }

    await Module.findByIdAndDelete(req.params.moduleId);

    res.json({
      success: true,
      message: 'Module deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get module lessons
// @route   GET /api/courses/:courseId/modules/:moduleId/lessons
// @access  Public
export const getModuleLessons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const module = await Module.findById(req.params.moduleId);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    const lessons = await Lesson.find({ 
      moduleId: req.params.moduleId,
      isPublished: true 
    }).sort('order');

    res.json({
      success: true,
      data: { lessons }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create lesson
// @route   POST /api/courses/:courseId/modules/:moduleId/lessons
// @access  Private (Instructor, Admin)
export const createLesson = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const module = await Module.findById(req.params.moduleId);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    const course = await Course.findById(module.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check authorization
    if (course.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create lessons for this course'
      });
    }

    const lessonData = {
      ...req.body,
      moduleId: req.params.moduleId
    };

    const lesson = await Lesson.create(lessonData);

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: { lesson }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update lesson
// @route   PUT /api/courses/:courseId/modules/:moduleId/lessons/:lessonId
// @access  Private (Instructor, Admin)
export const updateLesson = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const lesson = await Lesson.findById(req.params.lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const module = await Module.findById(lesson.moduleId);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    const course = await Course.findById(module.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check authorization
    if (course.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this lesson'
      });
    }

    const updatedLesson = await Lesson.findByIdAndUpdate(
      req.params.lessonId,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Lesson updated successfully',
      data: { lesson: updatedLesson }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete lesson
// @route   DELETE /api/courses/:courseId/modules/:moduleId/lessons/:lessonId
// @access  Private (Instructor, Admin)
export const deleteLesson = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lesson = await Lesson.findById(req.params.lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const module = await Module.findById(lesson.moduleId);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    const course = await Course.findById(module.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check authorization
    if (course.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this lesson'
      });
    }

    await Lesson.findByIdAndDelete(req.params.lessonId);

    res.json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload lesson content
// @route   POST /api/courses/:courseId/modules/:moduleId/lessons/:lessonId/content
// @access  Private (Instructor, Admin)
export const uploadLessonContent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const lesson = await Lesson.findById(req.params.lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const module = await Module.findById(lesson.moduleId);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    const course = await Course.findById(module.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check authorization
    if (course.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload content for this lesson'
      });
    }

    // Upload file locally
    console.log('Uploading lesson content:', {
      lessonId: req.params.lessonId,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
    
    const uploadResult = await uploadFileLocally(req.file, 'lesson-content');
    console.log('Upload result:', uploadResult);

    // Update lesson with file information
    const fileInfo = {
      _id: new mongoose.Types.ObjectId().toString(),
      name: req.file.originalname,
      url: uploadResult.Location,
      type: req.file.mimetype,
      size: req.file.size
    };
    
    console.log('File info:', fileInfo);

    const contentUpdate = {
      $push: { files: fileInfo }
    };

    const updatedLesson = await Lesson.findByIdAndUpdate(
      req.params.lessonId,
      contentUpdate,
      { new: true }
    );

    res.json({
      success: true,
      message: 'Content uploaded successfully',
      data: { 
        lesson: updatedLesson,
        contentUrl: uploadResult.Location
      }
    });
  } catch (error) {
    console.error('Upload lesson content error:', error);
    if (error instanceof Error) {
      return res.status(500).json({
        success: false,
        message: `Upload failed: ${error.message}`
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Upload failed due to an unknown error'
    });
  }
};

// @desc    Get course detail with user progress
// @route   GET /api/courses/:id/detail
// @access  Private
export const getCourseDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.id;
    const userId = req.user._id;

    // Get course with populated data
    const course = await Course.findById(courseId)
      .populate('instructorId', 'name email profile')
      .populate('categoryId', 'name description');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get user's enrollment and progress
    const enrollment = await Enrollment.findOne({ userId, courseId });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    // Get course modules and lessons for progress calculation
    const modules = await Module.find({ courseId }).sort({ order: 1 });
    const sessions = await Session.find({ courseId }).sort({ scheduledAt: 1 });
    const materials = await Material.find({ courseId }).sort({ createdAt: -1 });
    const recordings=await Recording.find({ courseId }).sort({ createdAt: -1 });
    const lessons = await Lesson.find({ 
      moduleId: { $in: modules.map(m => m._id) } 
    }).sort({ order: 1 });

    // Calculate detailed progress based on actual completed lessons
    const totalVideos = lessons.filter(l => l.files && l.files.some(f => f.type.startsWith('video/'))).length;
    const totalResources = lessons.filter(l => l.files && l.files.length > 0).length;
    
    // Calculate actual progress based on completed lessons
    const completedLessons = enrollment.progress.completedLessons || [];
    const totalLessons = lessons.length;
    const completedLessonsCount = completedLessons.length;
    
    // Calculate completion percentage based on actual completed lessons
    const actualCompletionPercentage = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;
    
    // Update enrollment progress if it's different from actual progress
    if (enrollment.progress.completionPercentage !== actualCompletionPercentage) {
      enrollment.progress.completionPercentage = actualCompletionPercentage;
      enrollment.progress.lastAccessedAt = new Date();
      await enrollment.save();
    }
    
    // Calculate videos and resources based on actual progress
    const videosCompleted = Math.floor(totalVideos * (actualCompletionPercentage / 100));
    const resourcesViewed = Math.floor(totalResources * (actualCompletionPercentage / 100));

    // Get course statistics for learners
    const enrollments = await Enrollment.find({ courseId });
    const totalEnrollments = enrollments.length;
    const completedEnrollments = enrollments.filter((e: any) => e.progress?.completionPercentage === 100).length;
    const averageProgress = enrollments.length > 0 
      ? Math.round(enrollments.reduce((sum: number, e: any) => sum + (e.progress?.completionPercentage || 0), 0) / enrollments.length)
      : 0;

    // Mock syllabus and other data
    const syllabus = [
      {
        _id: 'syllabus-1',
        title: `${course.courseCode || 'Course'}_Syllabus.pdf`,
        type: 'pdf' as const,
        size: '123 KB',
        viewed: enrollment.progress.completionPercentage > 0
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

    const assessments = [
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

    // const recordings = [
    //   {
    //     _id: 'recording-1',
    //     title: 'Introduction to AI Concepts',
    //     date: '2025-08-10',
    //     duration: '45:30',
    //     instructor: (course.instructorId as any)?.name || 'Instructor'
    //   }
    // ];

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
        name: (course.instructorId as any)?.name || 'Unknown Instructor'
      },
      category: {
        name: (course.categoryId as any)?.name || 'Uncategorized'
      },
      courseCode: course.courseCode,
      progress: {
        videosCompleted,
        totalVideos,
        resourcesViewed,
        totalResources,
        percentage: actualCompletionPercentage
      },
      stats: {
        enrollments: totalEnrollments,
        completions: completedEnrollments,
        averageRating: course.stats?.averageRating || 0,
        totalRatings: course.stats?.totalRatings || 0,
        averageProgress: averageProgress
      },
      lastAccessed: enrollment.progress.completionPercentage > 0 ? {
        type: 'resource' as const,
        title: 'NPV - Day 1.pdf',
        id: 'resource-1'
      } : undefined,
      syllabus,
      prerequisites,
      assessments,
      groups,
      notes,
      sessions,
      materials,
      recordings,
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
      }))
    };
    console.log('courseDetail',courseDetail)

    res.json({
      success: true,
      data: { course: courseDetail }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download course material (for learners)
// @route   GET /api/courses/:courseId/materials/:materialId/download
// @access  Private (enrolled users)
export const downloadCourseMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, materialId } = req.params;
    const userId = req.user._id;

    // Check if user is enrolled in the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is enrolled (for students) or is instructor/admin
    const isInstructor = course.instructorId.toString() === userId.toString();
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
    
    if (!isInstructor && !isAdmin) {
      // For students, check if they are enrolled
      const enrollment = await Enrollment.findOne({
        userId: userId,
        courseId: courseId,
        status: { $in: ['active', 'completed'] }
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to download materials'
        });
      }
    }

    // Find the material
    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Check if material belongs to the course
    if (material.courseId.toString() !== courseId) {
      return res.status(404).json({
        success: false,
        message: 'Material not found in this course'
      });
    }

    // Check if material is published
    if (!material.isPublished) {
      return res.status(403).json({
        success: false,
        message: 'Material is not available for download'
      });
    }

    if (material.type === 'link') {
      if (!material.fileUrl) {
        return res.status(400).json({
          success: false,
          message: 'Link material has no URL'
        });
      }
      return res.redirect(material.fileUrl);
    }

    // For file downloads, you would implement file serving logic here
    // This is a placeholder - you'd need to implement actual file serving
    res.json({
      success: true,
      message: 'File download not implemented yet',
      fileUrl: material.fileUrl
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download lesson content file
// @route   GET /api/courses/:courseId/modules/:moduleId/lessons/:lessonId/content/:fileId/download
// @access  Private (enrolled users)
export const downloadLessonContent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, moduleId, lessonId, fileId } = req.params;
    const userId = req.user._id;

    // Check if user is enrolled in the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is enrolled (for students) or is instructor/admin
    const isInstructor = course.instructorId.toString() === userId.toString();
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
    
    if (!isInstructor && !isAdmin) {
      // For students, check if they are enrolled
      const enrollment = await Enrollment.findOne({
        userId: userId,
        courseId: courseId,
        status: { $in: ['active', 'completed'] }
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to download lesson content'
        });
      }
    }

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

// @desc    Mark lesson as completed
// @route   POST /api/courses/:courseId/lessons/:lessonId/complete
// @access  Private (enrolled users)
export const markLessonComplete = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user._id;

    // Check if user is enrolled in the course
    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    // Check if lesson exists and belongs to the course
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check if lesson belongs to a module in this course
    const module = await Module.findById(lesson.moduleId);
    if (!module || module.courseId.toString() !== courseId) {
      return res.status(404).json({
        success: false,
        message: 'Lesson does not belong to this course'
      });
    }

    // Add lesson to completed lessons if not already completed
    if (!enrollment.progress.completedLessons.includes(lessonId as any)) {
      enrollment.progress.completedLessons.push(lessonId as any);
      enrollment.progress.lastAccessedAt = new Date();
      
      // Calculate new completion percentage
      const totalLessons = await Lesson.countDocuments({ 
        moduleId: { $in: await Module.find({ courseId }).distinct('_id') } 
      });
      const completedCount = enrollment.progress.completedLessons.length;
      enrollment.progress.completionPercentage = totalLessons > 0 ? 
        Math.round((completedCount / totalLessons) * 100) : 0;

      await enrollment.save();

      // Log activity
      const Activity = require('../models/Activity').default;
      await Activity.create({
        userId,
        type: 'lesson_view',
        title: 'Lesson Completed',
        description: `Completed lesson: ${lesson.title}`,
        metadata: {
          courseId,
          lessonId,
          actionDetails: {
            completionPercentage: enrollment.progress.completionPercentage
          }
        }
      });
    }

    res.json({
      success: true,
      message: 'Lesson marked as completed',
      data: {
        completionPercentage: enrollment.progress.completionPercentage,
        completedLessons: enrollment.progress.completedLessons.length
      }
    });
  } catch (error) {
    next(error);
  }
};
