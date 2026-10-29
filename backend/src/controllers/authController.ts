import { Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { generateToken } from '../utils/jwt';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { revokeSession } from '../services/sessionService';
import { closeSessionConnections } from '../services/liveNotifications';
import { closeAccountConnections } from '../services/liveNotifications';
import bcrypt from 'bcryptjs';
import {
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/authValidator';

export { completeSignup as register } from './signupController';

export const login = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = loginSchema.parse(req.body);

    const user = await User.findOne({ email: validated.email });
    if (!user) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    const isMatch = await user.comparePassword(validated.password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    const token = generateToken({ userId: user._id.toString(), role: user.role, sessionVersion: user.sessionVersion });

    res.status(200).json(
      new ApiResponse('Login successful', {
        user,
        token,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token, nonce, role = 'citizen' } = req.body;
    if (!token || typeof token !== 'string') throw new ApiError(401, 'A verified Google ID token is required.');
    if (role !== 'citizen' && role !== 'authority') throw new ApiError(400, 'Invalid account role.');
    if (!env.GOOGLE_CLIENT_ID) throw new ApiError(503, 'Google sign-in is not configured. Please use email and password.', [], true);
    let identity;
    try {
      const ticket = await new OAuth2Client(env.GOOGLE_CLIENT_ID).verifyIdToken({ idToken: token, audience: env.GOOGLE_CLIENT_ID });
      identity = ticket.getPayload();
    } catch {
      throw new ApiError(401, 'Google authentication token verification failed.');
    }
    if (!identity?.email || !identity.email_verified || !identity.sub) throw new ApiError(401, 'A verified Google email is required.');
    if (nonce !== undefined && (typeof nonce !== 'string' || identity.nonce !== nonce)) {
      throw new ApiError(401, 'Google sign-in response could not be verified. Please try again.');
    }
    const email = identity.email.toLowerCase().trim();
    let user = await User.findOne({ email });
    if (!user && role === 'authority') throw new ApiError(403, 'Officer accounts must be provisioned by your administrator.');
    if (user && user.role !== role) throw new ApiError(403, 'Please use the login portal for your account role.');
    // Link existing accounts only after their password has established ownership.
    if (user && user.googleId !== identity.sub) throw new ApiError(401, 'Use email and password to sign in to this existing account.');
    if (!user) {
      user = await User.create({ name: identity.name || email.split('@')[0], email, role: 'citizen', googleId: identity.sub, avatar: identity.picture || '', emailVerifiedAt: new Date() });
    }

    if (!user.emailVerifiedAt) { user.emailVerifiedAt = new Date(); await user.save(); }
    const appToken = generateToken({ userId: user._id.toString(), role: user.role, sessionVersion: user.sessionVersion });

    res.status(200).json(
      new ApiResponse('Google authentication successful', {
        user,
        token: appToken,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const linkGoogle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new ApiError(401, 'Unauthorized');
    const { token, nonce } = req.body;
    if (!token || typeof token !== 'string') throw new ApiError(401, 'A verified Google ID token is required.');
    if (!env.GOOGLE_CLIENT_ID) throw new ApiError(503, 'Google sign-in is not configured.', [], true);

    let identity;
    try {
      const ticket = await new OAuth2Client(env.GOOGLE_CLIENT_ID).verifyIdToken({ idToken: token, audience: env.GOOGLE_CLIENT_ID });
      identity = ticket.getPayload();
    } catch {
      throw new ApiError(401, 'Google authentication token verification failed.');
    }
    if (!identity?.email || !identity.email_verified || !identity.sub) throw new ApiError(401, 'A verified Google email is required.');
    if (nonce !== undefined && (typeof nonce !== 'string' || identity.nonce !== nonce)) {
      throw new ApiError(401, 'Google sign-in response could not be verified. Please try again.');
    }
    if (identity.email.toLowerCase().trim() !== req.user.email) {
      throw new ApiError(403, 'Choose the Google account with the same email as your CivicTrack account.');
    }
    if (req.user.googleId && req.user.googleId !== identity.sub) {
      throw new ApiError(409, 'A different Google account is already linked.');
    }
    const linkedElsewhere = await User.exists({ googleId: identity.sub, _id: { $ne: req.user._id } });
    if (linkedElsewhere) throw new ApiError(409, 'This Google account is already linked to another user.');

    req.user.googleId = identity.sub;
    req.user.emailVerifiedAt = new Date();
    await req.user.save();
    res.status(200).json(new ApiResponse('Google account linked successfully', req.user));
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await revokeSession(req.authToken!);
    closeSessionConnections(req.authToken!);
    res.status(200).json(new ApiResponse('Logged out successfully', null));
  } catch (error) { next(error); }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }
    res.status(200).json(new ApiResponse('Current user retrieved', req.user));
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const validated = updateProfileSchema.parse(req.body);
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (validated.name) user.name = validated.name;
    if (validated.phone !== undefined && validated.phone !== user.phone) {
      const normalized = validated.phone.replace(/\D/g, '');
      if (!/^\d{8,15}$/.test(normalized)) throw new ApiError(400, 'Enter a valid phone number.');
      if (await User.exists({ _id: { $ne: user._id }, phoneNormalized: normalized })) throw new ApiError(400, 'These profile details cannot be saved.');
      user.phone = validated.phone; user.phoneNormalized = normalized; user.phoneVerifiedAt = null;
      user.notificationPreferences = { email: user.notificationPreferences?.email ?? true, sms: false, smsConsentedAt: null };
    }

    await user.save();

    res.status(200).json(new ApiResponse('Profile updated successfully', user));
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const validated = changePasswordSchema.parse(req.body);
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const isMatch = await user.comparePassword(validated.oldPassword);
    if (!isMatch) {
      throw new ApiError(400, 'Incorrect old password.');
    }

    const passwordHash = await bcrypt.hash(validated.newPassword, 10);
    const updated = await User.findOneAndUpdate({ _id: user._id, password: user.password,
      ...((user.sessionVersion || 0) ? { sessionVersion: user.sessionVersion } : { $or: [{ sessionVersion: 0 }, { sessionVersion: { $exists: false } }] }) },
      { $set: { password: passwordHash }, $inc: { sessionVersion: 1 } }, { new: true, runValidators: true });
    if (!updated) throw new ApiError(409, 'Credentials changed concurrently. Sign in again before retrying.');
    closeAccountConnections(String(updated._id));
    const token = generateToken({ userId: String(updated._id), role: updated.role, sessionVersion: updated.sessionVersion });
    res.status(200).json(new ApiResponse('Password changed successfully. Other sessions have ended.', { user: updated, token }));
  } catch (error) {
    next(error);
  }
};
