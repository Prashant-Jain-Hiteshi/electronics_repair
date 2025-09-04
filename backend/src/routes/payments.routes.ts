import { Router } from 'express';
import { body, param } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  listAllPayments,
  listMyPayments,
  listTechnicianPayments,
  createPayment,
  listPaymentsForRepair,
  createPaymentIntent,
  confirmPaymentIntent,
  cancelPaymentIntent,
  refundPayment,
  getInvoiceForRepair,
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
router.get(
  '/repair/:id',
  requireAuth,
  requireRole(['customer', 'technician', 'admin']),
  [param('id').isUUID()],
  handleValidation,
  listPaymentsForRepair
);

// Admin/Technician: create a payment
router.post(
  '/',
  requireAuth,
  requireRole(['admin', 'technician', 'customer']),
  [
    body('repairOrderId').isUUID().withMessage('repairOrderId must be a valid UUID'),
    body('amount').isFloat({ gt: 0 }).withMessage('amount must be > 0'),
    body('method').isIn(['cash', 'card', 'upi', 'bank_transfer']).withMessage('invalid method'),
    body('transactionId').optional().isString(),
    body('paidAt').optional().isISO8601(),
    body('notes').optional().isString(),
  ],
  handleValidation,
  createPayment
);

// Payment Intent: create
router.post(
  '/intents',
  requireAuth,
  requireRole(['admin', 'technician', 'customer']),
  [
    body('repairOrderId').isUUID(),
    body('amount').isFloat({ gt: 0 }),
    body('method').isIn(['cash', 'card', 'upi', 'bank_transfer']),
    body('provider').optional().isIn(['manual', 'stripe', 'upi']),
    body('kind').optional().isIn(['deposit', 'partial', 'final', 'refund']),
    body('currencyCode').optional().isString(),
  ],
  handleValidation,
  createPaymentIntent
);

// Payment Intent: confirm
router.post(
  '/intents/:id/confirm',
  requireAuth,
  requireRole(['admin', 'technician', 'customer']),
  [body('transactionId').optional().isString()],
  handleValidation,
  confirmPaymentIntent
);

// Payment Intent: cancel
router.post(
  '/intents/:id/cancel',
  requireAuth,
  requireRole(['admin', 'technician', 'customer']),
  cancelPaymentIntent
);

// Refund a payment (admin only)
router.post(
  '/:id/refund',
  requireAuth,
  requireRole(['admin']),
  [body('amount').optional().isFloat({ gt: 0 }), body('notes').optional().isString()],
  handleValidation,
  refundPayment
);

// Generate invoice for a repair order
router.get(
  '/invoice/repair/:id',
  requireAuth,
  requireRole(['admin', 'technician', 'customer']),
  [param('id').isUUID()],
  handleValidation,
  getInvoiceForRepair
);

export default router;
