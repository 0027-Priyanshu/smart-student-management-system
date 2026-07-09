import mongoose, { Schema } from 'mongoose';

const ResultSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  semester: { type: Number, required: true, index: true },
  internal: { type: Number, required: true, default: 0 },    // Out of 20
  external: { type: Number, required: true, default: 0 },    // Out of 50
  assignment: { type: Number, required: true, default: 0 },  // Out of 15
  practical: { type: Number, required: true, default: 0 },   // Out of 15
  grade: { type: String, required: true, default: 'F' },     // A+, A, B, C, F, etc.
  gpa: { type: Number, required: true, default: 0.0 },       // Point value e.g. 4.0
  markedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

// Ensure unique entry per student, course and semester
ResultSchema.index({ studentId: 1, courseId: 1, semester: 1 }, { unique: true });

export default mongoose.models.Result || mongoose.model('Result', ResultSchema);
