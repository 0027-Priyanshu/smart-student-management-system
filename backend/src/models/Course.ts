import mongoose, { Schema } from 'mongoose';

const CourseSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, uppercase: true, index: true },
  description: { type: String, required: true },
  credits: { type: Number, required: true, default: 3 },
  semester: { type: Number, required: true, default: 1 },
  department: { type: String, required: true },
  capacity: { type: Number, required: true, default: 40 },
  prerequisites: [{ type: String }], // Array of Course Codes or IDs
  isDeleted: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

export default mongoose.models.Course || mongoose.model('Course', CourseSchema);
