import mongoose, { Schema } from 'mongoose';

const QrSessionSchema = new Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  courseName: { type: String, required: true },
  lectureTitle: { type: String, required: true },
  date: { type: String, required: true },
  facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  durationMinutes: { type: Number, default: 10 },
  status: { type: String, enum: ['ACTIVE', 'CLOSED', 'EXPIRED'], default: 'ACTIVE', index: true },
  scannedStudents: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.QrSession || mongoose.model('QrSession', QrSessionSchema);
