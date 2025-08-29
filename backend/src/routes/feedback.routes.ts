import { Router } from 'express'
import { param } from 'express-validator'
import { requireAuth, requireRole } from '../middleware/auth'
import { handleValidation } from '../middleware/validate'
import { feedbackValidators, submitFeedback, listMyFeedback, getFeedbackForRepair } from '../controllers/feedback.controller'

const router = Router()

// Customer: submit feedback
router.post(
  '/',
  requireAuth,
  requireRole(['customer']),
  feedbackValidators.submit,
  handleValidation,
  submitFeedback
)

// Customer: list own feedback history
router.get('/mine', requireAuth, requireRole(['customer']), listMyFeedback)

// Customer/Admin/Technician: get feedback for a repair order (customer only own)
router.get(
  '/repairs/:repairId',
  requireAuth,
  requireRole(['customer', 'technician', 'admin']),
  [param('repairId').isString()],
  handleValidation,
  getFeedbackForRepair
)

export default router
