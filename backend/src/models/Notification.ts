import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  eventKey: string;
  title: string;
  message: string;
  complaintId: mongoose.Types.ObjectId;
  readAt?: Date | null;
  createdAt: Date;
}

const schema = new Schema<INotification>({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  eventKey: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', required: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ recipient: 1, eventKey: 1 }, { unique: true });
schema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', schema);
