import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'enrollment' | 'course_update' | 'session_reminder' | 'message' | 'completion' | 'system';
  title: string;
  message: string;
  payload: Record<string, any>;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  type: {
    type: String,
    enum: ['enrollment', 'course_update', 'session_reminder', 'message', 'completion', 'system'],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  payload: {
    type: Schema.Types.Mixed,
    default: {}
  },
  readAt: Date
}, {
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });
notificationSchema.index({ userId: 1, type: 1 });

// Virtual for checking if notification is read
notificationSchema.virtual('isRead').get(function() {
  return !!this.readAt;
});

// Ensure virtuals are serialized
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
