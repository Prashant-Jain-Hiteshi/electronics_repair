import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { createInventory, deleteInventory, listInventory, updateInventory } from '../controllers/inventory.controller';

const router = Router();

// Read: all roles
router.get('/', requireAuth, listInventory);

// Write: admin + technician
router.post('/', requireAuth, requireRole(['admin', 'technician']), createInventory);
router.put('/:id', requireAuth, requireRole(['admin', 'technician']), updateInventory);
router.delete('/:id', requireAuth, requireRole(['admin', 'technician']), deleteInventory);

export default router;
