import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { env } from '../config/env';

// Only fixed route components and known error classes are logged. Never log
// query strings, record IDs, messages, stack traces, headers or request bodies.
const routeParts = new Set(['api', 'auth', 'signup', 'request-otp', 'resend-otp', 'verify-otp', 'complete', 'login', 'google', 'link', 'me', 'logout', 'profile', 'change-password', 'notification-preferences', 'complaints', 'my', 'status', 'authority', 'analytics', 'export', 'verify', 'ai', 'detect', 'models', 'uploads', 'image', 'chat', 'conversation', 'messages', 'management', 'duplicates', 'check', 'department', 'departments', 'hotspots', 'triage', 'completion', 'review', 'notifications', 'read']);
const errorNames = new Set(['Error', 'TypeError', 'RangeError', 'MongoServerError', 'MongoNetworkError', 'MongooseError', 'VersionError', 'AxiosError', 'ApiError', 'ZodError', 'CastError', 'MulterError', 'ValidationError']);
export function safeErrorDiagnostic(req: Request, error: any, statusCode: number) {
  const path = String(req.originalUrl || '').split('?')[0].split('/').filter(Boolean).slice(0, 12)
    .map(part => routeParts.has(part) ? part : ':value').join('/');
  const name = errorNames.has(error?.name) ? error.name : 'UnknownError';
  const code = Number.isInteger(error?.code) && error.code >= 0 && error.code <= 999999 ? ` code=${error.code}` : '';
  const method = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? req.method : 'REQUEST';
  return `[Error Handler] HTTP ${statusCode} ${method} /${path} ${name}${code}`;
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  if (err.name === 'ZodError') {
    statusCode = 400;
    errors = err.issues.map((issue: any) => ({ field: issue.path.join('.'), message: issue.message }));
    message = errors.map((issue: any) => issue.message).join(' ');
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid record identifier.';
  } else if (err.name === 'MulterError') {
    statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 10 MB or smaller.' : 'Invalid image upload.';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Database Validation Error';
    errors = Object.values(err.errors).map((e: any) => `${e.path}: validation failed.`);
  } else if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered.';
  }

  if (statusCode >= 500 && !err.safeToExpose) {
    message = 'The service could not complete this request. Please try again.';
    errors = [];
  }

  if (env.NODE_ENV !== 'test') {
    // Raw errors can contain request bodies, provider credentials or database connection strings.
    console.error(safeErrorDiagnostic(req, err, statusCode));
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};
