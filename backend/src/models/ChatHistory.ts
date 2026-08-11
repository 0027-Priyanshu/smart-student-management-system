import mongoose, { Document, Schema } from 'mongoose';

export interface IChatHistory extends Document {
  userId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'model' | 'bot' | 'ai';
  content: string;
  createdAt: Date;
}

const chatHistorySchema = new Schema<IChatHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant', 'system', 'tool', 'model', 'bot', 'ai'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

export const ChatHistory = mongoose.model<IChatHistory>('ChatHistory', chatHistorySchema);
