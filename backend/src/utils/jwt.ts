import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { randomUUID } from 'crypto';

export interface JwtPayload {
  userId: string;
  role: 'citizen' | 'authority';
  sessionVersion?: number;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign({ ...payload, sessionVersion: payload.sessionVersion || 0 }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
    jwtid: randomUUID(),
    algorithm: 'HS256',
  });
};

export const verifyToken = (token: string): JwtPayload & { exp: number } => {
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof payload === 'string' || typeof payload.userId !== 'string' ||
      !['citizen', 'authority'].includes(payload.role) || !Number.isFinite(payload.exp)) {
    throw new Error('Invalid authentication claims');
  }
  return payload as JwtPayload & { exp: number };
};
