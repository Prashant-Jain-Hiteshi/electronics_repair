import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { listStockByLocation, adjustStockAtLocation } from '../controllers/inventoryStock.controller';

const router = Router();

// Per-location inventory stock
router.get('/:locationId', requireAuth, listStockByLocation);
router.post('/:inventoryId/adjust', requireAuth, requireRole(['admin']), adjustStockAtLocation);

export default router;
