import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Session } from '../models/Session';
import { Course } from '../models/Course';
import { Enrollment } from '../models/Enrollment';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Create session
// @route   POST /api/sessions
// @access  Private (Instructor, Admin)
export const createSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { courseId, title, description, scheduledAt, duration } = req.body;

    // Check if course exists
    const course = await Course.findById(courseId);
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
        message: 'Not authorized to create sessions for this course'
      });
    }

    // Create Zoom meeting (this would integrate with Zoom API)
    // For now, we'll create a placeholder
    const zoomMeetingId = `zoom_${Date.now()}`;
    const joinUrl = `https://zoom.us/j/${zoomMeetingId}`;

    const session = await Session.create({
      courseId,
      title,
      description,
      scheduledAt,
      duration,
      zoomMeetingId,
      joinUrl,
      instructorId: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: { session }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sessions
// @route   GET /api/sessions
// @access  Private
export const getSessions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = {};

    // Filter by course
    if (req.query.courseId) {
      query.courseId = req.query.courseId;
    }

    // Filter by instructor
    if (req.query.instructorId) {
      query.instructorId = req.query.instructorId;
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query.scheduledAt = {
        $gte: new Date(req.query.startDate as string),
        $lte: new Date(req.query.endDate as string)
      };
    }

    const sessions = await Session.find(query)
      .populate('courseId', 'title')
      .populate('instructorId', 'name')
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Session.countDocuments(query);

    res.json({
      success: true,
      data: {
        sessions,
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

// @desc    Get single session
// @route   GET /api/sessions/:id
// @access  Private
export const getSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('courseId', 'title instructorId')
      .populate('instructorId', 'name');

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

// @desc    Update session
// @route   PUT /api/sessions/:id
// @access  Private (Instructor, Admin)
export const updateSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check authorization
    if (session.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this session'
      });
    }

    const updatedSession = await Session.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: { session: updatedSession }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete session
// @route   DELETE /api/sessions/:id
// @access  Private (Instructor, Admin)
export const deleteSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check authorization
    if (session.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this session'
      });
    }

    await Session.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join session
// @route   POST /api/sessions/:id/join
// @access  Private
export const joinSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('courseId', 'title');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: session.courseId,
      status: { $in: ['active', 'completed'] }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to join the session'
      });
    }

    // Check if session is scheduled for now or in the future
    const now = new Date();
    const sessionTime = new Date(session.scheduledAt);
    const sessionEndTime = new Date(sessionTime.getTime() + session.duration * 60000);

    if (now < sessionTime) {
      return res.status(400).json({
        success: false,
        message: 'Session has not started yet'
      });
    }

    if (now > sessionEndTime) {
      return res.status(400).json({
        success: false,
        message: 'Session has already ended'
      });
    }

    res.json({
      success: true,
      message: 'Joining session',
      data: { 
        joinUrl: session.joinUrl,
        sessionTitle: session.title,
        courseTitle: 'Course Title' // TODO: Populate courseId to get actual title
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get session attendance
// @route   GET /api/sessions/:id/attendance
// @access  Private (Instructor, Admin)
export const getSessionAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check authorization
    if (session.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view attendance for this session'
      });
    }

    // Get attendance records (this would come from the Attendance model)
    // For now, we'll return a placeholder
    const attendance = {
      sessionId: session._id,
      totalEnrolled: 0,
      present: 0,
      absent: 0,
      records: []
    };

    res.json({
      success: true,
      data: { attendance }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark attendance
// @route   POST /api/sessions/:id/attendance
// @access  Private (Instructor, Admin)
export const markAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, present } = req.body;

    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check authorization
    if (session.instructorId.toString() !== req.user._id.toString() && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark attendance for this session'
      });
    }

    // Create or update attendance record (this would use the Attendance model)
    // For now, we'll return a success message

    res.json({
      success: true,
      message: 'Attendance marked successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's activities
// @route   GET /api/sessions/my-activities
// @access  Private
export const getMyActivities = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get user's enrolled courses
    const enrollments = await Enrollment.find({ 
      userId: req.user._id,
      status: 'active'
    }).select('courseId');

    const courseIds = enrollments.map(enrollment => enrollment.courseId);

    // Get sessions for enrolled courses
    const sessions = await Session.find({
      courseId: { $in: courseIds }
    })
    .populate('courseId', 'title courseCode')
    .populate('instructorId', 'name')
    .sort({ scheduledAt: 1 });

    const activities = sessions.map(session => {
      const course = session.courseId as any;
      const instructor = session.instructorId as any;
      
      return {
        _id: session._id,
        type: session.type || 'live-class',
        title: session.title,
        subtitle: getActivitySubtitle(session, course),
        instructor: instructor?.name || 'Unknown Instructor',
        date: formatDate(session.scheduledAt),
        time: formatTime(session.scheduledAt),
        duration: formatDuration(session.duration),
        status: getActivityStatus(session),
        courseCode: course?.courseCode,
        hasRecording: session.hasRecording || false
      };
    });

    res.json({
      success: true,
      data: { activities }
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
const getActivitySubtitle = (session: any, course: any): string => {
  const typeMap: Record<string, string> = {
    'live-class': 'Online class',
    'quiz': 'Quiz',
    'assignment': 'Assignment',
    'discussion': 'Discussion',
    'residency': 'Residency'
  };
  
  const type = typeMap[session.type] || 'Activity';
  const courseInfo = course?.courseCode ? ` · ${course.courseCode} ${course.title}` : ` · ${course.title}`;
  
  return `${type}${courseInfo}`;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: '2-digit' 
  }).replace(' ', ' ');
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = minutes / 60;
  return `${hours.toFixed(1)} Hr Session`;
};

const getActivityStatus = (session: any): string => {
  const now = new Date();
  const sessionTime = new Date(session.scheduledAt);
  const sessionEndTime = new Date(sessionTime.getTime() + session.duration * 60000);

  if (session.status === 'completed') return 'completed';
  if (now < sessionTime) return 'upcoming';
  if (now >= sessionTime && now <= sessionEndTime) return 'ongoing';
  return 'missed';
};
