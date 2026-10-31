import { Router } from 'express';
import {
  getAllComplaints,
  getAuthorityComplaintById,
  updateComplaintStatus,
  deleteComplaint,
  verifyComplaint,
} from '../controllers/authorityController';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { exportAnalytics, getAnalytics } from '../controllers/analyticsController';

const router = Router();

router.use(authenticate);
router.use(authorizeRoles('authority'));
router.get('/analytics', getAnalytics);
router.get('/analytics/export', exportAnalytics);

router.get('/complaints', getAllComplaints);
router.get('/complaints/:id', getAuthorityComplaintById);
router.patch('/complaints/:id/status', updateComplaintStatus);
router.patch('/complaints/:id/verify', verifyComplaint);
router.delete('/complaints/:id', deleteComplaint);

export default router;
