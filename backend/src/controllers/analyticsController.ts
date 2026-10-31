import { authorityScope } from '../services/authorityScope';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { analyticsQuery, complaintAnalytics } from '../services/analyticsService';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { exportAnalyticsCsv } from '../services/analyticsExportService';

export const getAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await complaintAnalytics(analyticsQuery.parse(req.query), authorityScope(req.user));
    res.json(new ApiResponse('Complaint analytics retrieved', data));
  } catch (error) { next(error); }
};

export const exportAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) throw new ApiError(403, 'Only administrators can export analytics.');
    const result = await exportAnalyticsCsv(analyticsQuery.parse(req.query));
    res.json(new ApiResponse('Power BI CSV ready', result));
  } catch (error) { next(error); }
};
