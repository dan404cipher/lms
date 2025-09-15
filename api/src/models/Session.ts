import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  courseId: mongoose.Types.ObjectId;
  instructorId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  scheduledAt: Date;
  duration: number; // in minutes
  zoomMeetingId?: string;
  joinUrl?: string;
  startUrl?: string;
  recordingUrl?: string;
  type?: 'live-class' | 'quiz' | 'assignment' | 'discussion' | 'residency';
  hasRecording?: boolean;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  maxParticipants?: number;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  endTime: Date; // Virtual property
  isLive: boolean; // Virtual property
}

const sessionSchema = new Schema<ISession>({
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
    required: [true, 'Session title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  scheduledAt: {
    type: Date,
    required: [true, 'Scheduled date is required']
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [15, 'Duration must be at least 15 minutes'],
    max: [480, 'Duration cannot exceed 8 hours']
  },
  zoomMeetingId: String,
  joinUrl: String,
  startUrl: String,
  recordingUrl: String,
  type: {
    type: String,
    enum: ['live-class', 'quiz', 'assignment', 'discussion', 'residency']
  },
  hasRecording: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  maxParticipants: {
    type: Number,
    min: [1, 'Max participants must be at least 1']
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
sessionSchema.index({ courseId: 1, scheduledAt: 1 });
sessionSchema.index({ instructorId: 1, scheduledAt: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ scheduledAt: 1 });

// Virtual for session end time
sessionSchema.virtual('endTime').get(function() {
  try {
    if (!this.scheduledAt || !this.duration || !(this.scheduledAt instanceof Date)) {
      return null;
    }
    return new Date(this.scheduledAt.getTime() + this.duration * 60000);
  } catch (error) {
    console.warn('Error calculating endTime for session:', this._id, error);
    return null;
  }
});

// Virtual for checking if session is currently live
sessionSchema.virtual('isLive').get(function() {
  try {
    if (!this.scheduledAt || !this.endTime || !(this.scheduledAt instanceof Date)) {
      return false;
    }
    const now = new Date();
    return now >= this.scheduledAt && now <= this.endTime;
  } catch (error) {
    console.warn('Error calculating isLive for session:', this._id, error);
    return false;
  }
});

// Ensure virtuals are serialized
sessionSchema.set('toJSON', { virtuals: true });
sessionSchema.set('toObject', { virtuals: true });

export const Session = mongoose.model<ISession>('Session', sessionSchema);
