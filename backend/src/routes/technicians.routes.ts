import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { getTechnicianSchedule } from '../controllers/scheduling.controller'

const router = Router()

// Get a technician's schedule (admin can view any; technician can view their own)
router.get('/:id/schedule', requireAuth, requireRole(['admin', 'technician']), getTechnicianSchedule)

export default router
