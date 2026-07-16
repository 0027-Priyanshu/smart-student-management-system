import mongoose, { Schema, Document } from 'mongoose';

export interface IActivity extends Document {
  title: string;
  date: string;
  type: 'Exam' | 'Assignment' | 'Notice';
  description?: string;
  targetCourseId?: mongoose.Types.ObjectId; // If null, it's global
  createdAt: Date;
}

const ActivitySchema = new Schema({
  title: { type: String, required: true },
  date: { type: String, required: true }, // Format YYYY-MM-DD or readable string
  type: { type: String, enum: ['Exam', 'Assignment', 'Notice'], required: true },
  description: { type: String },
  targetCourseId: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);
