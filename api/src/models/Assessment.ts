import mongoose, { Schema, Document } from 'mongoose';

export interface IAssessment extends Document {
  courseId: mongoose.Types.ObjectId;
  instructorId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: 'quiz' | 'assignment' | 'exam';
  dueDate: Date;
  totalPoints: number;
  instructions?: string;
  timeLimit?: number; // in minutes
  isPublished: boolean;
  attachments?: Array<{
    filename: string;
    originalName: string;
    url: string;
    size: number;
    mimeType: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const assessmentSchema = new Schema<IAssessment>({
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required']
  },
  instructorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Instructor ID is required']
  },
  title: {
    type: String,
    required: [true, 'Assessment title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Assessment description is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['quiz', 'assignment', 'exam'],
    required: [true, 'Assessment type is required'],
    default: 'quiz'
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  totalPoints: {
    type: Number,
    required: [true, 'Total points is required'],
    min: [1, 'Total points must be at least 1'],
    default: 100
  },
  instructions: {
    type: String,
    trim: true
  },
  timeLimit: {
    type: Number,
    min: [1, 'Time limit must be at least 1 minute']
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true
});

// Indexes
assessmentSchema.index({ courseId: 1, type: 1 });
assessmentSchema.index({ instructorId: 1, createdAt: -1 });
assessmentSchema.index({ dueDate: 1 });
assessmentSchema.index({ isPublished: 1 });

// Virtual for checking if assessment is overdue
assessmentSchema.virtual('isOverdue').get(function() {
  return new Date() > this.dueDate;
});

// Virtual for checking if assessment is upcoming
assessmentSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return this.dueDate > now && this.dueDate <= oneWeekFromNow;
});

assessmentSchema.set('toJSON', { virtuals: true });
assessmentSchema.set('toObject', { virtuals: true });

export const Assessment = mongoose.model<IAssessment>('Assessment', assessmentSchema);
