import mongoose, { Schema } from 'mongoose';

const StudentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, index: true },
  enrollmentNo: { type: String, required: true, unique: true, index: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  grade: { type: String, required: true }, // e.g. A, B, Freshman, Sophomore
  department: { type: String, required: true }, // e.g. CSE, ECE
  semester: { type: Number, required: true, default: 1 },
  parentName: { type: String, required: true },
  parentPhone: { type: String, required: true },
  address: { type: String, required: true },
  avatarUrl: { type: String, default: '' },
  enrolledCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  isDeleted: { type: Boolean, default: false, index: true }, // Soft delete flag
  academicHistory: [
    {
      school: String,
      board: String,
      percentage: Number,
      passingYear: Number
    }
  ],
  faceDescriptor: { type: [Number], default: [] },
  isFaceRegistered: { type: Boolean, default: false, index: true },
  faceRegisteredAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.Student || mongoose.model('Student', StudentSchema);
