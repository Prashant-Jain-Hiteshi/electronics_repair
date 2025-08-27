import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { createLocation, listLocations } from '../controllers/locations.controller';

const router = Router();

router.get('/', requireAuth, listLocations);
router.post('/', requireAuth, requireRole(['admin']), createLocation);

export default router;
