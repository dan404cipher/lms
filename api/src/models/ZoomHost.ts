import mongoose, { Document, Schema } from 'mongoose';

/**
 * ZoomHost Model
 * Manages multiple Zoom Pro accounts for concurrent meeting support
 * Each instructor can be assigned to a specific Zoom host account
 */
export interface IZoomHost extends Document {
  email: string; // Zoom Pro account email
  displayName: string; // Friendly name for this Zoom account
  accountId?: string; // Zoom account ID (if using different Zoom accounts)
  isActive: boolean; // Whether this host is currently available
  isPrimary: boolean; // Primary/default host
  maxConcurrentMeetings: number; // Usually 1 for standard Zoom Pro, can be higher for Zoom Webinar
  priority: number; // Priority for host assignment (higher = preferred)
  currentMeetings: number; // Track current active meetings
  metadata: {
    lastUsed?: Date;
    totalMeetingsHosted?: number;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  canHostMeeting(): boolean;
  incrementMeetings(): Promise<void>;
  decrementMeetings(): Promise<void>;
}

const zoomHostSchema = new Schema<IZoomHost>({
  email: {
    type: String,
    required: [true, 'Zoom host email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true
  },
  accountId: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  maxConcurrentMeetings: {
    type: Number,
    default: 1, // Standard Zoom Pro can host 1 meeting at a time
    min: [1, 'Must allow at least 1 concurrent meeting']
  },
  priority: {
    type: Number,
    default: 50, // 0-100, higher = more preferred
    min: 0,
    max: 100
  },
  currentMeetings: {
    type: Number,
    default: 0,
    min: 0
  },
  metadata: {
    lastUsed: Date,
    totalMeetingsHosted: {
      type: Number,
      default: 0
    },
    notes: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
zoomHostSchema.index({ email: 1 });
zoomHostSchema.index({ isActive: 1, priority: -1 });
zoomHostSchema.index({ isPrimary: -1 });

// Methods
zoomHostSchema.methods.canHostMeeting = function(): boolean {
  return this.isActive && this.currentMeetings < this.maxConcurrentMeetings;
};

zoomHostSchema.methods.incrementMeetings = async function() {
  this.currentMeetings += 1;
  this.metadata.lastUsed = new Date();
  this.metadata.totalMeetingsHosted = (this.metadata.totalMeetingsHosted || 0) + 1;
  await this.save();
};

zoomHostSchema.methods.decrementMeetings = async function() {
  this.currentMeetings = Math.max(0, this.currentMeetings - 1);
  await this.save();
};

export const ZoomHost = mongoose.model<IZoomHost>('ZoomHost', zoomHostSchema);

