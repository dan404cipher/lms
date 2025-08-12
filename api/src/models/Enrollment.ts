import mongoose, { Document, Schema } from 'mongoose';

export interface IEnrollment extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  progress: {
    completedLessons: mongoose.Types.ObjectId[];
    currentLesson?: mongoose.Types.ObjectId;
    completionPercentage: number;
    timeSpent: number; // in minutes
    lastAccessedAt?: Date;
  };
  creditsPaid: number;
  enrolledAt: Date;
  completedAt?: Date;
  certificateUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required']
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  progress: {
    completedLessons: [{
      type: Schema.Types.ObjectId,
      ref: 'Lesson'
    }],
    currentLesson: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson'
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Completion percentage cannot be negative'],
      max: [100, 'Completion percentage cannot exceed 100']
    },
    timeSpent: {
      type: Number,
      default: 0,
      min: [0, 'Time spent cannot be negative']
    },
    lastAccessedAt: Date
  },
  creditsPaid: {
    type: Number,
    required: [true, 'Credits paid is required'],
    min: [0, 'Credits paid cannot be negative']
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  certificateUrl: String
}, {
  timestamps: true
});

// Indexes for better query performance
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
enrollmentSchema.index({ userId: 1, status: 1 });
enrollmentSchema.index({ courseId: 1, status: 1 });
enrollmentSchema.index({ enrolledAt: -1 });

// Virtual for calculating completion status
enrollmentSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

// Virtual for calculating time since enrollment
enrollmentSchema.virtual('daysSinceEnrollment').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.enrolledAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Ensure virtuals are serialized
enrollmentSchema.set('toJSON', { virtuals: true });
enrollmentSchema.set('toObject', { virtuals: true });

export const Enrollment = mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);
