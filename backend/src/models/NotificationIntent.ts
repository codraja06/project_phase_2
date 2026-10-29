import { Schema } from 'mongoose';

// Embedded in the complaint so the domain change and its notification intent commit together.
export const NotificationIntentSchema = new Schema({
  eventKey: { type: String, required: true },
  audience: { type: String, enum: ['owner', 'authorities'], default: 'owner' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  at: { type: Date, required: true },
  deliveredAt: { type: Date, default: null },
}, { _id: false });

export interface NotificationIntent {
  eventKey: string; audience: 'owner' | 'authorities'; title: string; message: string;
  at: Date; deliveredAt: Date | null;
}
