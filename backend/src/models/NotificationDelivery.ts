import { Schema, model } from 'mongoose';

const schema = new Schema({
  eventKey: { type: String, required: true, unique: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', required: true },
  notificationId: { type: Schema.Types.ObjectId, ref: 'Notification', required: true },
  channel: { type: String, enum: ['email', 'sms'], required: true },
  // Destination is checked again immediately before sending, never supplied by a client.
  status: { type: String, enum: ['Pending', 'Processing', 'Sent', 'Failed', 'Retry Scheduled', 'Skipped'], default: 'Pending' },
  attempts: { type: Number, default: 0 }, nextAttemptAt: { type: Date, default: Date.now },
  leaseUntil: Date, claimedBy: String, providerId: String, sentAt: Date, errorCode: String,
}, { timestamps: true });
schema.index({ status: 1, nextAttemptAt: 1 });
export const NotificationDelivery = model('NotificationDelivery', schema);
