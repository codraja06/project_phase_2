import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { Complaint } from '../models/Complaint';
import { Conversation } from '../models/Conversation';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { civicGuidance } from '../services/civicAssistantService';

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const messageInput = z.object({ message: z.string().trim().min(1).max(2000),
  conversationId: objectId.optional(), complaintId: z.string().regex(/^(?:CIV-\d{6}|[a-f\d]{24})$/i).optional() });

export const getConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const conversation = await Conversation.findOne({ userId: req.user!._id }).sort({ updatedAt: -1 }).lean();
    res.json(new ApiResponse('Your civic assistance history', conversation || { messages: [] }));
  } catch (error) { next(error); }
};

export const sendChatMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = messageInput.parse(req.body);
    let conversation = input.conversationId ? await Conversation.findOne({ _id: input.conversationId, userId: req.user!._id }) : null;
    if (input.conversationId && !conversation) throw new ApiError(404, 'Conversation not found in your account.');
    if (!conversation) conversation = await Conversation.create({ userId: req.user!._id });
    const reference = input.complaintId || input.message.match(/\b(?:CIV-\d{6}|[a-f\d]{24})\b/i)?.[0];
    let reply: string, source: 'application' | 'guide' | 'provider-guided', available = false, notice = '';
    if (reference) {
      const referenceFilter = /^[a-f\d]{24}$/i.test(reference) ? { _id: reference } : { complaintId: reference.toUpperCase() };
      const complaint = await Complaint.findOne({ ...referenceFilter, createdBy: req.user!._id }).select('complaintId title status category createdAt');
      reply = complaint ? `${complaint.complaintId}: ${complaint.title}. Category: ${complaint.category.replace(/_/g, ' ')}. Current status: ${complaint.status}. Submitted: ${complaint.createdAt.toISOString().slice(0, 10)} (UTC). No completion date is promised. Open My Complaints for the full report.` :
        'No complaint matching that reference was found in your account. Check the reference in My Complaints.';
      source = 'application'; notice = 'Read-only information from your account.';
    } else {
      const guidance = await civicGuidance(input.message, conversation.messages.filter(m => m.role === 'user').slice(-4).map(m => m.content));
      ({ reply, source, available, notice } = guidance);
    }
    const messages = [{ role: 'user', content: input.message, source: 'citizen', createdAt: new Date() },
      { role: 'assistant', content: reply, source, createdAt: new Date() }];
    const updated = await Conversation.findOneAndUpdate({ _id: conversation._id, userId: req.user!._id },
      { $push: { messages: { $each: messages, $slice: -100 } } }, { new: true, runValidators: true });
    res.json(new ApiResponse('Civic assistance response', { conversation: updated, available, source, notice }));
  } catch (error) { next(error); }
};
