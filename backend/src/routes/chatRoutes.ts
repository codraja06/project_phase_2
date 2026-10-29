import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { getConversation, sendChatMessage } from '../controllers/chatController';
import { sharedRateLimitStore } from '../middleware/rateLimiter';

const router = Router();
router.use(authenticate, authorizeRoles('citizen'));
router.get('/conversation', getConversation);
router.post('/messages', rateLimit({ windowMs: 60000, max: 12, standardHeaders: true, legacyHeaders: false,
  store: sharedRateLimitStore('chat'),
  message: { success: false, message: 'Please wait a moment before sending another message.' } }), sendChatMessage);
export default router;
