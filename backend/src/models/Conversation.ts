import mongoose, { Schema } from 'mongoose';

const MessageSchema = new Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true, maxlength: 6000 },
  source: { type: String, enum: ['citizen', 'provider-guided', 'guide', 'application'], required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });
const ConversationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  messages: { type: [MessageSchema], default: [] },
}, { timestamps: true });
ConversationSchema.index({ userId: 1, updatedAt: -1 });
export const Conversation = mongoose.model('Conversation', ConversationSchema);
