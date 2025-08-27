import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { createInventory, deleteInventory, listInventory, updateInventory, listLowStock, listUsage, adjustInventory } from '../controllers/inventory.controller';

const router = Router();

// Read: all roles
router.get('/', requireAuth, listInventory);
router.get('/low-stock', requireAuth, listLowStock);
router.get('/:id/usage', requireAuth, listUsage);

// Write: admin + technician
router.post('/', requireAuth, requireRole(['admin', 'technician']), createInventory);
router.put('/:id', requireAuth, requireRole(['admin', 'technician']), updateInventory);
router.delete('/:id', requireAuth, requireRole(['admin', 'technician']), deleteInventory);
router.post('/:id/adjust', requireAuth, requireRole(['admin', 'technician']), adjustInventory);

export default router;
