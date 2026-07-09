import mongoose, { Schema } from 'mongoose';

const LogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  userName: { type: String, required: true },
  role: { type: String, required: true },
  action: { type: String, required: true, index: true }, // e.g. Student Created, Attendance Marked
  details: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

export default mongoose.models.Log || mongoose.model('Log', LogSchema);
