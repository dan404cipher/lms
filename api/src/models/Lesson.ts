import mongoose, { Document, Schema } from 'mongoose';

export interface ILesson extends Document {
  moduleId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  order: number;
  isPublished: boolean;
  isFree: boolean;
  files: {
    _id: string;
    name: string;
    url: string;
    type: string;
    size: number;
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
  files: [{
    _id: {
      type: String,
      required: true
    },
    name: {
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
      required: true
    },
    size: {
      type: Number,
      required: true
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
lessonSchema.index({ moduleId: 1, order: 1 });
lessonSchema.index({ moduleId: 1, isPublished: 1 });

// Ensure unique order within a module
lessonSchema.index({ moduleId: 1, order: 1 }, { unique: true });

export const Lesson = mongoose.model<ILesson>('Lesson', lessonSchema);
