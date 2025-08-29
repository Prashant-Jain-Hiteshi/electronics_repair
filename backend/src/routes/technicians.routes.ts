import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { getTechnicianSchedule } from '../controllers/scheduling.controller'
import { getMyTechnicianProfile, upsertMyTechnicianProfile } from '../controllers/technicians.controller'
import { body } from 'express-validator'
import { handleValidation } from '../middleware/validate'

const router = Router()

// Get a technician's schedule (admin can view any; technician can view their own)
router.get('/:id/schedule', requireAuth, requireRole(['admin', 'technician']), getTechnicianSchedule)

// Technician: view/update own technician profile
router.get('/me', requireAuth, requireRole(['technician']), getMyTechnicianProfile)
router.put(
  '/me',
  requireAuth,
  requireRole(['technician']),
  [
    body('skills').optional().isArray(),
    body('dailyCapacity').optional().isInt({ min: 1, max: 24 }),
    body('timezone').optional().isString(),
    body('color').optional().isString(),
  ],
  handleValidation,
  upsertMyTechnicianProfile
)

export default router
