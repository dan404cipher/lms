import { Activity, IActivity } from '../models/Activity';
import { Request } from 'express';

interface ActivityLogData {
  userId: string;
  type: IActivity['type'];
  title: string;
  description: string;
  metadata?: {
    courseId?: string;
    sessionId?: string;
    lessonId?: string;
    assignmentId?: string;
    quizId?: string;
    materialId?: string;
    discussionId?: string;
    targetUserId?: string;
    score?: number;
    duration?: number;
    fileSize?: number;
    actionDetails?: any;
  };
  req?: Request;
}

export class ActivityLogger {
  /**
   * Log an activity asynchronously (fire and forget)
   */
  static async log(data: ActivityLogData): Promise<void> {
    try {
      const ipAddress = data.req?.ip || data.req?.connection?.remoteAddress || 'unknown';
      const userAgent = data.req?.headers['user-agent'] || 'unknown';

      await Activity.create({
        userId: data.userId,
        type: data.type,
        title: data.title,
        description: data.description,
        metadata: {
          ...data.metadata,
          ipAddress,
          userAgent
        },
        ipAddress,
        userAgent
      });
    } catch (error) {
      // Log error but don't throw to avoid breaking main functionality
      console.error('Failed to log activity:', error);
    }
  }

  /**
   * Log user login
   */
  static async logLogin(userId: string, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'login',
      title: 'User logged in',
      description: 'User successfully logged into the system',
      req
    });
  }

  /**
   * Log user logout
   */
  static async logLogout(userId: string, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'logout',
      title: 'User logged out',
      description: 'User logged out of the system',
      req
    });
  }

  /**
   * Log course enrollment
   */
  static async logCourseEnrollment(userId: string, courseId: string, courseTitle: string, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'course_enrollment',
      title: `Enrolled in ${courseTitle}`,
      description: `User enrolled in course: ${courseTitle}`,
      metadata: { courseId },
      req
    });
  }

  /**
   * Log course completion
   */
  static async logCourseCompletion(userId: string, courseId: string, courseTitle: string, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'course_completion',
      title: `Completed ${courseTitle}`,
      description: `User completed course: ${courseTitle}`,
      metadata: { courseId },
      req
    });
  }

  /**
   * Log session join
   */
  static async logSessionJoin(userId: string, sessionId: string, sessionTitle: string, courseId: string, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'session_join',
      title: `Joined ${sessionTitle}`,
      description: `User joined live session: ${sessionTitle}`,
      metadata: { sessionId, courseId },
      req
    });
  }

  /**
   * Log session leave
   */
  static async logSessionLeave(userId: string, sessionId: string, sessionTitle: string, courseId: string, duration: number, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'session_leave',
      title: `Left ${sessionTitle}`,
      description: `User left live session: ${sessionTitle} (Duration: ${Math.round(duration / 60000)} minutes)`,
      metadata: { sessionId, courseId, duration },
      req
    });
  }

  /**
   * Log assignment submission
   */
  static async logAssignmentSubmit(userId: string, assignmentId: string, assignmentTitle: string, courseId: string, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'assignment_submit',
      title: `Submitted ${assignmentTitle}`,
      description: `User submitted assignment: ${assignmentTitle}`,
      metadata: { assignmentId, courseId },
      req
    });
  }

  /**
   * Log quiz attempt
   */
  static async logQuizAttempt(userId: string, quizId: string, quizTitle: string, courseId: string, score: number, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'quiz_attempt',
      title: `Attempted ${quizTitle}`,
      description: `User attempted quiz: ${quizTitle} (Score: ${score}%)`,
      metadata: { quizId, courseId, score },
      req
    });
  }

  /**
   * Log quiz completion
   */
  static async logQuizCompletion(userId: string, quizId: string, quizTitle: string, courseId: string, score: number, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'quiz_completion',
      title: `Completed ${quizTitle}`,
      description: `User completed quiz: ${quizTitle} (Score: ${score}%)`,
      metadata: { quizId, courseId, score },
      req
    });
  }

  /**
   * Log material download
   */
  static async logMaterialDownload(userId: string, materialId: string, materialTitle: string, courseId: string, fileSize: number, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'material_download',
      title: `Downloaded ${materialTitle}`,
      description: `User downloaded material: ${materialTitle} (Size: ${Math.round(fileSize / 1024)} KB)`,
      metadata: { materialId, courseId, fileSize },
      req
    });
  }

  /**
   * Log profile update
   */
  static async logProfileUpdate(userId: string, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'profile_update',
      title: 'Profile updated',
      description: 'User updated their profile information',
      req
    });
  }

  /**
   * Log password reset
   */
  static async logPasswordReset(userId: string, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'password_reset',
      title: 'Password reset',
      description: 'User reset their password',
      req
    });
  }

  /**
   * Log password change
   */
  static async logPasswordChange(userId: string, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'password_change',
      title: 'Password changed',
      description: 'User changed their password',
      req
    });
  }

  /**
   * Log course view
   */
  static async logCourseView(userId: string, courseId: string, courseTitle: string, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'course_view',
      title: `Viewed ${courseTitle}`,
      description: `User viewed course: ${courseTitle}`,
      metadata: { courseId },
      req
    });
  }

  /**
   * Log lesson view
   */
  static async logLessonView(userId: string, lessonId: string, lessonTitle: string, courseId: string, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'lesson_view',
      title: `Viewed ${lessonTitle}`,
      description: `User viewed lesson: ${lessonTitle}`,
      metadata: { lessonId, courseId },
      req
    });
  }

  /**
   * Log discussion post
   */
  static async logDiscussionPost(userId: string, discussionId: string, discussionTitle: string, courseId: string, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'discussion_post',
      title: `Posted in ${discussionTitle}`,
      description: `User posted in discussion: ${discussionTitle}`,
      metadata: { discussionId, courseId },
      req
    });
  }

  /**
   * Log discussion reply
   */
  static async logDiscussionReply(userId: string, discussionId: string, discussionTitle: string, courseId: string, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'discussion_reply',
      title: `Replied in ${discussionTitle}`,
      description: `User replied in discussion: ${discussionTitle}`,
      metadata: { discussionId, courseId },
      req
    });
  }

  /**
   * Log certificate earned
   */
  static async logCertificateEarned(userId: string, courseId: string, courseTitle: string, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'certificate_earned',
      title: `Earned certificate for ${courseTitle}`,
      description: `User earned completion certificate for: ${courseTitle}`,
      metadata: { courseId },
      req
    });
  }

  /**
   * Log payment made
   */
  static async logPaymentMade(userId: string, courseId: string, courseTitle: string, amount: number, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'payment_made',
      title: `Payment for ${courseTitle}`,
      description: `User made payment of $${amount} for course: ${courseTitle}`,
      metadata: { courseId, actionDetails: { amount } },
      req
    });
  }

  /**
   * Log admin action
   */
  static async logAdminAction(userId: string, action: string, targetUserId: string, details: any, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'admin_action',
      title: `Admin action: ${action}`,
      description: `Admin performed action: ${action}`,
      metadata: { targetUserId, actionDetails: details },
      req
    });
  }

  /**
   * Log instructor action
   */
  static async logInstructorAction(userId: string, action: string, courseId: string, details: any, req: Request): Promise<void> {
    await this.log({
      userId,
      type: 'instructor_action',
      title: `Instructor action: ${action}`,
      description: `Instructor performed action: ${action}`,
      metadata: { courseId, actionDetails: details },
      req
    });
  }
}

export default ActivityLogger;
