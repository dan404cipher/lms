import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  description: string;
  shortDescription: string;
  categoryId: mongoose.Types.ObjectId;
  instructorId: mongoose.Types.ObjectId;
  courseCode?: string;
  priceCredits: number;
  priceAmount?: number;
  published: boolean;
  thumbnail: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in minutes
  language: string;
  requirements: string[];
  learningOutcomes: string[];
  certificate: {
    enabled: boolean;
    template?: string;
  };
  settings: {
    allowEnrollment: boolean;
    maxStudents?: number;
    autoApproveEnrollment: boolean;
    allowChat: boolean;
    allowDiscussions: boolean;
  };
  stats: {
    enrollments: number;
    completions: number;
    averageRating: number;
    totalRatings: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  shortDescription: {
    type: String,
    required: [true, 'Short description is required'],
    maxlength: [200, 'Short description cannot be more than 200 characters']
  },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  instructorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Instructor is required']
  },
  courseCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Course code cannot be more than 20 characters']
  },
  priceCredits: {
    type: Number,
    required: [true, 'Price in credits is required'],
    min: [0, 'Price cannot be negative']
  },
  priceAmount: {
    type: Number,
    min: [0, 'Price amount cannot be negative']
  },
  published: {
    type: Boolean,
    default: false
  },
  thumbnail: {
    type: String,
    required: [true, 'Course thumbnail is required']
  },
  tags: [{
    type: String,
    trim: true
  }],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  duration: {
    type: Number,
    required: [true, 'Course duration is required'],
    min: [1, 'Duration must be at least 1 minute']
  },
  language: {
    type: String,
    default: 'en'
  },
  requirements: [{
    type: String,
    trim: true
  }],
  learningOutcomes: [{
    type: String,
    trim: true
  }],
  certificate: {
    enabled: {
      type: Boolean,
      default: true
    },
    template: String
  },
  settings: {
    allowEnrollment: {
      type: Boolean,
      default: true
    },
    maxStudents: {
      type: Number,
      min: [1, 'Max students must be at least 1']
    },
    autoApproveEnrollment: {
      type: Boolean,
      default: true
    },
    allowChat: {
      type: Boolean,
      default: true
    },
    allowDiscussions: {
      type: Boolean,
      default: true
    }
  },
  stats: {
    enrollments: {
      type: Number,
      default: 0
    },
    completions: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    totalRatings: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ categoryId: 1 });
courseSchema.index({ instructorId: 1 });
courseSchema.index({ published: 1 });
courseSchema.index({ difficulty: 1 });
courseSchema.index({ 'stats.averageRating': -1 });
courseSchema.index({ 'stats.enrollments': -1 });

// Virtual for completion rate
courseSchema.virtual('completionRate').get(function() {
  if (this.stats.enrollments === 0) return 0;
  return (this.stats.completions / this.stats.enrollments) * 100;
});

// Ensure virtuals are serialized
courseSchema.set('toJSON', { virtuals: true });
courseSchema.set('toObject', { virtuals: true });

export const Course = mongoose.model<ICourse>('Course', courseSchema);
