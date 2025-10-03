import mongoose, { Document, Schema } from 'mongoose';

export interface IModule extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  order: number;
  isPublished: boolean;
  estimatedDuration: number; // in minutes
  objectives: string[];
  createdAt: Date;
  updatedAt: Date;
}

const moduleSchema = new Schema<IModule>({
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required']
  },
  title: {
    type: String,
    required: [true, 'Module title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  order: {
    type: Number,
    required: [true, 'Module order is required'],
    min: [1, 'Order must be at least 1']
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  estimatedDuration: {
    type: Number,
    default: 0,
    min: [0, 'Duration cannot be negative']
  },
  objectives: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
moduleSchema.index({ courseId: 1, order: 1 });
moduleSchema.index({ courseId: 1, isPublished: 1 });

// Ensure unique order within a course
moduleSchema.index({ courseId: 1, order: 1 }, { unique: true });

export const Module = mongoose.model<IModule>('Module', moduleSchema);
