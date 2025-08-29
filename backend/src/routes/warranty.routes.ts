import { Router } from 'express'
import { param } from 'express-validator'
import { requireAuth, requireRole } from '../middleware/auth'
import { handleValidation } from '../middleware/validate'
import { validateWarranty } from '../controllers/rma.controller'

const router = Router()

// Validate warranty for a repair order
router.get(
  '/repairs/:repairId/validate',
  requireAuth,
  requireRole(['customer', 'technician', 'admin']),
  [param('repairId').isString()],
  handleValidation,
  validateWarranty
)

export default router
