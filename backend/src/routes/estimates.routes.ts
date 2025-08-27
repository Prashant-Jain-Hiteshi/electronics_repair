import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { body, param, query } from 'express-validator';
import { handleValidation } from '../middleware/validate';
import { listEstimates, getEstimate, createEstimate, approveEstimate, rejectEstimate } from '../controllers/estimates.controller';

const router = Router();

// List estimates (admin)
router.get(
  '/',
  requireAuth,
  requireRole(['admin']),
  [
    query('q').optional().isString(),
    query('status').optional().isString(),
    query('customerId').optional().isString(),
    query('repairOrderId').optional().isString(),
  ],
  handleValidation,
  listEstimates
);

// Get single estimate (admin)
router.get('/:id', requireAuth, requireRole(['admin']), [param('id').isString()], handleValidation, getEstimate);

// Create estimate (admin)
router.post(
  '/',
  requireAuth,
  requireRole(['admin']),
  [
    body('customerId').isString(),
    body('deviceType').isString(),
    body('brand').isString(),
    body('model').isString(),
    body('lineItems').optional().isArray(),
    body('subtotal').optional().isFloat({ min: 0 }),
    body('tax').optional().isFloat({ min: 0 }),
    body('discount').optional().isFloat({ min: 0 }),
    body('total').optional().isFloat({ min: 0 }),
    body('validityUntil').optional().isISO8601(),
  ],
  handleValidation,
  createEstimate
);

// Approve (convert to RepairOrder if not linked)
router.patch('/:id/approve', requireAuth, requireRole(['admin']), [param('id').isString()], handleValidation, approveEstimate);

// Reject
router.patch('/:id/reject', requireAuth, requireRole(['admin']), [param('id').isString()], handleValidation, rejectEstimate);

export default router;
