import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  createTemplate,
  listTemplates,
  updateTemplate,
  deactivateTemplate,
  startRun,
  listRunsForRepair,
  latestRunForRepair,
  submitStep,
  completeRun,
  abortRun,
} from '../controllers/diagnostics.controller';

const router = Router();

// Templates (Admin-only)
router.post('/templates', requireAuth, requireRole(['admin']), createTemplate);
router.get('/templates', requireAuth, requireRole(['admin']), listTemplates);
router.put('/templates/:id', requireAuth, requireRole(['admin']), updateTemplate);
router.post('/templates/:id/deactivate', requireAuth, requireRole(['admin']), deactivateTemplate);

// Runs (Technician/Admin)
router.post('/repairs/:repairId/runs', requireAuth, requireRole(['technician', 'admin']), startRun);
router.get('/repairs/:repairId/runs', requireAuth, requireRole(['technician', 'admin']), listRunsForRepair);
router.get('/repairs/:repairId/runs/latest', requireAuth, requireRole(['technician', 'admin']), latestRunForRepair);
router.post('/runs/:runId/step', requireAuth, requireRole(['technician', 'admin']), submitStep);
router.post('/runs/:runId/complete', requireAuth, requireRole(['technician', 'admin']), completeRun);
router.post('/runs/:runId/abort', requireAuth, requireRole(['technician', 'admin']), abortRun);

export default router;
