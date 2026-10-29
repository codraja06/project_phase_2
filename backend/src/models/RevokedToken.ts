import { Schema, model } from 'mongoose';

// Persist only a one-way fingerprint, never the bearer credential itself.
const schema = new Schema({
  _id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RevokedToken = model('RevokedToken', schema);
