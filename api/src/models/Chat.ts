import mongoose, { Document, Schema } from 'mongoose';

export interface IChat extends Document {
  courseId?: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  toUserId?: mongoose.Types.ObjectId;
  message: string;
  type: 'text' | 'image' | 'file';
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>({
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course'
  },
  fromUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'From user ID is required']
  },
  toUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  readAt: Date
}, {
  timestamps: true
});

// Indexes for better query performance
chatSchema.index({ courseId: 1, createdAt: -1 });
chatSchema.index({ fromUserId: 1, toUserId: 1, createdAt: -1 });
chatSchema.index({ toUserId: 1, readAt: 1 });

// Virtual for checking if message is read
chatSchema.virtual('isRead').get(function() {
  return !!this.readAt;
});

// Ensure virtuals are serialized
chatSchema.set('toJSON', { virtuals: true });
chatSchema.set('toObject', { virtuals: true });

export const Chat = mongoose.model<IChat>('Chat', chatSchema);
