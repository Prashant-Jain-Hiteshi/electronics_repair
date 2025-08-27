import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { requestTransfer, approveTransfer, rejectTransfer } from '../controllers/stockTransfer.controller';

const router = Router();

router.post('/', requireAuth, requireRole(['admin', 'technician']), requestTransfer);
router.put('/:id/approve', requireAuth, requireRole(['admin']), approveTransfer);
router.put('/:id/reject', requireAuth, requireRole(['admin']), rejectTransfer);

export default router;
