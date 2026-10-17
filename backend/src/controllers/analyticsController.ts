import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { analyticsQuery, complaintAnalytics } from '../services/analyticsService';
import { ApiResponse } from '../utils/apiResponse';

export const getAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await complaintAnalytics(analyticsQuery.parse(req.query));
    res.json(new ApiResponse('Complaint analytics retrieved', data));
  } catch (error) { next(error); }
};
