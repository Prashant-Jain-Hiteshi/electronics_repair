import { Router } from 'express';
import { body } from 'express-validator';
import { signup, loginRequestOtp, verifyOtp, me, promoteUser, listTechnicians } from '../controllers/auth.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';

const router = Router();

// Signup (no password) -> send OTP to email
router.post(
  '/signup',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('firstName').notEmpty().withMessage('firstName is required'),
    body('lastName').notEmpty().withMessage('lastName is required'),
    body('phone').optional().isString(),
  ],
  handleValidation,
  signup
);

// Login step 1: request OTP
router.post(
  '/login/request-otp',
  [body('email').isEmail()],
  handleValidation,
  loginRequestOtp
);
// Step 2: verify OTP (also used for signup verification)
router.post(
  '/verify-otp',
  [body('email').isEmail(), body('otp').isLength({ min: 4 })],
  handleValidation,
  verifyOtp
);
router.post(
  '/promote',
  [
    body('role').isIn(['admin', 'technician', 'customer']),
    body('userId').optional().isString(),
    body('email').optional().isEmail(),
  ],
  handleValidation,
  requireAuth,
  requireRole(['admin']),
  promoteUser
);
router.get('/me', requireAuth, me);
router.get('/technicians', requireAuth, requireRole(['admin']), listTechnicians);

export default router;
