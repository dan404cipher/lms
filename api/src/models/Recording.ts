import mongoose, { Document, Schema } from 'mongoose';

export interface IRecording extends Document {
  sessionId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  zoomRecordingId: string;
  title: string;
  description?: string;
  recordingUrl: string;
  downloadUrl?: string;
  playUrl?: string;
  localFilePath?: string;
  duration: number; // in seconds
  fileSize: number; // in bytes
  recordedAt: Date;
  viewCount: number;
  isPublic: boolean;
  isProcessed: boolean;
  thumbnailUrl?: string;
  transcriptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const recordingSchema = new Schema<IRecording>({
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: 'Session',
    required: [true, 'Session ID is required']
  },
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required']
  },
  zoomRecordingId: {
    type: String,
    required: [true, 'Zoom recording ID is required'],
    unique: true
  },
  title: {
    type: String,
    required: [true, 'Recording title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  recordingUrl: {
    type: String,
    required: [true, 'Recording URL is required']
  },
  downloadUrl: {
    type: String
  },
  playUrl: {
    type: String
  },
  localFilePath: {
    type: String
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [0, 'Duration cannot be negative']
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative']
  },
  recordedAt: {
    type: Date,
    required: [true, 'Recorded date is required']
  },
  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'View count cannot be negative']
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isProcessed: {
    type: Boolean,
    default: false
  },
  thumbnailUrl: String,
  transcriptUrl: String
}, {
  timestamps: true
});

// Indexes for better query performance
recordingSchema.index({ sessionId: 1 });
recordingSchema.index({ courseId: 1 });
recordingSchema.index({ zoomRecordingId: 1 });
recordingSchema.index({ recordedAt: -1 });
recordingSchema.index({ isPublic: 1 });

// Virtual for formatted duration
recordingSchema.virtual('formattedDuration').get(function() {
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Virtual for formatted file size
recordingSchema.virtual('formattedFileSize').get(function() {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (this.fileSize === 0) return '0 B';
  const i = Math.floor(Math.log(this.fileSize) / Math.log(1024));
  return `${(this.fileSize / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
});

// Method to increment view count
recordingSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Static method to get popular recordings
recordingSchema.statics.getPopularRecordings = function(limit = 10) {
  return this.find({ isPublic: true })
    .sort({ viewCount: -1 })
    .limit(limit)
    .populate('courseId', 'title')
    .populate('sessionId', 'title type');
};

// Ensure virtuals are serialized
recordingSchema.set('toJSON', { virtuals: true });
recordingSchema.set('toObject', { virtuals: true });

export const Recording = mongoose.model<IRecording>('Recording', recordingSchema);
