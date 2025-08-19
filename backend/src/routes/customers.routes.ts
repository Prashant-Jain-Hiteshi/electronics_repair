import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  getMyProfile,
  listAllCustomers,
  updateMyProfile,
  adminGetCustomer,
  adminCreateCustomer,
  adminUpdateCustomer,
  adminDeleteCustomer,
} from '../controllers/customers.controller';
import { body, param } from 'express-validator';
import { handleValidation } from '../middleware/validate';

const router = Router();

// Admin: list all customers
router.get('/', requireAuth, requireRole(['admin']), listAllCustomers);
// Admin: get a customer by id
router.get(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  [param('id').isString()],
  handleValidation,
  adminGetCustomer
);
// Admin: create a customer (creates User + Customer)
router.post(
  '/',
  requireAuth,
  requireRole(['admin']),
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('phone').optional().isString(),
  ],
  handleValidation,
  adminCreateCustomer
);
// Admin: update a customer (updates User basic info + Customer profile fields)
router.put(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  [param('id').isString()],
  handleValidation,
  adminUpdateCustomer
);
// Admin: delete/deactivate a customer (soft delete user)
router.delete(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  [param('id').isString()],
  handleValidation,
  adminDeleteCustomer
);

// Customer: view/update own profile
router.get('/me', requireAuth, requireRole(['customer']), getMyProfile);
router.put('/me', requireAuth, requireRole(['customer']), updateMyProfile);

export default router;
