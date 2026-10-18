import dotenv from 'dotenv';
import path from 'path';
import { randomBytes } from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('Set JWT_SECRET to at least 32 random characters in production.');
}

function boundedNumber(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isFinite(value) || value < min || value > max || !Number.isInteger(value) && name.startsWith('OTP_')) throw new Error(`Invalid ${name} configuration.`);
  return value;
}

export const env = {
  OTP_EXPIRY_MINUTES: boundedNumber('OTP_EXPIRY_MINUTES', 5, 5, 5),
  OTP_RESEND_COOLDOWN_SECONDS: boundedNumber('OTP_RESEND_COOLDOWN_SECONDS', 60, 60, 3600),
  OTP_MAX_ATTEMPTS: boundedNumber('OTP_MAX_ATTEMPTS', 5, 1, 5),
  OTP_HOURLY_LIMIT: boundedNumber('OTP_HOURLY_LIMIT', 5, 1, 10),
  OTP_HASH_SECRET: process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || '',
  OTP_REQUIRE_PHONE: process.env.OTP_REQUIRE_PHONE === 'true',
  SMTP_HOST: process.env.SMTP_HOST || '', SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || '', SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || '',
  SMS_PROVIDER: process.env.SMS_PROVIDER || '',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '', TWILIO_FROM: process.env.TWILIO_FROM || '',
  DELIVERY_WORKER_ENABLED: process.env.DELIVERY_WORKER_ENABLED !== 'false',
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civic_issue_db',
  JWT_SECRET: process.env.JWT_SECRET || randomBytes(48).toString('hex'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || (process.env.AI_SERVICE_HOSTPORT ? `http://${process.env.AI_SERVICE_HOSTPORT}` : 'http://127.0.0.1:8000'),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
  CHAT_PROVIDER_URL: process.env.CHAT_PROVIDER_URL || '',
  CHAT_PROVIDER_API_KEY: process.env.CHAT_PROVIDER_API_KEY || '',
  CHAT_PROVIDER_MODEL: process.env.CHAT_PROVIDER_MODEL || '',
  DUPLICATE_RADIUS_METERS: Number(process.env.DUPLICATE_RADIUS_METERS || 120),
  DUPLICATE_LOOKBACK_DAYS: Number(process.env.DUPLICATE_LOOKBACK_DAYS || 30),
  DUPLICATE_MAX_HASH_DISTANCE: boundedNumber('DUPLICATE_MAX_HASH_DISTANCE', 10, 0, 64),
  DUPLICATE_MIN_COLOR_SIMILARITY: boundedNumber('DUPLICATE_MIN_COLOR_SIMILARITY', .85, 0, 1),
  HOTSPOT_CELL_DEGREES: boundedNumber('HOTSPOT_CELL_DEGREES', .01, .001, 1),
  HOTSPOT_WINDOW_DAYS: boundedNumber('HOTSPOT_WINDOW_DAYS', 30, 1, 3650),
  RESOLUTION_TARGET_HOURS: process.env.RESOLUTION_TARGET_HOURS ? Number(process.env.RESOLUTION_TARGET_HOURS) : null,
  // Set this to your machine's LAN IP so local image URLs are accessible from physical devices
  // Example: BACKEND_PUBLIC_URL=http://192.168.1.105:5000
  BACKEND_PUBLIC_URL: process.env.BACKEND_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'http://127.0.0.1:5000',
};
