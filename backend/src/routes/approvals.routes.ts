import { Router } from 'express'
import { body, param } from 'express-validator'
import { requireAuth, requireRole } from '../middleware/auth'
import { handleValidation } from '../middleware/validate'
import {
  createApprovalRequest,
  listApprovalsForRepair,
  getApprovalStatus,
  actOnApproval,
  publicActOnApproval,
} from '../controllers/approvals.controller'

const router = Router()

// Create approval request for a repair (Admin/Technician)
router.post(
  '/repairs/:repairOrderId',
  requireAuth,
  requireRole(['admin', 'technician']),
  [
    param('repairOrderId').isString(),
    body('type').isIn(['estimate', 'extra_parts']),
    body('title').optional().isString(),
    body('message').optional().isString(),
    body('items').optional(),
    body('amountDelta').optional().isFloat(),
    body('expiresInDays').optional().isInt({ gt: 0, lt: 60 }),
  ],
  handleValidation,
  createApprovalRequest
)

// List approvals for a repair (Customer owns it; Admin/Technician any)
router.get(
  '/repairs/:repairOrderId',
  requireAuth,
  requireRole(['customer', 'admin', 'technician']),
  [param('repairOrderId').isString()],
  handleValidation,
  listApprovalsForRepair
)

// Get approval status by id
router.get(
  '/:id/status',
  requireAuth,
  requireRole(['customer', 'admin', 'technician']),
  [param('id').isString()],
  handleValidation,
  getApprovalStatus
)

// In-app approve/reject by id (Customer/Admin)
router.post(
  '/:id/act',
  requireAuth,
  requireRole(['customer', 'admin']),
  [param('id').isString(), body('action').isIn(['approve', 'reject'])],
  handleValidation,
  actOnApproval
)

// Public approve/reject via signed token (email/SMS link)
router.post(
  '/public/act',
  [body('token').isString(), body('action').isIn(['approve', 'reject'])],
  handleValidation,
  publicActOnApproval
)

export default router
