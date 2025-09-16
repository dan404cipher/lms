import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemSettings extends Document {
  siteName: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  maxFileSize: number; // in MB
  allowedFileTypes: string[];
  emailNotifications: boolean;
  maxUsers: number;
  maxCourses: number;
  sessionTimeout: number; // in minutes
  backupFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  createdAt: Date;
  updatedAt: Date;
}

const systemSettingsSchema = new Schema<ISystemSettings>({
  siteName: {
    type: String,
    required: true,
    default: 'LMS Platform'
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  registrationEnabled: {
    type: Boolean,
    default: true
  },
  maxFileSize: {
    type: Number,
    default: 0, // No limit (0 means unlimited)
    min: 0
  },
  allowedFileTypes: [{
    type: String,
    trim: true
  }],
  emailNotifications: {
    type: Boolean,
    default: true
  },
  maxUsers: {
    type: Number,
    default: 1000,
    min: 1
  },
  maxCourses: {
    type: Number,
    default: 500,
    min: 1
  },
  sessionTimeout: {
    type: Number,
    default: 30, // 30 minutes
    min: 5,
    max: 1440 // 24 hours
  },
  backupFrequency: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    default: 'daily'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
systemSettingsSchema.index({}, { unique: true });

export default mongoose.model<ISystemSettings>('SystemSettings', systemSettingsSchema);
