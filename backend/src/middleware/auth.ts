import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { ApiError } from '../utils/apiError';
import { User, IUser } from '../models/User';
import { assertSessionActive } from '../services/sessionService';

export interface AuthRequest extends Request {
  user?: IUser;
  authToken?: string;
}

export const authenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];
    const decoded: JwtPayload = verifyToken(token);
    await assertSessionActive(token);

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new ApiError(401, 'User associated with this token no longer exists.');
    }
    if ((decoded.sessionVersion || 0) !== (user.sessionVersion || 0)) throw new ApiError(401, 'Your credentials changed. Please sign in again.');

    req.user = user;
    req.authToken = token;
    next();
  } catch (error: any) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(401, 'Invalid or expired authentication token.'));
    }
  }
};
