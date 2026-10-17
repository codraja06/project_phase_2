import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { upload, validateImageContent } from '../middleware/upload';
import { checkDuplicates, getDuplicateCandidates, confirmDuplicate, listDepartmentRules, upsertDepartmentRule,
  assignDepartment, submitCompletion, reviewCompletion, getHotspots,
  getNotifications, markNotificationRead } from '../controllers/managementController';

const router = Router();
router.use(authenticate);
router.post('/duplicates/check', authorizeRoles('citizen'), checkDuplicates);
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationRead);
router.get('/departments', authorizeRoles('authority'), listDepartmentRules);
router.put('/departments/:category', authorizeRoles('authority'), upsertDepartmentRule);
router.get('/hotspots', authorizeRoles('authority'), getHotspots);
router.get('/complaints/:id/duplicates', authorizeRoles('authority'), getDuplicateCandidates);
router.patch('/complaints/:id/duplicate', authorizeRoles('authority'), confirmDuplicate);
router.patch('/complaints/:id/department', authorizeRoles('authority'), assignDepartment);
router.post('/complaints/:id/completion', authorizeRoles('authority'), upload.single('image'), validateImageContent, submitCompletion);
router.patch('/complaints/:id/completion/review', authorizeRoles('authority'), reviewCompletion);
export default router;
