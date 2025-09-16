import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'login' | 'logout' | 'course_enrollment' | 'course_completion' | 'session_join' | 'session_leave' | 'assignment_submit' | 'quiz_attempt' | 'quiz_completion' | 'material_download' | 'profile_update' | 'password_reset' | 'password_change' | 'course_view' | 'lesson_view' | 'discussion_post' | 'discussion_reply' | 'certificate_earned' | 'payment_made' | 'admin_action' | 'instructor_action';
  title: string;
  description: string;
  metadata: {
    courseId?: mongoose.Types.ObjectId;
    sessionId?: mongoose.Types.ObjectId;
    lessonId?: mongoose.Types.ObjectId;
    assignmentId?: mongoose.Types.ObjectId;
    quizId?: mongoose.Types.ObjectId;
    materialId?: mongoose.Types.ObjectId;
    discussionId?: mongoose.Types.ObjectId;
    targetUserId?: mongoose.Types.ObjectId;
    ipAddress?: string;
    userAgent?: string;
    score?: number;
    duration?: number;
    fileSize?: number;
    actionDetails?: any;
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<IActivity>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'login', 'logout', 'course_enrollment', 'course_completion', 
      'session_join', 'session_leave', 'assignment_submit', 'quiz_attempt', 
      'quiz_completion', 'material_download', 'profile_update', 'password_reset',
      'password_change', 'course_view', 'lesson_view', 'discussion_post', 'discussion_reply',
      'certificate_earned', 'payment_made', 'admin_action', 'instructor_action'
    ],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      index: true
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session'
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson'
    },
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment'
    },
    quizId: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz'
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material'
    },
    discussionId: {
      type: Schema.Types.ObjectId,
      ref: 'Discussion'
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    ipAddress: String,
    userAgent: String,
    score: Number,
    duration: Number,
    fileSize: Number,
    actionDetails: Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Indexes for better query performance
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });
activitySchema.index({ 'metadata.courseId': 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });

// Text indexes for search functionality
activitySchema.index({ title: 'text', description: 'text', type: 'text' });

// Virtual for formatted date
activitySchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit'
  });
});

// Virtual for formatted time
activitySchema.virtual('formattedTime').get(function() {
  return this.createdAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
});

// Virtual for time ago
activitySchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - this.createdAt.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
});

// Ensure virtuals are included in JSON output
activitySchema.set('toJSON', { virtuals: true });
activitySchema.set('toObject', { virtuals: true });

export const Activity = mongoose.model<IActivity>('Activity', activitySchema);
