import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { listPolicies, createPolicy, updatePolicy, deletePolicy, listEscalations, slaAnalytics } from '../controllers/sla.controller';

const router = Router();

// Admin-only CRUD for SLA policies
router.get('/policies', requireAuth, requireRole(['admin']), listPolicies);
router.post('/policies', requireAuth, requireRole(['admin']), createPolicy);
router.put('/policies/:id', requireAuth, requireRole(['admin']), updatePolicy);
router.delete('/policies/:id', requireAuth, requireRole(['admin']), deletePolicy);

// View escalation logs (admin, technician can view their related items in the future)
router.get('/escalations', requireAuth, requireRole(['admin']), listEscalations);

// Analytics for SLA
router.get('/analytics', requireAuth, requireRole(['admin']), slaAnalytics);

export default router;
