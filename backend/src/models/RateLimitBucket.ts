import { Schema, model } from 'mongoose';
const schema = new Schema({ _id: String, hits: { type: Number, default: 0 }, resetAt: Date, expiresAt: Date }, { versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RateLimitBucket = model('RateLimitBucket', schema);
