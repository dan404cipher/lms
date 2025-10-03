import mongoose, { Schema, Document } from 'mongoose';

export interface IAssessmentSubmission extends Document {
  assessmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  submissionType: 'file' | 'text' | 'quiz';
  content?: string; // For text-based submissions
  files?: Array<{
    filename: string;
    originalName: string;
    url: string;
    size: number;
    mimeType: string;
  }>;
  answers?: Array<{
    questionId: string;
    answer: string | string[];
    isCorrect?: boolean;
    points?: number;
  }>; // For quiz submissions
  score?: number;
  maxScore: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'returned';
  submittedAt: Date;
  gradedAt?: Date;
  gradedBy?: mongoose.Types.ObjectId;
  isLate: boolean;
  attemptNumber: number;
  timeSpent?: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}

const assessmentSubmissionSchema = new Schema<IAssessmentSubmission>({
  assessmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Assessment',
    required: [true, 'Assessment ID is required'],
    index: true
  },
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required'],
    index: true
  },
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required'],
    index: true
  },
  submissionType: {
    type: String,
    enum: ['file', 'text', 'quiz'],
    required: [true, 'Submission type is required'],
    default: 'file'
  },
  content: {
    type: String,
    trim: true
  },
  files: [{
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
  }],
  answers: [{
    questionId: {
      type: String,
      required: true
    },
    answer: {
      type: Schema.Types.Mixed,
      required: true
    },
    isCorrect: {
      type: Boolean
    },
    points: {
      type: Number,
      min: 0
    }
  }],
  score: {
    type: Number,
    min: 0
  },
  maxScore: {
    type: Number,
    required: [true, 'Max score is required'],
    min: 1
  },
  feedback: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['submitted', 'graded', 'returned'],
    default: 'submitted'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  gradedAt: {
    type: Date
  },
  gradedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isLate: {
    type: Boolean,
    default: false
  },
  attemptNumber: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  timeSpent: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
assessmentSubmissionSchema.index({ assessmentId: 1, studentId: 1, attemptNumber: 1 }, { unique: true });
assessmentSubmissionSchema.index({ courseId: 1, studentId: 1, submittedAt: -1 });
assessmentSubmissionSchema.index({ assessmentId: 1, status: 1 });
assessmentSubmissionSchema.index({ studentId: 1, status: 1 });

// Virtual for calculating late submission
assessmentSubmissionSchema.virtual('isLateSubmission').get(function() {
  if (!this.submittedAt) return false;
  
  // Get the assessment to check due date
  return this.assessmentId && this.submittedAt > (this.assessmentId as any).dueDate;
});

// Pre-save middleware to set isLate flag
assessmentSubmissionSchema.pre('save', async function(next) {
  if (this.isModified('submittedAt') || this.isNew) {
    try {
      const Assessment = mongoose.model('Assessment');
      const assessment = await Assessment.findById(this.assessmentId);
      if (assessment) {
        this.isLate = this.submittedAt > assessment.dueDate;
      }
    } catch (error) {
      console.error('Error checking due date:', error);
    }
  }
  next();
});

// Ensure virtual fields are serialized
assessmentSubmissionSchema.set('toJSON', { virtuals: true });
assessmentSubmissionSchema.set('toObject', { virtuals: true });

export const AssessmentSubmission = mongoose.model<IAssessmentSubmission>('AssessmentSubmission', assessmentSubmissionSchema);
