import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Complaint } from '../models/Complaint';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { createComplaintSchema } from '../validators/complaintValidator';
import { calculatePriority, readEvidence, unavailableSeverity, withPriority } from '../services/triageService';
import { DepartmentRule } from '../models/DepartmentRule';
import { notifyAuthorities, notifyUser } from '../services/notificationService';

export const createComplaint = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const validated = createComplaintSchema.parse(req.body);
    const { analysisToken, uploadToken, priority: _clientPriority, ...input } = validated;
    let severity = unavailableSeverity();
    let generatedDescription = '';
    if (analysisToken) {
      if (!uploadToken) throw new ApiError(400, 'Upload the analyzed image before submitting.');
      const analysis = readEvidence(analysisToken, 'analysis', req.user._id.toString());
      const upload = readEvidence(uploadToken, 'upload', req.user._id.toString());
      if (analysis.imageHash !== upload.imageHash || upload.imageUrl !== input.imageUrl) {
        throw new ApiError(400, 'The uploaded image does not match the analyzed photo.');
      }
      severity = analysis.severity;
      generatedDescription = analysis.generatedDescription;
      // Persist actual service detections, never client-edited evidence.
      input.boundingBoxes = createComplaintSchema.shape.boundingBoxes.parse(analysis.detections);
      input.aiDetected = input.boundingBoxes.length > 0;
      input.aiClass = input.boundingBoxes[0]?.category || '';
      input.aiConfidence = input.boundingBoxes[0]?.confidence || 0;
    }

    const rule = await DepartmentRule.findOne({ category: input.category.toLowerCase(), enabled: true }).lean();
    const complaint = await Complaint.create({
      ...input,
      severity,
      generatedDescription,
      ...calculatePriority({ severity, category: input.category, status: 'Pending' }),
      createdBy: req.user._id,
      status: 'Pending',
      assignedDepartment: rule?.department || '',
      assignedAt: rule ? new Date() : null,
      statusHistory: [{ status: 'Pending', at: new Date(), by: req.user._id }],
    });

    await notifyUser(req.user._id, { complaintId: complaint._id, eventKey: `${complaint._id}:received`,
      title: 'Complaint received', message: `${complaint.complaintId} was received and awaits authority review.` });
    if (rule) await notifyUser(req.user._id, { complaintId: complaint._id, eventKey: `${complaint._id}:department:initial`,
      title: 'Department assigned', message: `${rule.department} is assigned to ${complaint.complaintId}.` });
    await notifyAuthorities({ complaintId: complaint._id, eventKey: `${complaint._id}:new`,
      title: complaint.priority === 'high' ? 'High-priority complaint received' : 'New complaint received',
      message: `${complaint.complaintId} needs review.` });

    res.status(201).json(new ApiResponse('Complaint created successfully', withPriority(complaint)));
  } catch (error) {
    next(error);
  }
};

export const getMyComplaints = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const { status, category, search } = req.query;
    const filter: any = { createdBy: req.user._id };

    if (typeof status === 'string' && status !== 'All' && status !== 'all') {
      const s = status.toString().toLowerCase().replace('_', ' ');
      if (s === 'pending') filter.status = 'Pending';
      else if (s === 'in progress' || s === 'in_progress') filter.status = 'In Progress';
      else if (s === 'resolved') filter.status = 'Resolved';
      else filter.status = status;
    }
    if (typeof category === 'string' && category !== 'All' && category !== 'all') {
      filter.category = category;
    }
    if (search && typeof search === 'string') {
      const literalSearch = search.slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: literalSearch, $options: 'i' } },
        { description: { $regex: literalSearch, $options: 'i' } },
        { complaintId: { $regex: literalSearch, $options: 'i' } },
      ];
    }

    const complaints = await Complaint.find(filter).sort({ createdAt: -1 });

    const total = complaints.length;
    const pending = complaints.filter((c) => c.status === 'Pending').length;
    const inProgress = complaints.filter((c) => c.status === 'In Progress').length;
    const resolved = complaints.filter((c) => c.status === 'Resolved').length;

    res.status(200).json(
      new ApiResponse('My complaints retrieved', {
        complaints: complaints.map(c => withPriority(c)),
        stats: { total, pending, inProgress, resolved },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getComplaintById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const { id } = req.params;
    const complaint = await Complaint.findById(id).populate('createdBy', 'name email phone');

    if (!complaint) {
      throw new ApiError(404, 'Complaint not found');
    }

    // Citizen can only view their own complaint unless role is authority or admin
    const creatorId = (complaint.createdBy as any)?._id
      ? (complaint.createdBy as any)._id.toString()
      : (complaint.createdBy as any)?.toString();
    if (req.user.role === 'citizen' && creatorId !== req.user._id.toString()) {
      throw new ApiError(403, 'Forbidden. You do not have permission to view this complaint.');
    }

    const original = complaint.duplicateOf ? await Complaint.findById(complaint.duplicateOf).select('complaintId').lean() : null;
    res.status(200).json(new ApiResponse('Complaint details retrieved', { ...withPriority(complaint), duplicateReference: original?.complaintId || null }));
  } catch (error) {
    next(error);
  }
};
