import { Schema, model } from 'mongoose';

const schema = new Schema({
  _id: { type: String, required: true },
  contactKey: { type: String, required: true, unique: true },
  name: { type: String, required: true }, email: { type: String, required: true },
  phone: { type: String, required: true }, passwordHash: { type: String, required: true, select: false },
  emailCodeHash: { type: String, select: false }, smsCodeHash: { type: String, select: false },
  emailAttempts: { type: Number, default: 0 }, smsAttempts: { type: Number, default: 0 },
  emailVerifiedAt: { type: Date, default: null }, phoneVerifiedAt: { type: Date, default: null },
  emailDelivery: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  emailProviderId: { type: String, select: false }, smsProviderId: { type: String, select: false },
  smsDelivery: { type: String, enum: ['not_configured', 'sent', 'failed'], default: 'not_configured' },
  requirePhone: { type: Boolean, default: false },
  otpExpiresAt: { type: Date, required: true }, expiresAt: { type: Date, required: true },
  resendAvailableAt: { type: Date, required: true },
  completionClaim: { type: String, select: false }, completionClaimedAt: Date,
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const SignupChallenge = model('SignupChallenge', schema);

const throttle = new Schema({
  _id: String, windowStartedAt: Date, requestCount: Number, nextRequestAt: Date, expiresAt: Date,
}, { versionKey: false });
throttle.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const SignupThrottle = model('SignupThrottle', throttle);
