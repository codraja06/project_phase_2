import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { AuditEvent } from '../models/AuditEvent';
const router = Router();
router.use(authenticate);
router.use((req: AuthRequest, _res, next) => next(req.user?.role === 'authority' && req.user.isAdmin ? undefined : new ApiError(403, 'Administrator access required.')));
router.get('/audit', async (req, res, next) => {
  try {
    const id = z.string().regex(/^[a-f\d]{24}$/i);
    const q = z.object({ user: id.optional(), complaint: id.optional(), action: z.string().max(80).optional(), department: z.string().max(100).optional(),
      from: z.string().datetime().optional(), to: z.string().datetime().optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25) }).parse(req.query);
    if (q.from && q.to && q.from > q.to) throw new ApiError(400, 'Start must precede end.');
    const filter: any = { ...(q.user ? { actor: q.user } : {}), ...(q.complaint ? { entity: 'Complaint', entityId: q.complaint } : {}), ...(q.action ? { action: q.action } : {}), ...(q.department ? { department: q.department } : {}) };
    if (q.from || q.to) filter.at = { ...(q.from ? { $gte: new Date(q.from) } : {}), ...(q.to ? { $lte: new Date(q.to) } : {}) };
    const [records, total] = await Promise.all([AuditEvent.find(filter).sort({ at: -1, _id: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), AuditEvent.countDocuments(filter)]);
    res.json(new ApiResponse('Audit events', { records, total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) }));
  } catch (e) { next(e); }
});
export default router;
