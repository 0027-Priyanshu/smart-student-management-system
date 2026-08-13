import mongoose, { Schema } from 'mongoose';

const FacultySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, index: true },
  department: { type: String, required: true },
  designation: { type: String, required: true }, // e.g. Assistant Professor, HOD
  assignedCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  avatarUrl: { type: String, default: '' },
  isDeleted: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

export default mongoose.models.Faculty || mongoose.model('Faculty', FacultySchema);
