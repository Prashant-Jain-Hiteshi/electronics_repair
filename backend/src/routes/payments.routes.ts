import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  listAllPayments,
  listMyPayments,
  listTechnicianPayments,
  createPayment,
  
  listPaymentsForRepair,
} from '../controllers/payments.controller';
import { handleValidation } from '../middleware/validate';

const router = Router();

// Admin: view all payments
router.get('/', requireAuth, requireRole(['admin']), listAllPayments);

// Customer: view own payments
router.get('/mine', requireAuth, requireRole(['customer']), listMyPayments);

// Technician: limited payments (their assigned orders)
router.get('/technician', requireAuth, requireRole(['technician']), listTechnicianPayments);

// Payments for a specific repair order (customer: own; technician/admin: any)
router.get('/repair/:id', requireAuth, requireRole(['customer', 'technician', 'admin']), listPaymentsForRepair);

// Admin/Technician: create a payment
router.post(
  '/',
  requireAuth,
  requireRole(['admin', 'technician', 'customer']),
  [
    body('repairOrderId').isString().withMessage('repairOrderId is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('amount must be > 0'),
    body('method').isIn(['cash', 'card', 'upi', 'bank_transfer']).withMessage('invalid method'),
    body('transactionId').optional().isString(),
    body('paidAt').optional().isISO8601(),
    body('notes').optional().isString(),
  ],
  handleValidation,
  createPayment
);

export default router;
