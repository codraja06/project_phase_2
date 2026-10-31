import { authorityScope } from '../services/authorityScope';
import { queueResolutionNotifications } from '../services/resolutionDeliveryService';
import { env } from '../config/env';
import { analyticsQuery, analyticsFilter } from '../services/analyticsService';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Complaint, ComplaintStatus } from '../models/Complaint';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { updateStatusSchema } from '../validators/complaintValidator';
import { withPriority, priorityScoreExpression } from '../services/triageService';
import { z } from 'zod';
import { attemptNotificationFlush, notificationIntent } from '../services/notificationOutboxService';

export const getAllComplaints = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scope = authorityScope(req.user);
    const { status, category, search, sortBy } = req.query;
    const priority = z.enum(['low', 'medium', 'high', 'all']).optional().parse(req.query.priority);
    const filter: any = {};

    if (typeof status === 'string' && status !== 'All' && status !== 'all') {
      const s = status.toString().toLowerCase().replace('_', ' ');
      if (s === 'pending') filter.status = 'Pending';
      else if (s === 'in progress' || s === 'in_progress') filter.status = 'In Progress';
      else if (s === 'resolved') filter.status = 'Resolved';
      else if (s === 'urgent' || s === 'high') { /* Legacy link: apply calculated priority below. */ }
      else filter.status = status;
    }
    if (typeof category === 'string' && category !== 'All' && category !== 'all') {
      filter.category = category;
    }
    if (search && typeof search === 'string') {
      const literalSearch = search.slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { complaintId: { $regex: literalSearch, $options: 'i' } },
        { title: { $regex: literalSearch, $options: 'i' } },
        { description: { $regex: literalSearch, $options: 'i' } },
        { address: { $regex: literalSearch, $options: 'i' } },
      ];
    }

    const page = z.coerce.number().int().min(1).optional().parse(req.query.page);
    const limit = z.coerce.number().int().min(1).max(100).optional().parse(req.query.limit) || 25;
    const now = new Date();
    const priorityFilter = priority && priority !== 'all' ? priority :
      (status === 'urgent' || status === 'high') ? 'high' : undefined;
    const conditions: any = { ...filter, ...(priorityFilter ? { calculatedPriority: priorityFilter } : {}) };
    if (req.query.from || req.query.to) {
      const dates = analyticsQuery.parse({ from: req.query.from, to: req.query.to });
      Object.assign(conditions, analyticsFilter(dates));
    }
    if (req.query.department) conditions.assignedDepartment = z.string().trim().min(1).max(100).parse(req.query.department);
    if (req.query.overdue === 'true') {
      if (!env.RESOLUTION_TARGET_HOURS || env.RESOLUTION_TARGET_HOURS <= 0) throw new ApiError(400, 'No resolution target configured.');
      conditions.status = { $ne: 'Resolved' };
      conditions.createdAt = { ...(conditions.createdAt || {}), $lt: new Date(Math.min(conditions.createdAt?.$lt?.getTime() || Infinity, now.getTime() - env.RESOLUTION_TARGET_HOURS * 3600000)) };
    }
    const ordering: any = sortBy === 'priority' ? { priorityScore: -1, createdAt: 1, _id: 1 } : { createdAt: sortBy === 'oldest' ? 1 : -1, _id: 1 };
    const [aggregate] = await Complaint.aggregate([
      { $match: scope },
      { $addFields: { priorityScore: priorityScoreExpression(now) } },
      { $addFields: { calculatedPriority: { $switch: { branches: [
        { case: { $gte: ['$priorityScore', 65] }, then: 'high' }, { case: { $gte: ['$priorityScore', 30] }, then: 'medium' },
      ], default: 'low' } } } },
      { $facet: {
        records: [{ $match: conditions }, { $sort: ordering }, ...(page ? [{ $skip: (page - 1) * limit }, { $limit: limit }] : []), { $project: { calculatedPriority: 0 } }],
        filteredCount: [{ $match: conditions }, { $count: 'total' }],
        totals: [{ $group: { _id: null, total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status','Pending'] },1,0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status','In Progress'] },1,0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status','Resolved'] },1,0] } },
          highPriority: { $sum: { $cond: [{ $eq: ['$calculatedPriority','high'] },1,0] } },
          verifiedCount: { $sum: { $cond: ['$verified',1,0] } },
          today: { $sum: { $cond: [{ $gte: ['$createdAt',new Date(now.toISOString().slice(0,10))] },1,0] } },
        } }],
        categoryGroups: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
      } },
    ]);
    const populated = await Complaint.populate(aggregate.records as any[], { path: 'createdBy', select: 'name email phone' });
    const complaints = populated.map((c: any) => withPriority(c, now));
    const { total = 0, pending = 0, inProgress = 0, resolved = 0, highPriority = 0, verifiedCount = 0, today = 0 } = aggregate.totals[0] || {};
    const categoryStats = Object.fromEntries(aggregate.categoryGroups.map((c: any) => [c._id, c.count]));
    const filteredTotal = aggregate.filteredCount[0]?.total || 0;

    res.status(200).json(
      new ApiResponse('All complaints retrieved for authority', {
        complaints,
        pagination: { page: page || 1, limit: page ? limit : filteredTotal, total: filteredTotal, pages: page ? Math.max(1, Math.ceil(filteredTotal / limit)) : 1 },
        stats: {
          total,
          pending,
          inProgress,
          resolved,
          highPriority,
          today,
          verifiedCount,
          categoryStats,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getAuthorityComplaintById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const complaint = await Complaint.findOne({ _id: id, ...authorityScope(req.user) }).populate('createdBy', 'name email phone');

    if (!complaint) {
      throw new ApiError(404, 'Complaint not found');
    }

    res.status(200).json(new ApiResponse('Complaint detail for authority', withPriority(complaint)));
  } catch (error) {
    next(error);
  }
};

export const updateComplaintStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status: targetStatus } = updateStatusSchema.parse(req.body);

    const complaint = await Complaint.findOne({ _id: id, ...authorityScope(req.user) });
    if (!complaint) {
      throw new ApiError(404, 'Complaint not found');
    }

    const currentStatus: ComplaintStatus = complaint.status;

    // Idempotent: If already in target status, return 200 without error
    if (currentStatus === targetStatus) {
      return res.status(200).json(new ApiResponse('Complaint is already in requested status', withPriority(complaint)));
    }

    // Resolved records are final and cannot be reverted
    if (currentStatus === 'Resolved') {
      throw new ApiError(400, `Complaint is already 'Resolved' and cannot be modified further.`);
    }

    // In Progress cannot revert to Pending
    if (currentStatus === 'In Progress' && targetStatus === 'Pending') {
      throw new ApiError(
        400,
        `Invalid status transition. Complaints in 'In Progress' status can only transition to 'Resolved'.`
      );
    }

    // Pending cannot jump directly to Resolved without being In Progress first
    if (currentStatus === 'Pending' && targetStatus === 'Resolved') {
      throw new ApiError(
        400,
        `Invalid status transition. Complaints in 'Pending' status cannot transition directly to 'Resolved'.`
      );
    }

    if (targetStatus === 'Resolved' && complaint.completionImageUrl && complaint.completionReview !== 'accepted') {
      throw new ApiError(409, 'Review the submitted repair evidence before resolving this complaint.');
    }

    const changedAt = new Date();

    const updated = await Complaint.findOneAndUpdate(
      { _id: id, status: currentStatus, ...authorityScope(req.user) },
      { $set: { status: targetStatus, ...(targetStatus === 'Resolved' ? { resolvedAt: changedAt, resolutionNoticeAt: changedAt, resolutionNoticePending: true } : { notificationOutboxPending: true }) },
        $push: { statusHistory: { status: targetStatus, at: changedAt, by: req.user!._id },
          ...(targetStatus !== 'Resolved' ? { notificationOutbox: notificationIntent(`${complaint._id}:status:${targetStatus}`,
            `Complaint ${targetStatus}`, `${complaint.complaintId} is now ${targetStatus}.`) } : {}) } },
      { new: true, runValidators: true }
    );
    if (!updated) throw new ApiError(409, 'This complaint changed. Refresh before trying again.');
    if (targetStatus === 'Resolved') {
      try { await queueResolutionNotifications(updated); }
      catch { console.error('Resolution notice is pending; the worker will retry persistence.'); }
    } else await attemptNotificationFlush(updated._id);
    res.status(200).json(new ApiResponse('Complaint status updated successfully', withPriority(updated)));
  } catch (error) {
    next(error);
  }
};

export const deleteComplaint = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const complaint = await Complaint.findOne({ _id: id, ...authorityScope(req.user) });

    if (!complaint) {
      throw new ApiError(404, 'Complaint not found');
    }

    await Complaint.findOneAndDelete({ _id: id, ...authorityScope(req.user) });

    res.status(200).json(new ApiResponse('Complaint deleted successfully by authority', { id }));
  } catch (error) {
    next(error);
  }
};

export const verifyComplaint = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const complaint = await Complaint.findOne({ _id: id, ...authorityScope(req.user) });

    if (!complaint) {
      throw new ApiError(404, 'Complaint not found');
    }

    complaint.verified = true;
    if (req.user) {
      complaint.officerId = req.user._id;
    }

    complaint.$where = authorityScope(req.user);
    await complaint.save();

    res.status(200).json(new ApiResponse('Complaint verified by authority', withPriority(complaint)));
  } catch (error) {
    next(error);
  }
};
