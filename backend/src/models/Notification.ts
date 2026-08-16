import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  studentId: mongoose.Types.ObjectId;
  sessionId?: string;
  courseId?: mongoose.Types.ObjectId;
  courseName?: string;
  lectureTitle?: string;
  title: string;
  message: string;
  type: 'FACE_ATTENDANCE' | 'QR_ATTENDANCE' | 'ALERT' | 'GENERAL';
  durationMinutes?: number;
  expiresAt?: Date;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  sessionId: { type: String, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
  courseName: { type: String },
  lectureTitle: { type: String },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['FACE_ATTENDANCE', 'QR_ATTENDANCE', 'ALERT', 'GENERAL'], default: 'FACE_ATTENDANCE' },
  durationMinutes: { type: Number },
  expiresAt: { type: Date },
  isRead: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

export default mongoose.model<INotification>('Notification', NotificationSchema);
