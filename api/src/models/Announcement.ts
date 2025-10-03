import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  courseId: mongoose.Types.ObjectId;
  instructorId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  isPublished: boolean;
  priority: 'low' | 'medium' | 'high';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>({
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
    required: [true, 'Announcement title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Announcement content is required'],
    trim: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
announcementSchema.index({ courseId: 1, createdAt: -1 });
announcementSchema.index({ instructorId: 1, createdAt: -1 });
announcementSchema.index({ isPublished: 1 });
announcementSchema.index({ priority: 1 });
announcementSchema.index({ expiresAt: 1 });

// Virtual for checking if announcement is active
announcementSchema.virtual('isActive').get(function() {
  if (!this.isPublished) return false;
  if (!this.expiresAt) return true;
  return new Date() < this.expiresAt;
});

// Virtual for checking if announcement is expired
announcementSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Virtual for checking if announcement is urgent
announcementSchema.virtual('isUrgent').get(function() {
  return this.priority === 'high' && this.isPublished && (!this.expiresAt || new Date() < this.expiresAt);
});

announcementSchema.set('toJSON', { virtuals: true });
announcementSchema.set('toObject', { virtuals: true });

export const Announcement = mongoose.model<IAnnouncement>('Announcement', announcementSchema);
