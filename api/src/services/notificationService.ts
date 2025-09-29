import { Server as SocketIOServer } from 'socket.io';
import { Course } from '../models/Course';
import { Session } from '../models/Session';
import { Enrollment } from '../models/Enrollment';
import { User } from '../models/User';

export interface NotificationData {
  type: 'session_start' | 'session_end' | 'course_update' | 'session_created' | 'session_updated';
  title: string;
  message: string;
  courseId: string;
  courseTitle: string;
  sessionId?: string;
  sessionTitle?: string;
  instructorId?: string;
  instructorName?: string;
  timestamp: Date;
  data?: any;
}

class NotificationService {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  // Send notification to course participants (learners and instructor)
  async notifyCourseParticipants(courseId: string, notification: NotificationData) {
    try {
      // Get all enrolled users for the course
      const enrollments = await Enrollment.find({ courseId, status: 'active' });
      const enrolledUserIds = enrollments.map(e => e.userId.toString());

      // Get course details
      const course = await Course.findById(courseId).populate('instructorId', 'name email');
      if (!course) return;

      // Add instructor to notification recipients
      if (course.instructorId) {
        enrolledUserIds.push(course.instructorId.toString());
      }

      // Send notification to all course participants
      enrolledUserIds.forEach(userId => {
        this.io.to(`user:${userId}`).emit('notification', {
          ...notification,
          courseId,
          courseTitle: course.title,
          instructorName: (course.instructorId as any)?.name || 'Unknown Instructor'
        });
      });

      console.log(`Notification sent to ${enrolledUserIds.length} users for course ${courseId}:`, notification.type);
    } catch (error) {
      console.error('Error sending course notification:', error);
    }
  }

  // Send notification to specific user
  async notifyUser(userId: string, notification: NotificationData) {
    try {
      this.io.to(`user:${userId}`).emit('notification', notification);
      console.log(`Notification sent to user ${userId}:`, notification.type);
    } catch (error) {
      console.error('Error sending user notification:', error);
    }
  }

  // Session start notification
  async notifySessionStart(sessionId: string) {
    try {
      const session = await Session.findById(sessionId)
        .populate('courseId', 'title')
        .populate('instructorId', 'name email');

      if (!session) return;

      const notification: NotificationData = {
        type: 'session_start',
        title: 'Session Started',
        message: `The session "${session.title}" has started. Click to join!`,
        courseId: (session.courseId as any)._id.toString(),
        courseTitle: (session.courseId as any).title,
        sessionId: (session._id as any).toString(),
        sessionTitle: session.title,
        instructorId: (session.instructorId as any)._id.toString(),
        instructorName: (session.instructorId as any).name,
        timestamp: new Date(),
        data: {
          joinUrl: session.joinUrl,
          startUrl: session.startUrl,
          duration: session.duration,
          type: session.type
        }
      };

      await this.notifyCourseParticipants((session.courseId as any)._id.toString(), notification);
    } catch (error) {
      console.error('Error sending session start notification:', error);
    }
  }

  // Session end notification
  async notifySessionEnd(sessionId: string) {
    try {
      const session = await Session.findById(sessionId)
        .populate('courseId', 'title')
        .populate('instructorId', 'name email');

      if (!session) return;

      const notification: NotificationData = {
        type: 'session_end',
        title: 'Session Ended',
        message: `The session "${session.title}" has ended.`,
        courseId: (session.courseId as any)._id.toString(),
        courseTitle: (session.courseId as any).title,
        sessionId: (session._id as any).toString(),
        sessionTitle: session.title,
        instructorId: (session.instructorId as any)._id.toString(),
        instructorName: (session.instructorId as any).name,
        timestamp: new Date(),
        data: {
          hasRecording: session.hasRecording,
          recordingUrl: session.recordingUrl
        }
      };

      await this.notifyCourseParticipants((session.courseId as any)._id.toString(), notification);
    } catch (error) {
      console.error('Error sending session end notification:', error);
    }
  }

  // Session created notification
  async notifySessionCreated(sessionId: string) {
    try {
      const session = await Session.findById(sessionId)
        .populate('courseId', 'title')
        .populate('instructorId', 'name email');

      if (!session) return;

      const notification: NotificationData = {
        type: 'session_created',
        title: 'New Session Scheduled',
        message: `A new session "${session.title}" has been scheduled for ${new Date(session.scheduledAt).toLocaleString()}.`,
        courseId: (session.courseId as any)._id.toString(),
        courseTitle: (session.courseId as any).title,
        sessionId: (session._id as any).toString(),
        sessionTitle: session.title,
        instructorId: (session.instructorId as any)._id.toString(),
        instructorName: (session.instructorId as any).name,
        timestamp: new Date(),
        data: {
          scheduledAt: session.scheduledAt,
          duration: session.duration,
          type: session.type,
          joinUrl: session.joinUrl
        }
      };

      await this.notifyCourseParticipants((session.courseId as any)._id.toString(), notification);
    } catch (error) {
      console.error('Error sending session created notification:', error);
    }
  }

  // Session updated notification
  async notifySessionUpdated(sessionId: string) {
    try {
      const session = await Session.findById(sessionId)
        .populate('courseId', 'title')
        .populate('instructorId', 'name email');

      if (!session) return;

      const notification: NotificationData = {
        type: 'session_updated',
        title: 'Session Updated',
        message: `The session "${session.title}" has been updated.`,
        courseId: (session.courseId as any)._id.toString(),
        courseTitle: (session.courseId as any).title,
        sessionId: (session._id as any).toString(),
        sessionTitle: session.title,
        instructorId: (session.instructorId as any)._id.toString(),
        instructorName: (session.instructorId as any).name,
        timestamp: new Date(),
        data: {
          scheduledAt: session.scheduledAt,
          duration: session.duration,
          type: session.type,
          status: session.status
        }
      };

      await this.notifyCourseParticipants((session.courseId as any)._id.toString(), notification);
    } catch (error) {
      console.error('Error sending session updated notification:', error);
    }
  }

  // Course update notification
  async notifyCourseUpdate(courseId: string, updateData: any) {
    try {
      const course = await Course.findById(courseId).populate('instructorId', 'name email');
      if (!course) return;

      const notification: NotificationData = {
        type: 'course_update',
        title: 'Course Updated',
        message: `The course "${course.title}" has been updated.`,
        courseId: (course._id as any).toString(),
        courseTitle: course.title,
        instructorId: (course.instructorId as any)?._id.toString(),
        instructorName: (course.instructorId as any)?.name || 'Unknown Instructor',
        timestamp: new Date(),
        data: updateData
      };

      await this.notifyCourseParticipants(courseId, notification);
    } catch (error) {
      console.error('Error sending course update notification:', error);
    }
  }

  // Broadcast to all users (for system-wide notifications)
  async broadcastToAll(notification: NotificationData) {
    try {
      this.io.emit('notification', notification);
      console.log('Broadcast notification sent to all users:', notification.type);
    } catch (error) {
      console.error('Error broadcasting notification:', error);
    }
  }
}

export default NotificationService;
