import { createHash } from 'crypto';
import { RevokedToken } from '../models/RevokedToken';
import { ApiError } from '../utils/apiError';
import { verifyToken } from '../utils/jwt';

export const tokenFingerprint = (token: string) => createHash('sha256').update(token).digest('hex');

export async function assertSessionActive(token: string) {
  if (await RevokedToken.exists({ _id: tokenFingerprint(token), expiresAt: { $gt: new Date() } })) {
    throw new ApiError(401, 'This session has ended. Please sign in again.');
  }
}

export async function revokeSession(token: string) {
  const payload = verifyToken(token);
  await RevokedToken.updateOne({ _id: tokenFingerprint(token) }, { $setOnInsert: {
    userId: payload.userId, expiresAt: new Date(payload.exp * 1000),
  } }, { upsert: true });
}
