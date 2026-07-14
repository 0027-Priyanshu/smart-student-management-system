import mongoose, { Schema } from 'mongoose';

const AttendanceSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  date: { type: String, required: true, index: true }, // Format YYYY-MM-DD for easy lookup
  status: { 
    type: String, 
    enum: ['Present', 'Absent', 'On Leave', 'Excused'], 
    default: 'Present' 
  },
  markedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Ensure unique entry per student, course and date
AttendanceSchema.index({ studentId: 1, courseId: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
