import { Router } from 'express';
import { detectIssue, getModels } from '../controllers/aiController';
import { authenticate } from '../middleware/auth';
import { upload, validateImageContent } from '../middleware/upload';
import rateLimit from 'express-rate-limit';
import { sharedRateLimitStore } from '../middleware/rateLimiter';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/models', getModels);
const detectionLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false, store: sharedRateLimitStore('ai-detection'),
  keyGenerator: req => String((req as AuthRequest).user!._id),
  message: { success: false, message: 'Too many image analyses. Please wait before trying again.' } });
router.post('/detect', detectionLimiter, upload.single('image'), validateImageContent, detectIssue);

export default router;
