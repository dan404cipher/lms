import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Session } from '../models/Session';
import { Recording } from '../models/Recording';
import { Course } from '../models/Course';
import { Enrollment } from '../models/Enrollment';
import zoomIntegration from '../utils/zoomIntegration';
import ActivityLogger from '../utils/activityLogger';
import { RecordingUtils } from '../utils/recordingUtils';
import { getNotificationService } from '../config/socket';
import fs from 'fs';
import path from 'path';

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
      res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
      return;
    }

    const { courseId, title, description, scheduledAt, duration, type, maxParticipants } = req.body;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({
        success: false,
        message: 'Course not found'
      });
      return;
    }

    // Check if user is the instructor or admin
    if (!course.instructorId || 
        course.instructorId.toString() !== req.user._id.toString()) {
      // If no instructorId or user is not the instructor, check if they're admin
      if (!['admin', 'super_admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to create sessions for this course'
      });
      return;
      }
    }

    // Get instructor's Zoom email for multi-user support
    const { User } = await import('../models/User');
    const instructor = await User.findById(req.user._id);
    const instructorZoomEmail = instructor?.zoomEmail;

    console.log('📧 Instructor details:', {
      instructorId: req.user._id,
      instructorName: req.user.name,
      instructorEmail: req.user.email,
      zoomEmail: instructorZoomEmail
    });

    // Warn if instructor doesn't have a Zoom email configured
    if (!instructorZoomEmail) {
      console.warn('⚠️ WARNING: Instructor does not have a Zoom email configured. Meeting will be created under default Zoom account.');
      console.warn('⚠️ This may cause issues with concurrent meetings. Please set zoomEmail for this user.');
    }

    // Create Zoom meeting with real integration
    console.log('Creating Zoom meeting with data:', {
      topic: `${course.title} - ${title}`,
      start_time: new Date(scheduledAt).toISOString(),
      duration,
      timezone: 'UTC',
      zoomHost: instructorZoomEmail || 'default (me)'
    });

    let zoomMeeting;
    try {
      // Format the start time correctly for Zoom API
      const startTime = new Date(scheduledAt);
      const startTimeISO = startTime.toISOString();
      
      console.log('📅 Meeting start time details:', {
        original: scheduledAt,
        parsed: startTime,
        iso: startTimeISO,
        duration: duration
      });

      zoomMeeting = await zoomIntegration.createMeetingQueued({
        topic: `${course.title} - ${title}`,
        start_time: startTimeISO,
        duration: parseInt(duration.toString()),
        timezone: 'UTC',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,  // Allow students to join before instructor
          mute_upon_entry: true,
          waiting_room: false,     // Disable waiting room for easier access
          auto_recording: 'cloud', // Use cloud recording (Pro plan feature)
          allow_multiple_devices: true
        }
      }, instructorZoomEmail); // Pass instructor's Zoom email for multi-user support

      console.log('✅ Zoom meeting created successfully:', zoomMeeting.id);
      console.log('📹 Cloud recording enabled for meeting:', zoomMeeting.id);
      console.log('Zoom meeting details:', {
        id: zoomMeeting.id,
        join_url: zoomMeeting.join_url,
        start_url: zoomMeeting.start_url,
        password: zoomMeeting.password,
        settings: zoomMeeting.settings
      });
    } catch (zoomError) {
      console.error('❌ Failed to create Zoom meeting:', zoomError);
      res.status(500).json({
        success: false,
        message: 'Failed to create Zoom meeting. Please check your Zoom API configuration.',
        error: zoomError instanceof Error ? zoomError.message : 'Unknown error'
      });
      return;
    }

    const session = await Session.create({
      courseId,
      title,
      description,
      scheduledAt,
      duration,
      type: type || 'live-class',
      maxParticipants,
      zoomMeetingId: zoomMeeting.id,
      joinUrl: zoomMeeting.join_url,
      startUrl: zoomMeeting.start_url, // Store the host start URL
      instructorId: req.user._id
    });

    // Send notification to course participants
    try {
      const notificationService = getNotificationService();
      await notificationService.notifySessionCreated(session._id?.toString() || '');
    } catch (error) {
      console.error('Error sending session created notification:', error);
    }

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
      
      // For students, check if they're enrolled in the course
      if (!['instructor', 'admin', 'super_admin'].includes(req.user.role)) {
        const enrollment = await Enrollment.findOne({
          userId: req.user._id,
          courseId: req.query.courseId,
          status: { $in: ['active', 'completed'] }
        });
        
        if (!enrollment) {
      res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to view sessions'
      });
      return;
        }
      }
    }

    // Filter by instructor
    if (req.query.instructorId) {
      query.instructorId = req.query.instructorId;
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      // Set start date to beginning of day (00:00:00)
      const start = new Date(req.query.startDate as string);
      start.setHours(0, 0, 0, 0);
      
      // Set end date to end of day (23:59:59.999)
      const end = new Date(req.query.endDate as string);
      end.setHours(23, 59, 59, 999);
      
      query.scheduledAt = {
        $gte: start,
        $lte: end
      };
    }

    // Handle sorting
    const sortBy = req.query.sortBy as string || 'scheduledAt';
    const sortOrder = req.query.sortOrder as string || 'desc';
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const sessions = await Session.find(query)
      .populate('courseId', 'title')
      .populate('instructorId', 'name')
      .sort(sortObj)
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
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
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
      res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
      return;
    }

    const session = await Session.findById(req.params.id);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }

    // Check authorization
    if (!session.instructorId || 
        session.instructorId.toString() !== req.user._id.toString()) {
      // If no instructorId or user is not the instructor, check if they're admin
      if (!['admin', 'super_admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this session'
      });
      return;
      }
    }

    const updatedSession = await Session.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Send notification to course participants
    try {
      const notificationService = getNotificationService();
      await notificationService.notifySessionUpdated(req.params.id || '');
    } catch (error) {
      console.error('Error sending session updated notification:', error);
    }

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
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }

    // Check authorization
    if (!session.instructorId || 
        session.instructorId.toString() !== req.user._id.toString()) {
      // If no instructorId or user is not the instructor, check if they're admin
      if (!['admin', 'super_admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete this session'
      });
      return;
      }
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
    console.log('Join session request:', {
      sessionId: req.params.id,
      userId: req.user._id,
      userRole: req.user.role
    });

    const session = await Session.findById(req.params.id)
      .populate('courseId', 'title');

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }

    console.log('Session found:', {
      sessionId: session._id,
      courseId: session.courseId,
      instructorId: session.instructorId,
      scheduledAt: session.scheduledAt
    });

    // Check if user is enrolled in the course OR is the instructor
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: session.courseId,
      status: { $in: ['active', 'completed'] }
    });

    const isInstructor = session.instructorId && session.instructorId.toString() === req.user._id.toString();
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

    console.log('Authorization check:', {
      hasEnrollment: !!enrollment,
      isInstructor,
      isAdmin,
      enrollmentStatus: enrollment?.status
    });

    if (!enrollment && !isInstructor && !isAdmin) {
      console.log('Access denied: User not enrolled, not instructor, not admin');
      res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to join the session'
      });
      return;
    }

    console.log('Access granted, proceeding with join');

    // Log session join activity
    await ActivityLogger.logSessionJoin(
      (req.user as any)._id.toString(),
      (session as any)._id.toString(),
      session.title,
      (session.courseId as any)._id.toString(),
      req
    );

    // For testing, allow joining regardless of time restrictions
    // In production, you might want to keep these checks
    /*
    const now = new Date();
    const sessionTime = new Date(session.scheduledAt);
    const sessionEndTime = new Date(sessionTime.getTime() + session.duration * 60000);

    if (now < sessionTime) {
      res.status(400).json({
        success: false,
        message: 'Session has not started yet'
      });
      return;
    }

    if (now > sessionEndTime) {
      res.status(400).json({
        success: false,
        message: 'Session has already ended'
      });
      return;
    }
    */

    // Determine the correct URL based on user role
    let meetingUrl = session.joinUrl; // Default for students
    let userRole = 'attendee';
    
    if (isInstructor || isAdmin) {
      // Use the actual start URL from Zoom, fallback to manual construction
      if (session.startUrl) {
        meetingUrl = session.startUrl;
      } else {
        // For real meetings, use start URL format, for mock meetings use join with role
        meetingUrl = `https://zoom.us/s/${session.zoomMeetingId}?role=1`;
      }
      userRole = 'host';
    }

    console.log('Join session response:', {
      sessionId: session._id,
      joinUrl: session.joinUrl,
      startUrl: session.startUrl,
      meetingUrl: meetingUrl,
      userRole: userRole,
      isInstructor: isInstructor,
      isAdmin: isAdmin,
      zoomMeetingId: session.zoomMeetingId,
      sessionTitle: session.title
    });

    res.json({
      success: true,
      message: 'Joining session',
      data: { 
        joinUrl: meetingUrl, // Use appropriate URL based on role
        sessionTitle: session.title,
        courseTitle: (session.courseId as any).title,
        userRole: userRole
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
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }

    // Check authorization
    if (!session.instructorId || 
        session.instructorId.toString() !== req.user._id.toString()) {
      // If no instructorId or user is not the instructor, check if they're admin
      if (!['admin', 'super_admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view attendance for this session'
      });
      return;
      }
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
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }

    // Check authorization
    if (!session.instructorId || 
        session.instructorId.toString() !== req.user._id.toString()) {
      // If no instructorId or user is not the instructor, check if they're admin
      if (!['admin', 'super_admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to mark attendance for this session'
      });
      return;
      }
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

// @desc    Start session
// @route   POST /api/sessions/:id/start
// @access  Private (Instructor, Admin)
export const startSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }

    // Check authorization
    if (!session.instructorId || 
        session.instructorId.toString() !== req.user._id.toString()) {
      // If no instructorId or user is not the instructor, check if they're admin
      if (!['admin', 'super_admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to start this session'
      });
      return;
      }
    }

    // Update session status to live
    await Session.findByIdAndUpdate(req.params.id, { status: 'live' });

    // Send notification to course participants
    try {
      const notificationService = getNotificationService();
      await notificationService.notifySessionStart(req.params.id || '');
    } catch (error) {
      console.error('Error sending session start notification:', error);
    }

    // For instructors, return the start URL from the Zoom meeting
    // For participants, they should use the join URL
    let startUrl;
    if (session.startUrl) {
      startUrl = session.startUrl;
    } else {
      // Fallback for mock meetings or missing start URL
      startUrl = `https://zoom.us/s/${session.zoomMeetingId}?role=1`;
    }
    
    console.log('Start session debug:', {
      sessionId: session._id,
      zoomMeetingId: session.zoomMeetingId,
      storedStartUrl: session.startUrl,
      generatedStartUrl: startUrl,
      instructorId: session.instructorId,
      userId: req.user._id
    });
    
    res.json({
      success: true,
      message: 'Session started successfully',
      data: { 
        joinUrl: startUrl, // Use start URL for instructors
        sessionId: session._id
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    End session
// @route   POST /api/sessions/:id/end
// @access  Private (Instructor, Admin)
export const endSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }

    // Check authorization
    if (!session.instructorId || 
        session.instructorId.toString() !== req.user._id.toString()) {
      // If no instructorId or user is not the instructor, check if they're admin
      if (!['admin', 'super_admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to end this session'
      });
      return;
      }
    }

    // Update session status to completed
    await Session.findByIdAndUpdate(req.params.id, { status: 'completed' });

    // Send notification to course participants
    try {
      const notificationService = getNotificationService();
      await notificationService.notifySessionEnd(req.params.id || '');
    } catch (error) {
      console.error('Error sending session end notification:', error);
    }

    // Process recordings immediately and set up retry mechanism
    if (session.zoomMeetingId) {
      try {
        console.log('Processing recordings for ended session...');
        
        // Try to process recordings immediately
        const processedRecordings = await zoomIntegration.processSessionRecordings(
          (session._id as any).toString(), 
          session.zoomMeetingId
        );

        if (processedRecordings.length > 0) {
          console.log(`Successfully processed ${processedRecordings.length} recordings immediately`);
          await Session.findByIdAndUpdate(session._id, { hasRecording: true });
        } else {
          console.log('No recordings found yet. Setting up retry mechanism...');
          
          // Set up retry mechanism for recordings that take time to process
          const retryProcessing = async (attempt: number = 1, maxAttempts: number = 6) => {
            if (attempt > maxAttempts) {
              console.log('Max retry attempts reached for recording processing');
              return;
            }

            console.log(`Retry attempt ${attempt}/${maxAttempts} for recording processing...`);
            
            setTimeout(async () => {
              try {
                const recordings = await zoomIntegration.processSessionRecordings(
                  (session._id as any).toString(), 
                  session.zoomMeetingId!
                );

                if (recordings.length > 0) {
                  console.log(`Successfully processed ${recordings.length} recordings on attempt ${attempt}`);
                  await Session.findByIdAndUpdate(session._id, { hasRecording: true });
                } else {
                  console.log(`No recordings found on attempt ${attempt}, retrying...`);
                  retryProcessing(attempt + 1, maxAttempts);
                }
              } catch (error) {
                console.error(`Error on retry attempt ${attempt}:`, error);
                retryProcessing(attempt + 1, maxAttempts);
              }
            }, 30000 * attempt); // Exponential backoff: 30s, 60s, 90s, etc.
          };

          // Start retry mechanism
          retryProcessing();
        }
        
      } catch (error) {
        console.error('Error processing recordings after session end:', error);
      }
    }

    // Log session end activity
    await ActivityLogger.logInstructorAction(
      (req.user as any)._id.toString(),
      'Session Ended',
      session.courseId.toString(),
      { sessionId: session._id, sessionTitle: session.title },
      req
    );

    res.json({
      success: true,
      message: 'Session ended successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave session
// @route   POST /api/sessions/:id/leave
// @access  Private
export const leaveSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
      return;
    }

    // Log session leave activity
    const duration = session.startedAt ? Date.now() - new Date(session.startedAt).getTime() : 0;
    await ActivityLogger.logSessionLeave(
      (req.user as any)._id.toString(),
      (session as any)._id.toString(),
      session.title,
      (session as any).courseId.toString(),
      duration,
      req
    );

    res.json({
      success: true,
      message: 'Left session successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get session recordings
// @route   GET /api/sessions/:id/recordings
// @access  Private
export const getSessionRecordings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }

    if (!session.zoomMeetingId) {
      res.json({
        success: true,
        data: { recordings: [] }
      });
      return;
    }

    // First, try to get recordings from database
    const dbRecordings = await Recording.find({ sessionId: session._id }).sort({ recordedAt: -1 });
    
    if (dbRecordings.length > 0) {
      console.log(`📹 Found ${dbRecordings.length} recordings in database for session ${session._id}`);
      res.json({
        success: true,
        data: { recordings: dbRecordings }
      });
      return;
    }

    // If no recordings in database, try to fetch from Zoom and process them
    console.log(`🔍 No recordings in database, fetching from Zoom for meeting ${session.zoomMeetingId}`);
    const processedRecordings = await zoomIntegration.processSessionRecordings((session._id as any).toString(), session.zoomMeetingId!);
    
    res.json({
      success: true,
      data: { recordings: processedRecordings }
    });
  } catch (error) {
    console.error('Error getting session recordings:', error);
    next(error);
  }
};

// @desc    Get all recordings for a course
// @route   GET /api/sessions/recordings
// @access  Private
export const getRecordings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('getRecordings called with query:', req.query);
    
    const query: any = {};

    // Filter by course
    if (req.query.courseId) {
      query.courseId = req.query.courseId;
    }

    console.log('Recording query:', query);

    // Get recordings from database without populate to avoid 500 errors
    const recordings = await Recording.find(query).sort({ recordedAt: -1 });

    console.log(`Found ${recordings.length} recordings`);

    // Transform recordings to use Zoom play URLs for video playback
    const transformedRecordings = recordings.map(recording => {
      const recordingObj = recording.toObject();
      
      // Use Zoom play_url for video playback if available
      // The play_url is designed for streaming video content
      if (recordingObj.playUrl) {
        recordingObj.recordingUrl = recordingObj.playUrl;
        console.log(`Using Zoom play URL for recording: ${recordingObj.playUrl}`);
      } else if (recordingObj.downloadUrl) {
        // Fallback to download URL if play URL not available
        recordingObj.recordingUrl = recordingObj.downloadUrl;
        console.log(`Using Zoom download URL as fallback: ${recordingObj.downloadUrl}`);
      }
      
      return recordingObj;
    });

    res.json({
      success: true,
      data: { recordings: transformedRecordings }
    });
  } catch (error) {
    console.error('Error in getRecordings:', error);
    console.error('Error stack:', (error as Error).stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching recordings',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
};

// @desc    Download recording manually
// @route   POST /api/sessions/:id/download-recording
// @access  Private (Instructor, Admin)
export const downloadRecordingManually = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.id;
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (!session.zoomMeetingId) {
      return res.status(400).json({
        success: false,
        message: 'No Zoom meeting ID found for this session'
      });
    }

    console.log(`🔄 Manually downloading recordings for session ${sessionId}`);
    
    // Process recordings and download them
    const processedRecordings = await zoomIntegration.processSessionRecordings(
      (session._id as any).toString(), 
      session.zoomMeetingId
    );

    res.json({
      success: true,
      message: `Downloaded ${processedRecordings.length} recordings for session`,
      data: { recordings: processedRecordings }
    });
  } catch (error) {
    console.error('Error downloading recordings manually:', error);
    next(error);
  }
};

// @desc    Sync recordings for all sessions
// @route   POST /api/sessions/sync-recordings
// @access  Private (Instructor, Admin)
export const syncRecordings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('🔄 Starting recording sync for all sessions...');
    
    // Get all sessions with Zoom meeting IDs
    const sessions = await Session.find({ 
      zoomMeetingId: { $exists: true, $ne: null },
      status: { $in: ['completed', 'live'] }
    });

    console.log(`📅 Found ${sessions.length} sessions to sync recordings for`);

    const results = [];
    
    for (const session of sessions) {
      try {
        console.log(`🔍 Syncing recordings for session: ${session._id} (Meeting: ${session.zoomMeetingId})`);
        
        const processedRecordings = await zoomIntegration.processSessionRecordings(
          (session._id as any).toString(), 
          session.zoomMeetingId!
        );
        
        results.push({
          sessionId: (session._id as any).toString(),
          meetingId: session.zoomMeetingId,
          recordingsFound: processedRecordings.length,
          success: true
        });
        
        console.log(`✅ Synced ${processedRecordings.length} recordings for session ${session._id}`);
      } catch (error) {
        console.error(`❌ Error syncing recordings for session ${session._id}:`, error);
        results.push({
          sessionId: (session._id as any).toString(),
          meetingId: session.zoomMeetingId,
          recordingsFound: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const totalRecordings = results.reduce((sum, result) => sum + result.recordingsFound, 0);
    const successfulSessions = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `Recording sync completed. Processed ${sessions.length} sessions, found ${totalRecordings} recordings.`,
      data: {
        sessionsProcessed: sessions.length,
        successfulSessions,
        totalRecordings,
        results
      }
    });
  } catch (error) {
    console.error('Error syncing recordings:', error);
    next(error);
  }
};

// @desc    Download recording
// @route   GET /api/sessions/recordings/:recordingId/download
// @access  Private
export const downloadRecording = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { recordingId } = req.params;

    // Find the recording in database
    const recording = await Recording.findOne({ zoomRecordingId: recordingId });
    
    if (!recording) {
      res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
      return;
    }

    // Check if user has access to this recording (enrolled in course)
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: recording.courseId,
      status: { $in: ['active', 'completed'] }
    });

    if (!enrollment) {
      res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to access recordings'
      });
      return;
    }

    // If we have a local file, serve it directly
    if (recording.localFilePath) {
      // Extract filename from the local file path
      const fileName = path.basename(recording.localFilePath);
      
      console.log('Attempting to serve local recording:', fileName);
      console.log('File exists:', RecordingUtils.recordingExists(fileName));
      
      if (RecordingUtils.recordingExists(fileName)) {
        const filePath = RecordingUtils.getRecordingPath(fileName);
        
        // Increment view count
        await Recording.findByIdAndUpdate(recording._id, { $inc: { viewCount: 1 } });
        
        // Set appropriate headers for video streaming
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${recording.title}.mp4"`);
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        return;
      } else {
        console.log('Local recording file not found, falling back to Zoom URL');
      }
    }

    // Fallback to Zoom download URL
    if (recording.downloadUrl) {
      // Redirect to the Zoom download URL
      res.redirect(recording.downloadUrl);
      return;
    } else {
      res.status(404).json({
        success: false,
        message: 'Recording file not available. The recording may still be processing or the file may have been moved.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Zoom webhook handler
// @route   POST /api/sessions/webhook
// @access  Public (Zoom webhooks)
export const zoomWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event, payload } = req.body;
    
    console.log('Zoom webhook received:', event, payload?.object?.id);

    switch (event) {
      case 'meeting.started':
        await handleMeetingStarted(payload);
        break;
      case 'meeting.ended':
        await handleMeetingEnded(payload);
        break;
      case 'recording.completed':
        await handleRecordingCompleted(payload);
        break;
      default:
        console.log('Unhandled Zoom webhook event:', event);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling Zoom webhook:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
};

// Helper functions for webhook processing
const handleMeetingStarted = async (payload: any) => {
  try {
    const meetingId = payload.object.id;
    await Session.findOneAndUpdate(
      { zoomMeetingId: meetingId },
      { status: 'live' }
    );
    console.log(`Meeting ${meetingId} started - status updated to live`);
  } catch (error) {
    console.error('Error handling meeting started:', error);
  }
};

const handleMeetingEnded = async (payload: any) => {
  try {
    const meetingId = payload.object.id;
    await Session.findOneAndUpdate(
      { zoomMeetingId: meetingId },
      { status: 'completed' }
    );
    console.log(`Meeting ${meetingId} ended - status updated to completed`);
  } catch (error) {
    console.error('Error handling meeting ended:', error);
  }
};

const handleRecordingCompleted = async (payload: any) => {
  try {
    const meetingId = payload.object.id;
    console.log(`Recording completed webhook received for meeting: ${meetingId}`);
    
    // Find the session
    const session = await Session.findOne({ zoomMeetingId: meetingId });
    if (!session) {
      console.error(`Session not found for Zoom meeting ${meetingId}`);
      return;
    }

    console.log(`Processing recordings for session: ${session._id}`);
    
    // Use the new processSessionRecordings method
    const processedRecordings = await zoomIntegration.processSessionRecordings(
      (session._id as any).toString(), 
      meetingId
    );

    if (processedRecordings.length > 0) {
      console.log(`Successfully processed ${processedRecordings.length} recordings via webhook`);
      await Session.findByIdAndUpdate(session._id, { hasRecording: true });
    } else {
      console.log('No recordings were processed via webhook. This might be because recordings are still being processed by Zoom.');
    }
    
    console.log(`Recording completed for meeting ${meetingId} - session and recordings updated`);
  } catch (error) {
    console.error('Error handling recording completed:', error);
  }
};


// @desc    Check for recordings manually
// @route   POST /api/sessions/:id/check-recordings
// @access  Private (Instructor, Admin)
export const checkForRecordings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }

    // Check authorization
    if (!session.instructorId || 
        session.instructorId.toString() !== req.user._id.toString()) {
      // If no instructorId or user is not the instructor, check if they're admin
      if (!['admin', 'super_admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to check recordings for this session'
      });
      return;
      }
    }

    if (!session.zoomMeetingId) {
      res.status(400).json({
        success: false,
        message: 'No Zoom meeting associated with this session'
      });
      return;
    }

    try {
      console.log('Checking for recordings for session:', session._id);
      
      // Use the improved processSessionRecordings method which filters for video-only files
      const processedRecordings = await zoomIntegration.processSessionRecordings(
        (session._id as any).toString(),
        session.zoomMeetingId
      );
      
      if (processedRecordings.length > 0) {
        console.log(`Found and processed ${processedRecordings.length} video recording(s)`);
        
        res.json({
          success: true,
          message: `Found ${processedRecordings.length} video recording(s) with both audio and video.`,
          data: { 
            totalRecordings: processedRecordings.length,
            newRecordings: processedRecordings.length
          }
        });
      } else {
        res.json({
          success: false,
          message: 'No video recordings found yet. Please wait 2-5 minutes for Zoom to process the recording.'
        });
      }
    } catch (error) {
      console.error('Error fetching recordings:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching recordings from Zoom'
      });
    }
  } catch (error) {
    next(error);
  }
};
