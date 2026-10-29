import { Request, Response, NextFunction } from 'express';
import { randomBytes, randomInt, createHmac, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { SignupChallenge, SignupThrottle } from '../models/SignupChallenge';
import { User } from '../models/User';
import { env } from '../config/env';
import { registerSchema } from '../validators/authValidator';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { generateToken } from '../utils/jwt';
import * as delivery from '../services/contactDeliveryService';
import { verificationEmailTemplate } from '../services/verificationEmailTemplate';

export const normalizePhone = (phone: string) => (phone.trim().startsWith('+') ? '+' : '') + phone.replace(/\D/g, '');
const key = (value: string) => createHmac('sha256', env.OTP_HASH_SECRET || env.JWT_SECRET).update(value).digest('hex');
const digest = (id: string, channel: string, otp: string) => key(`${id}:${channel}:${otp}`);
const idSchema = z.string().regex(/^[a-f0-9]{64}$/);
const invalidCode = () => new ApiError(400, 'The code is invalid, expired, already used, or has too many attempts. Request a new code if needed.');
const existingEmail = () => new ApiError(400,
  'Your email is verified. An account already exists with this email. Go to sign in to access it, or use a different email to create a new account.',
  [{ field: 'email', code: 'SIGN_IN_REQUIRED' }]);

export const getSignupOptions = (_req: Request, res: Response) => {
  res.json(new ApiResponse('Registration verification availability', {
    emailAvailable: delivery.emailConfigured(), smsAvailable: delivery.smsConfigured(),
    phoneVerificationRequired: env.OTP_REQUIRE_PHONE,
  }));
};

async function consumeQuota(value: string) {
  const now = new Date(), contactKey = key(value), hourAgo = new Date(now.getTime() - 3600000);
  try { await SignupThrottle.updateOne({ _id: contactKey }, { $setOnInsert: {
    windowStartedAt: now, requestCount: 0, nextRequestAt: new Date(0), expiresAt: new Date(now.getTime() + 7200000),
  } }, { upsert: true }); } catch (error: any) { if (error.code !== 11000) throw error; }
  const reset = { $lte: ['$windowStartedAt', hourAgo] };
  const claimed = await SignupThrottle.findOneAndUpdate({ _id: contactKey, nextRequestAt: { $lte: now },
    $or: [{ windowStartedAt: { $lte: hourAgo } }, { requestCount: { $lt: env.OTP_HOURLY_LIMIT } }] }, [{ $set: {
      windowStartedAt: { $cond: [reset, now, '$windowStartedAt'] },
      requestCount: { $cond: [reset, 1, { $add: ['$requestCount', 1] }] },
      nextRequestAt: new Date(now.getTime() + env.OTP_RESEND_COOLDOWN_SECONDS * 1000), expiresAt: new Date(now.getTime() + 7200000),
    } }], { new: true });
  if (!claimed) throw new ApiError(429, 'Please wait at least 60 seconds before resending. The hourly verification request limit may also apply.');
}

async function issue(input: { name: string; email: string; phone: string; passwordHash: string }) {
  if (!delivery.emailConfigured()) throw new ApiError(503, 'Email verification is not configured. Enter real SMTP_HOST, SMTP_USER, SMTP_PASS and EMAIL_FROM values in backend/.env; example placeholders cannot send codes.', [], true);
  if (env.OTP_REQUIRE_PHONE && !delivery.smsConfigured()) throw new ApiError(503, 'Required SMS verification is not configured. Ask the administrator to configure Twilio.', [], true);
  const phone = normalizePhone(input.phone);
  if (delivery.smsConfigured() && !/^\+[1-9]\d{7,14}$/.test(phone)) throw new ApiError(400, 'Include the international country code, for example +91, for SMS verification.');
  await consumeQuota(`email:${input.email}`);
  if (delivery.smsConfigured()) await consumeQuota(`phone:${phone.replace(/\D/g, '')}`);
  const id = randomBytes(32).toString('hex'), emailOtp = String(randomInt(0, 1000000)).padStart(6, '0');
  const smsOtp = String(randomInt(0, 1000000)).padStart(6, '0');
  const now = new Date(), otpExpiresAt = new Date(now.getTime() + env.OTP_EXPIRY_MINUTES * 60000);
  // The persistent cooldown admits one issuer at a time for each email. Old codes die before sending.
  await SignupChallenge.deleteMany({ contactKey: key(`email:${input.email}`) });
  const challenge = await SignupChallenge.create({ _id: id, contactKey: key(`email:${input.email}`), ...input, phone,
    emailCodeHash: digest(id, 'email', emailOtp), smsCodeHash: delivery.smsConfigured() ? digest(id, 'sms', smsOtp) : undefined,
    requirePhone: env.OTP_REQUIRE_PHONE, otpExpiresAt, expiresAt: new Date(now.getTime() + 900000),
    resendAvailableAt: new Date(now.getTime() + env.OTP_RESEND_COOLDOWN_SECONDS * 1000),
  });
  try {
    const email = verificationEmailTemplate(emailOtp, env.OTP_EXPIRY_MINUTES);
    challenge.emailProviderId = await delivery.sendEmail(input.email, email.subject, email.text, email.html, `signup-${id}`);
    challenge.emailDelivery = 'sent';
  } catch {
    await SignupChallenge.deleteOne({ _id: id });
    throw new ApiError(503, 'The verification email could not be sent. Check the email delivery configuration or try again after the resend cooldown.', [], true);
  }
  if (delivery.smsConfigured()) {
    try { challenge.smsProviderId = await delivery.sendSms(phone, `CivicTrack: Your phone verification code is ${smsOtp}. Expires in 5 minutes. Do not share it.`); challenge.smsDelivery = 'sent'; }
    catch { challenge.smsDelivery = 'failed'; challenge.smsCodeHash = undefined; }
  }
  await challenge.save();
  return { challengeId: id, expiresAt: otpExpiresAt, resendAvailableAt: challenge.resendAvailableAt,
    smsStatus: challenge.smsDelivery, phoneVerificationRequired: challenge.requirePhone };
}

export const requestSignupOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 10);
    // Do not disclose whether either contact already has an account; possession is checked first.
    res.status(202).json(new ApiResponse('Verification requested. Check your email. Account eligibility is checked after verification.', await issue({ name: input.name, email: input.email, phone: input.phone, passwordHash })));
  } catch (error) { next(error); }
};

export const resendSignupOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const challengeId = idSchema.parse(req.body.challengeId);
    const pending = await SignupChallenge.findOne({ _id: challengeId, expiresAt: { $gt: new Date() } }).select('+passwordHash');
    if (!pending) throw new ApiError(400, 'Verification session expired or unavailable. Start registration again.');
    const result = await issue({ name: pending.name!, email: pending.email!, phone: pending.phone!, passwordHash: pending.passwordHash! });
    res.status(202).json(new ApiResponse('A new verification email was accepted by the email provider. Older codes are invalid.', result));
  } catch (error) { next(error); }
};

export const verifySignupOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = z.object({ challengeId: idSchema, channel: z.enum(['email', 'sms']).default('email'), code: z.string().regex(/^\d{6}$/, 'Enter the six-digit verification code.') }).parse(req.body);
    const email = input.channel === 'email', attempts = email ? 'emailAttempts' : 'smsAttempts';
    const verified = email ? 'emailVerifiedAt' : 'phoneVerifiedAt', hashField = email ? 'emailCodeHash' : 'smsCodeHash';
    const pending = await SignupChallenge.findOneAndUpdate({ _id: input.challengeId, otpExpiresAt: { $gt: new Date() },
      [email ? 'emailProviderId' : 'smsProviderId']: { $type: 'string', $ne: '' },
      [email ? 'emailDelivery' : 'smsDelivery']: 'sent', [verified]: null, [attempts]: { $lt: env.OTP_MAX_ATTEMPTS } },
      { $inc: { [attempts]: 1 } }, { new: true }).select(`+${hashField}`);
    const stored = pending?.get(hashField);
    if (!pending || !stored || !/^[a-f0-9]{64}$/.test(stored) || !timingSafeEqual(Buffer.from(stored, 'hex'), Buffer.from(digest(input.challengeId, input.channel, input.code), 'hex'))) throw invalidCode();
    const consumed = await SignupChallenge.findOneAndUpdate({ _id: pending._id, [verified]: null, [hashField]: stored, otpExpiresAt: { $gt: new Date() } },
      { $set: { [verified]: new Date(), ...(email ? { expiresAt: new Date(Date.now() + 300000) } : {}) }, $unset: { [hashField]: 1 } }, { new: true });
    if (!consumed) throw invalidCode();
    res.json(new ApiResponse('Contact verified. Complete registration before the session expires.', {
      emailVerified: !!consumed.emailVerifiedAt, phoneVerified: !!consumed.phoneVerifiedAt,
    }));
  } catch (error) { next(error); }
};

export const completeSignup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const challengeId = idSchema.parse(req.body.challengeId);
    const eligible = { _id: challengeId, emailVerifiedAt: { $ne: null }, emailProviderId: { $type: 'string', $ne: '' }, expiresAt: { $gt: new Date() },
      $or: [{ requirePhone: false }, { phoneVerifiedAt: { $ne: null }, smsProviderId: { $type: 'string', $ne: '' } }] };
    const pending = await SignupChallenge.findOne(eligible).select('+passwordHash');
    if (!pending) throw new ApiError(400, 'This verification session is expired, already used, or was not delivered by a provider. Start registration again, or sign in if the account was already created.');
    const canonicalPhone = pending.phone!.replace(/\D/g, '');
    const legacyPhone = new RegExp(`^\\s*\\+?${canonicalPhone.split('').join('[\\s()-]*')}\\s*$`);
    // Email ownership is established before revealing an existing account to its owner.
    if (await User.exists({ email: pending.email })) throw existingEmail();
    if (await User.exists({ $or: [{ phoneNormalized: canonicalPhone }, { phone: legacyPhone }] })) {
      throw new ApiError(400, 'Registration cannot complete with these details. Sign in to your existing account or use different contact details.');
    }
    const claim = randomBytes(16).toString('hex');
    const claimed = await SignupChallenge.findOneAndUpdate({ ...eligible, $and: [{ $or: [{ completionClaimedAt: null }, { completionClaimedAt: { $lt: new Date(Date.now() - 120000) } }] }] },
      { $set: { completionClaim: claim, completionClaimedAt: new Date() } });
    if (!claimed) throw new ApiError(409, 'Registration is already being processed. Wait briefly, then try signing in.');
    const user = new User({ name: pending.name, email: pending.email, phone: pending.phone, password: pending.passwordHash,
      phoneNormalized: canonicalPhone, role: 'citizen', emailVerifiedAt: pending.emailVerifiedAt, phoneVerifiedAt: pending.phoneVerifiedAt });
    user.$locals.passwordIsHashed = true;
    try { await user.save(); }
    catch (error: any) {
      await SignupChallenge.updateOne({ _id: challengeId, completionClaim: claim }, { $unset: { completionClaim: 1, completionClaimedAt: 1 } });
      if (error.code === 11000) {
        if (await User.exists({ email: pending.email })) throw existingEmail();
        throw new ApiError(400, 'Registration cannot complete with these details. Sign in or use different contact details.');
      }
      throw error;
    }
    // A cleanup outage must not turn a successfully created account into a failed response.
    try { await SignupChallenge.deleteOne({ _id: challengeId, completionClaim: claim }); }
    catch { console.error('Completed registration cleanup is pending TTL expiry.'); }
    res.status(201).json(new ApiResponse('Registration completed. Your email is verified.', { user, token: generateToken({ userId: String(user._id), role: user.role }) }));
  } catch (error) { next(error); }
};
