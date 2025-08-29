import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { handleValidation } from '../middleware/validate'
import { deviceValidators, createDevice, listMyDevices, updateDevice, linkDeviceToRepair, getDeviceHistory } from '../controllers/devices.controller'

const router = Router()

// Create device (customer)
router.post('/', requireAuth, requireRole(['customer']), deviceValidators.create, handleValidation, createDevice)

// List my devices (customer)
router.get('/mine', requireAuth, requireRole(['customer']), listMyDevices)

// Update device (customer)
router.put('/:id', requireAuth, requireRole(['customer']), deviceValidators.update, handleValidation, updateDevice)

// Link device to a repair (customer)
router.post('/:id/link/:repairId', requireAuth, requireRole(['customer']), deviceValidators.link, handleValidation, linkDeviceToRepair)

// Device repair history with invoice links (customer)
router.get('/:id/history', requireAuth, requireRole(['customer']), deviceValidators.history, handleValidation, getDeviceHistory)

export default router
