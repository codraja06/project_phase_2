import { publishNotificationChange } from '../services/liveNotifications';
import { env } from '../config/env';
import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { Complaint } from '../models/Complaint';
import { DepartmentRule } from '../models/DepartmentRule';
import { Notification } from '../models/Notification';
import { possibleDuplicates } from '../services/duplicateService';
import { notifyUser } from '../services/notificationService';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { withPriority, priorityScoreExpression, readEvidence, calculatePriority } from '../services/triageService';
import { analyticsQuery, analyticsFilter } from '../services/analyticsService';

const id = z.string().refine(mongoose.isValidObjectId, 'Invalid complaint ID');
const category = z.string().trim().toLowerCase().min(2).max(80).regex(/^[a-z0-9_ -]+$/);
const department = z.string().trim().min(2).max(100);

export const checkDuplicates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = z.object({ category, latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180), uploadToken: z.string().max(5000).optional() }).parse(req.body);
    const imageFingerprint = input.uploadToken ? readEvidence(input.uploadToken, 'upload', req.user!._id.toString()).imageFingerprint : undefined;
    res.json(new ApiResponse('Possible duplicate check complete', await possibleDuplicates({ ...input, imageFingerprint }, req.user!._id)));
  } catch (e) { next(e); }
};

export const getDuplicateCandidates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const complaint = await Complaint.findById(id.parse(req.params.id));
    if (!complaint) throw new ApiError(404, 'Complaint not found');
    const result = await possibleDuplicates(complaint, req.user!._id, true);
    result.matches = result.matches.filter(match => String(match.id) !== String(complaint._id));
    res.json(new ApiResponse('Possible related complaints', result));
  } catch (e) { next(e); }
};

export const confirmDuplicate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const complaintId = id.parse(req.params.id), originalId = id.parse(req.body.originalId);
    if (complaintId === originalId) throw new ApiError(400, 'A complaint cannot duplicate itself.');
    const [complaint, original] = await Promise.all([Complaint.findById(complaintId), Complaint.findById(originalId)]);
    if (!complaint || !original) throw new ApiError(404, 'Complaint not found');
    if (complaint.category !== original.category) throw new ApiError(400, 'Different issue categories require separate complaints.');
    if (complaint.duplicateOf) throw new ApiError(409, 'Duplicate already confirmed.');
    if (original.duplicateOf) throw new ApiError(400, 'Select the original complaint, not another duplicate.');
    if (complaint.createdAt < original.createdAt) throw new ApiError(400, 'Original complaint must predate the duplicate.');
    const note = z.string().trim().min(10).max(500).parse(req.body.reason);
    const updated = await Complaint.findOneAndUpdate({ _id: complaintId, duplicateOf: null }, { $set: {
      duplicateOf: original._id, duplicateConfirmedAt: new Date(), duplicateConfirmedBy: req.user!._id, duplicateReason: note,
    } }, { new: true, runValidators: true });
    if (!updated) throw new ApiError(409, 'Complaint changed. Refresh and retry.');
    await notifyUser(updated.createdBy, { complaintId: updated._id, eventKey: `${updated._id}:duplicate-confirmed`, title: 'Related complaint confirmed',
      message: `Your report is linked to ${original.complaintId}. Authority note: ${note}` });
    res.json(new ApiResponse('Duplicate relationship confirmed', withPriority(updated)));
  } catch (e) { next(e); }
};

export const listDepartmentRules = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(new ApiResponse('Department mappings', await DepartmentRule.find().sort({ category: 1 }).lean())); }
  catch (e) { next(e); }
};

export const reviewTriage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = z.object({ kind: z.enum(['severity', 'priority']), level: z.enum(['Low', 'Medium', 'High', 'low', 'medium', 'high']).nullable(), reason: z.string().trim().min(10).max(500) }).parse(req.body);
    if (input.kind === 'severity' && (!input.level || !['Low', 'Medium', 'High'].includes(input.level))) throw new ApiError(400, 'Choose Low, Medium or High severity.');
    if (input.kind === 'priority' && input.level && !['low', 'medium', 'high'].includes(input.level)) throw new ApiError(400, 'Choose low, medium or high priority.');
    const complaint = await Complaint.findById(id.parse(req.params.id));
    if (!complaint) throw new ApiError(404, 'Complaint not found');
    const at = new Date();
    const before = input.kind === 'severity' ? complaint.severityReview?.level || complaint.severity?.level || 'unavailable' : complaint.priorityOverride?.level || 'calculated';
    if (input.kind === 'severity') complaint.severityReview = { level: input.level as 'Low' | 'Medium' | 'High', reason: input.reason, at, by: req.user!._id };
    else complaint.priorityOverride = input.level ? { level: input.level as 'low' | 'medium' | 'high', reason: input.reason, at, by: req.user!._id } : null;
    complaint.auditHistory = [...(complaint.auditHistory || []), { action: `${input.kind}-reviewed`, before, after: input.level || 'calculated', reason: input.reason, at, by: req.user!._id }];
    Object.assign(complaint, calculatePriority(complaint));
    await complaint.save();
    res.json(new ApiResponse('Authority triage decision recorded', withPriority(complaint)));
  } catch (e) { next(e); }
};
export const upsertDepartmentRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) throw new ApiError(403, 'Administrator access required for department mappings.');
    const key = category.parse(req.params.category);
    const input = z.object({ department, enabled: z.boolean().default(true) }).parse(req.body);
    const rule = await DepartmentRule.findOneAndUpdate({ category: key }, { $set: { ...input, updatedBy: req.user._id } }, { upsert: true, new: true, runValidators: true });
    res.json(new ApiResponse('Department mapping saved', rule));
  } catch (e) { next(e); }
};

export const assignDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const complaintId = id.parse(req.params.id);
    const name = department.parse(req.body.department);
    const reason = z.string().trim().min(5).max(300).parse(req.body.reason);
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new ApiError(404, 'Complaint not found');
    if (complaint.assignedDepartment === name) return res.json(new ApiResponse('Department already assigned', withPriority(complaint)));
    const before = complaint.assignedDepartment || 'Unassigned';
    complaint.assignedDepartment = name; complaint.assignedAt = new Date(); complaint.assignedBy = req.user!._id;
    complaint.auditHistory = [...(complaint.auditHistory || []), { action: 'department-reassigned', at: complaint.assignedAt, by: req.user!._id, before, after: name, reason }];
    await complaint.save();
    await notifyUser(complaint.createdBy, { complaintId: complaint._id, eventKey: `${complaint._id}:department:${complaint.assignedAt.getTime()}`,
      title: 'Department assigned', message: `${name} is assigned to your report. Reason: ${reason}` });
    res.json(new ApiResponse('Department reassigned', withPriority(complaint)));
  } catch (e) { next(e); }
};

export const submitCompletion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const complaintId = id.parse(req.params.id);
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new ApiError(404, 'Complaint not found');
    if (complaint.status !== 'In Progress') throw new ApiError(400, 'Repair evidence requires an in-progress complaint.');
    if (!req.file) throw new ApiError(400, 'Completion image required.');
    const url = await uploadToCloudinary(req.file.path);
    complaint.auditHistory = [...(complaint.auditHistory || []), { action: 'repair-evidence-submitted', at: new Date(), by: req.user!._id, before: complaint.completionImageUrl || '', after: url, reason: 'Completion photo submitted for human review.' }];
    complaint.completionImageUrl = url; complaint.completionSubmittedAt = new Date(); complaint.completionSubmittedBy = req.user!._id;
    complaint.completionReview = 'pending'; complaint.completionReviewedAt = null; complaint.completionReviewedBy = null; complaint.completionReviewNote = '';
    await complaint.save();
    await notifyUser(complaint.createdBy, { complaintId: complaint._id, eventKey: `${complaint._id}:completion:${complaint.completionSubmittedAt.getTime()}`,
      title: 'Repair evidence submitted', message: 'An officer submitted a completion photo. It awaits authority review.' });
    res.json(new ApiResponse('Repair evidence submitted for review', withPriority(complaint)));
  } catch (e) { next(e); }
};

export const reviewCompletion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const complaintId = id.parse(req.params.id);
    const input = z.object({ decision: z.enum(['accepted', 'rejected']), note: z.string().trim().max(500).default('') }).parse(req.body);
    if (input.decision === 'rejected' && input.note.length < 10) throw new ApiError(400, 'Explain why the evidence is insufficient.');
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new ApiError(404, 'Complaint not found');
    if (!complaint.completionImageUrl || complaint.completionReview !== 'pending') throw new ApiError(409, 'No pending repair evidence to review.');
    complaint.completionReview = input.decision; complaint.completionReviewNote = input.note;
    complaint.completionReviewedAt = new Date(); complaint.completionReviewedBy = req.user!._id;
    complaint.auditHistory = [...(complaint.auditHistory || []), { action: 'repair-evidence-reviewed', at: complaint.completionReviewedAt, by: req.user!._id, after: input.decision, reason: input.note || 'Authority accepted the submitted evidence.' }];
    await complaint.save();
    if (input.decision === 'rejected') await notifyUser(complaint.createdBy, { complaintId: complaint._id,
      eventKey: `${complaint._id}:completion-rejected:${complaint.completionReviewedAt.getTime()}`,
      title: 'Repair evidence needs further work', message: input.note });
    res.json(new ApiResponse('Repair evidence reviewed', withPriority(complaint)));
  } catch (e) { next(e); }
};

export const getHotspots = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filters = analyticsQuery.parse(req.query);
    const cellDegrees = z.coerce.number().min(.001).max(1).default(env.HOTSPOT_CELL_DEGREES).parse(req.query.cellDegrees);
    const windowDays = z.coerce.number().int().min(1).max(3650).default(env.HOTSPOT_WINDOW_DAYS).parse(req.query.windowDays);
    const geographicFilter = analyticsFilter(filters);
    if (!filters.from && !filters.to) geographicFilter.createdAt = { $gte: new Date(Date.now() - windowDays * 86400000) };
    const priority = z.enum(['all', 'low', 'medium', 'high']).default('all').parse(req.query.priority);
    const pipeline: any[] = [
      { $match: { ...geographicFilter, latitude: { $type: 'number', $gte: -90, $lte: 90 }, longitude: { $type: 'number', $gte: -180, $lte: 180 }, $nor: [{ latitude: 0, longitude: 0 }] } },
      { $addFields: { score: priorityScoreExpression(new Date()) } },
      { $addFields: { calculatedPriority: { $switch: { branches: [
        { case: { $gte: ['$score', 65] }, then: 'high' },
        { case: { $gte: ['$score', 30] }, then: 'medium' },
      ], default: 'low' } } } },
      ...(priority === 'all' ? [] : [{ $match: { calculatedPriority: priority } }]),
      { $group: { _id: { lat: { $floor: { $divide: ['$latitude', cellDegrees] } }, lng: { $floor: { $divide: ['$longitude', cellDegrees] } } },
        count: { $sum: 1 }, latitude: { $avg: '$latitude' }, longitude: { $avg: '$longitude' },
        records: { $push: { _id: '$_id', complaintId: '$complaintId', title: '$title', status: '$status', category: '$category' } } } },
      { $sort: { count: -1 } }, { $limit: 100 },
      { $project: { _id: 0, latitude: 1, longitude: 1, count: 1, records: { $slice: ['$records', 20] } } },
    ];
    const clusters = await Complaint.aggregate(pipeline);
    res.json(new ApiResponse('Complaint hotspots', { clusters, cellDegrees, windowDays, method: 'geographic-grid-counts', interpretation: 'Observed report concentrations, not statistically validated hotspots.', filters: { ...filters, priority }, maxClusters: 100 }));
  } catch (e) { next(e); }
};

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = z.coerce.number().int().min(1).default(1).parse(req.query.page);
    const limit = z.coerce.number().int().min(1).max(100).default(30).parse(req.query.limit);
    const recipient = req.user!._id;
    const [notifications, total, unread] = await Promise.all([
      Notification.find({ recipient }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Notification.countDocuments({ recipient }), Notification.countDocuments({ recipient, readAt: null }),
    ]);
    res.json(new ApiResponse('Notifications', { notifications, total, unread, page, pages: Math.ceil(total / limit) }));
  } catch (e) { next(e); }
};
export const markNotificationRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notificationId = id.parse(req.params.id);
    const notification = await Notification.findOneAndUpdate({ _id: notificationId, recipient: req.user!._id },
      { $set: { readAt: new Date() } }, { new: true });
    if (!notification) throw new ApiError(404, 'Notification not found');
    publishNotificationChange(String(req.user!._id));
    res.json(new ApiResponse('Notification marked read', notification));
  } catch (e) { next(e); }
};
