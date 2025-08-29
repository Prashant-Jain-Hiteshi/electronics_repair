import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';
import {
  getAvailableSlots,
  listMyAppointments,
  getAppointment,
  createAppointment,
  cancelAppointment,
  updateAppointment,
} from '../controllers/appointments.controller';

const router = Router();

// Public-ish: slots by location (no auth needed for discovery?)
// To align with existing patterns, keep it authenticated for customers at least
router.get(
  '/slots',
  requireAuth,
  requireRole(['customer', 'technician', 'admin']),
  [
    query('locationId').isString().notEmpty(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ],
  handleValidation,
  getAvailableSlots
);

// Customer: list own appointments
router.get('/mine', requireAuth, requireRole(['customer']), listMyAppointments);

// Common: get appointment by id
router.get(
  '/:id',
  requireAuth,
  requireRole(['customer', 'technician', 'admin']),
  [param('id').isString()],
  handleValidation,
  getAppointment
);

// Customer: create appointment
router.post(
  '/',
  requireAuth,
  requireRole(['customer']),
  [
    body('locationId').isString().notEmpty(),
    body('start').isISO8601(),
    body('end').optional().isISO8601(),
    body('mode').optional().isIn(['repair', 'estimate']),
    body('intake').optional(),
  ],
  handleValidation,
  createAppointment
);

// Customer/Admin: reschedule appointment
router.put(
  '/:id',
  requireAuth,
  requireRole(['customer', 'admin']),
  [param('id').isString(), body('start').optional().isISO8601(), body('end').optional().isISO8601()],
  handleValidation,
  updateAppointment
);

// Customer/Admin: cancel appointment
router.put(
  '/:id/cancel',
  requireAuth,
  requireRole(['customer', 'admin']),
  [param('id').isString()],
  handleValidation,
  cancelAppointment
);

export default router;
