import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { listByEntity, listRecent } from '../controllers/audit.controller';

const router = Router();

// Admin-only audit log access
router.use(requireAuth, requireRole(['admin']));

// GET /api/audit/by-entity?entityType=RepairOrder&entityId=<uuid>&page=1&pageSize=20
router.get('/by-entity', listByEntity);

// GET /api/audit/recent?q=...&page=1&pageSize=20
router.get('/recent', listRecent);

export default router;
