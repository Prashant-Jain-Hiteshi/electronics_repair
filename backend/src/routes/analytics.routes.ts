import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { revenueBreakdown, repairsAggregation, technicianPerformance, technicianStatus, techniciansCurrentStatus } from '../controllers/analytics.controller'

const router = Router()

// Admin-only analytics endpoints
router.get('/revenue', requireAuth, requireRole(['admin']), revenueBreakdown)
router.get('/repairs', requireAuth, requireRole(['admin']), repairsAggregation)
router.get('/technicians/performance', requireAuth, requireRole(['admin']), technicianPerformance)
router.get('/technicians/status', requireAuth, requireRole(['admin']), technicianStatus)
router.get('/technicians/current-status', requireAuth, requireRole(['admin']), techniciansCurrentStatus)

export default router
