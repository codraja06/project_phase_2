import rateLimit from 'express-rate-limit';
import { MongoRateLimitStore } from '../services/mongoRateLimitStore';
import { env } from '../config/env';

export const sharedRateLimitStore = (prefix: string) => env.RATE_LIMIT_STORE === 'mongo' ? new MongoRateLimitStore(prefix) : undefined;

export const signupRequestLimiter = rateLimit({ windowMs: 3600000, max: 60, standardHeaders: true, legacyHeaders: false,
  store: sharedRateLimitStore('signup-request'),
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many verification requests. Please try again later.' } });
export const signupVerifyLimiter = rateLimit({ windowMs: 3600000, max: 300, standardHeaders: true, legacyHeaders: false,
  store: sharedRateLimitStore('signup-verify'),
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many verification attempts. Please try again later.' } });

export const apiRateLimiter = rateLimit({
  store: sharedRateLimitStore('api'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

export const authRateLimiter = rateLimit({
  store: sharedRateLimitStore('auth'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 login/register requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});
