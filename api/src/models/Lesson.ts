import mongoose, { Document, Schema } from 'mongoose';

export interface ILesson extends Document {
  moduleId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  contentType: 'video' | 'pdf' | 'scorm' | 'html' | 'quiz' | 'assignment';
  content: {
    videoUrl?: string;
    pdfUrl?: string;
    scormUrl?: string;
    htmlContent?: string;
    quizId?: mongoose.Types.ObjectId;
    assignmentId?: mongoose.Types.ObjectId;
  };
  duration: number; // in minutes
  order: number;
  isPublished: boolean;
  isFree: boolean;
  resources: {
    title: string;
    url: string;
    type: 'pdf' | 'video' | 'link' | 'download';
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const lessonSchema = new Schema<ILesson>({
  moduleId: {
    type: Schema.Types.ObjectId,
    ref: 'Module',
    required: [true, 'Module ID is required']
  },
  title: {
    type: String,
    required: [true, 'Lesson title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  contentType: {
    type: String,
    enum: ['video', 'pdf', 'scorm', 'html', 'quiz', 'assignment'],
    required: [true, 'Content type is required']
  },
  content: {
    videoUrl: String,
    pdfUrl: String,
    scormUrl: String,
    htmlContent: String,
    quizId: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz'
    },
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment'
    }
  },
  duration: {
    type: Number,
    default: 0,
    min: [0, 'Duration cannot be negative']
  },
  order: {
    type: Number,
    required: [true, 'Lesson order is required'],
    min: [1, 'Order must be at least 1']
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isFree: {
    type: Boolean,
    default: false
  },
  resources: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['pdf', 'video', 'link', 'download'],
      required: true
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
lessonSchema.index({ moduleId: 1, order: 1 });
lessonSchema.index({ moduleId: 1, isPublished: 1 });
lessonSchema.index({ contentType: 1 });

// Ensure unique order within a module
lessonSchema.index({ moduleId: 1, order: 1 }, { unique: true });

export const Lesson = mongoose.model<ILesson>('Lesson', lessonSchema);
