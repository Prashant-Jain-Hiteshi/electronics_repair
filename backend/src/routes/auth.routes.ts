 import { Router } from 'express';
 import { body } from 'express-validator';
 import { requestOtp, verifyOtp, me, promoteUser, listTechnicians } from '../controllers/auth.controller';
 import { requireAuth, requireRole } from '../middleware/auth';
 import { handleValidation } from '../middleware/validate';

const router = Router();

// Unified step 1: request OTP by mobile (login or signup)
router.post(
  '/request-otp',
  [body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Valid Indian mobile is required')],
  handleValidation,
  requestOtp
);
// Unified step 2: verify OTP (if new user, include profile fields)
router.post(
  '/verify-otp',
  [
    body('mobile').matches(/^[6-9]\d{9}$/),
    body('otp').isLength({ min: 6, max: 6 }),
    body('firstName').optional().isString(),
    body('lastName').optional().isString(),
    body('address').optional().isString(),
  ],
  handleValidation,
  verifyOtp
);
router.post(
  '/promote',
  [
    body('role').isIn(['admin', 'technician', 'customer']),
    body('userId').optional().isString(),
    body('mobile').optional().matches(/^[6-9]\d{9}$/),
  ],
  handleValidation,
  requireAuth,
  requireRole(['admin']),
  promoteUser
);
router.get('/me', requireAuth, me);
router.get('/technicians', requireAuth, requireRole(['admin']), listTechnicians);

export default router;
