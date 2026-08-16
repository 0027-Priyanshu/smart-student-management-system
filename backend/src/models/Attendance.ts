import mongoose, { Schema } from 'mongoose';

const AttendanceSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  date: { type: String, required: true, index: true }, // Format YYYY-MM-DD for easy lookup
  sessionId: { type: String, default: null, index: true }, // Dynamic session token for Face/QR/Lecture sessions
  status: { 
    type: String, 
    enum: ['Present', 'Absent', 'On Leave', 'Excused'], 
    default: 'Present' 
  },
  attendanceMethod: {
    type: String,
    enum: ['MANUAL', 'QR', 'FACE'],
    default: 'MANUAL',
    index: true
  },
  recognitionConfidence: { type: Number },
  lectureTitle: { type: String, default: '' },
  markedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Compound index for fast queries by student, course and date
AttendanceSchema.index({ studentId: 1, courseId: 1, date: 1 });

// Enforce strict uniqueness per session (prevents duplicate check-in for the same session)
AttendanceSchema.index({ studentId: 1, sessionId: 1 }, { unique: true, sparse: true });

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
