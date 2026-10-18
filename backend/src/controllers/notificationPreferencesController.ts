import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../utils/apiResponse';

export async function saveNotificationPreferences(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = z.object({ email: z.boolean(), sms: z.boolean() }).parse(req.body);
    req.user!.notificationPreferences = { ...input, smsConsentedAt: input.sms ? req.user!.notificationPreferences?.smsConsentedAt || new Date() : null };
    await req.user!.save();
    res.json(new ApiResponse('Notification preferences saved', req.user));
  } catch (error) { next(error); }
}
