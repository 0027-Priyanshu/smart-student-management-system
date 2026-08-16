import mongoose, { Schema, Document } from 'mongoose';

export interface IFaceAttendanceSession extends Document {
  sessionId: string;
  courseId: mongoose.Types.ObjectId;
  courseName: string;
  lectureTitle: string;
  facultyId: mongoose.Types.ObjectId;
  facultyName: string;
  durationMinutes: number;
  startTime: Date;
  expiresAt: Date;
  status: 'ACTIVE' | 'CLOSED';
  verifiedStudents: Array<{
    studentId: mongoose.Types.ObjectId;
    studentName: string;
    enrollmentNo: string;
    timestamp: Date;
    confidence: number;
  }>;
  createdAt: Date;
}

const FaceAttendanceSessionSchema = new Schema<IFaceAttendanceSession>({
  sessionId: { type: String, required: true, unique: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  courseName: { type: String, required: true },
  lectureTitle: { type: String, required: true },
  facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  facultyName: { type: String, required: true },
  durationMinutes: { type: Number, default: 10 },
  startTime: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ['ACTIVE', 'CLOSED'], default: 'ACTIVE', index: true },
  verifiedStudents: [
    {
      studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
      studentName: { type: String, required: true },
      enrollmentNo: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      confidence: { type: Number, default: 90 }
    }
  ],
  createdAt: { type: Date, default: Date.now, index: true }
});

export default mongoose.model<IFaceAttendanceSession>('FaceAttendanceSession', FaceAttendanceSessionSchema);
