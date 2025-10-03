import mongoose, { Schema, Document } from 'mongoose';

export interface IMaterial extends Document {
  courseId: mongoose.Types.ObjectId;
  instructorId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: 'pdf' | 'video' | 'document' | 'link';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number; // in bytes
  mimeType?: string;
  isPublished: boolean;
  downloads: number;
  createdAt: Date;
  updatedAt: Date;
}

const materialSchema = new Schema<IMaterial>({
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
    required: [true, 'Material title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Material description is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['pdf', 'video', 'document', 'link'],
    required: [true, 'Material type is required'],
    default: 'document'
  },
  fileUrl: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    trim: true
  },
  fileSize: {
    type: Number,
    min: [0, 'File size cannot be negative']
  },
  mimeType: {
    type: String,
    trim: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  downloads: {
    type: Number,
    default: 0,
    min: [0, 'Downloads cannot be negative']
  }
}, {
  timestamps: true
});

// Indexes
materialSchema.index({ courseId: 1, type: 1 });
materialSchema.index({ instructorId: 1, createdAt: -1 });
materialSchema.index({ isPublished: 1 });
materialSchema.index({ downloads: -1 });

// Virtual for file size in human readable format
materialSchema.virtual('fileSizeFormatted').get(function() {
  if (!this.fileSize) return null;
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(this.fileSize) / Math.log(1024));
  return Math.round(this.fileSize / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for checking if material is downloadable
materialSchema.virtual('isDownloadable').get(function() {
  return this.type !== 'link' && this.fileUrl;
});

materialSchema.set('toJSON', { virtuals: true });
materialSchema.set('toObject', { virtuals: true });

export const Material = mongoose.model<IMaterial>('Material', materialSchema);
