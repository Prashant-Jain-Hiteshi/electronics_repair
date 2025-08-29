import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { createInventory, deleteInventory, listInventory, updateInventory, listLowStock, listUsage, adjustInventory, reservePart, cancelReservation, pickReservation, consumeReservation, listReservations, scanBarcode, getReservationLabel } from '../controllers/inventory.controller';

const router = Router();

// Read: all roles
router.get('/', requireAuth, listInventory);
router.get('/low-stock', requireAuth, listLowStock);
router.get('/:id/usage', requireAuth, listUsage);
router.get('/reservations', requireAuth, listReservations);

// Write: admin + technician
router.post('/', requireAuth, requireRole(['admin', 'technician']), createInventory);
router.put('/:id', requireAuth, requireRole(['admin', 'technician']), updateInventory);
router.delete('/:id', requireAuth, requireRole(['admin', 'technician']), deleteInventory);
router.post('/:id/adjust', requireAuth, requireRole(['admin', 'technician']), adjustInventory);
// Reservation & barcoding
router.post('/:id/reserve', requireAuth, requireRole(['admin', 'technician']), reservePart);
router.post('/reservations/:reservationId/cancel', requireAuth, requireRole(['admin', 'technician']), cancelReservation);
router.post('/reservations/:reservationId/pick', requireAuth, requireRole(['admin', 'technician']), pickReservation);
router.post('/reservations/:reservationId/consume', requireAuth, requireRole(['admin', 'technician']), consumeReservation);
router.post('/scan', requireAuth, requireRole(['admin', 'technician']), scanBarcode);
router.get('/labels/:reservationId', requireAuth, getReservationLabel);

export default router;
