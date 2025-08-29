import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { startWorkLog, stopWorkLog, abortWorkLog, activeLog, listWorkLogs, reportProductiveHours, reportBenchUtilization } from '../controllers/worklogs.controller'

const router = Router()

// All worklog endpoints require authentication
router.use(requireAuth)

// Technician: start/stop/abort and fetch active
router.post('/', requireRole(['technician', 'admin']), startWorkLog)
router.get('/active/:repairOrderId', requireRole(['technician', 'admin']), activeLog)
router.post('/:id/stop', requireRole(['technician', 'admin']), stopWorkLog)
router.post('/:id/abort', requireRole(['technician', 'admin']), abortWorkLog)

// List logs (admin or self via technicianId filter)
router.get('/', requireRole(['technician', 'admin']), listWorkLogs)

// Reports (admin)
router.get('/reports/productive-hours', requireRole(['admin']), reportProductiveHours)
router.get('/reports/bench-utilization', requireRole(['admin']), reportBenchUtilization)

export default router
