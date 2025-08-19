import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { body, param } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  listAllRepairs,
  listMyRepairs,
  createRepair,
  updateRepair,
  listRepairParts,
  addRepairPart,
  removeRepairPart,
  getRepairInvoice,
  getRepairById,
  assignTechnician,
  adminOverview,
  deleteRepair,
} from '../controllers/repairs.controller';
import { handleValidation } from '../middleware/validate';
import { listAttachments, uploadAttachments, deleteAttachment } from '../controllers/attachments.controller';
import { cancelRepair } from '../controllers/repairs.controller';

const router = Router();
// Simple upload config for createRepair; stores files under uploads/repairs
const upload = multer({ dest: 'uploads/repairs/' });

// Attachments upload config: save to uploads/repairs/:id preserving extension
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const id = (req.params as any).id || 'misc';
    const dir = path.join('uploads', 'repairs', id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    let ext = path.extname(file.originalname) || '';
    if (!ext) {
      if (/jpeg|jpg/i.test(file.mimetype)) ext = '.jpg';
      else if (/png/i.test(file.mimetype)) ext = '.png';
      else if (/webp/i.test(file.mimetype)) ext = '.webp';
    }
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ok = /^(image\/(jpeg|jpg|png|webp))$/i.test(file.mimetype);
  if (!ok) return cb(new Error('Only JPG, PNG, WEBP images are allowed'));
  cb(null, true);
};
const uploadAtt = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Admin/Technicians: manage repair orders
router.get('/', requireAuth, requireRole(['technician', 'admin']), listAllRepairs);
// Admin: overview stats
router.get('/overview', requireAuth, requireRole(['admin']), adminOverview);
// Customers: view their own repair orders
router.get('/mine', requireAuth, requireRole(['customer']), listMyRepairs);
// View single repair (customer: own; technician/admin: any)
router.get('/:id', requireAuth, requireRole(['customer', 'technician', 'admin']), getRepairById);
// Allow creating repair orders by customers (for their own requests) and technicians/admin
router.post('/', requireAuth, requireRole(['customer', 'technician', 'admin']), upload.array('images', 6), createRepair);
router.put('/:id', requireAuth, requireRole(['technician', 'admin']), updateRepair);
// Admin: delete repair order
router.delete('/:id', requireAuth, requireRole(['admin']), deleteRepair);
// Allow customers to cancel their own pending repairs; technicians can also cancel
router.put('/:id/cancel', requireAuth, requireRole(['customer', 'technician', 'admin']), cancelRepair);

// Admin: assign technician to a repair order
router.put('/:id/assign', requireAuth, requireRole(['admin']), assignTechnician);

// Attachments: list, upload (1-3), delete
router.get('/:id/attachments', requireAuth, requireRole(['customer', 'technician', 'admin']), [param('id').isString()], handleValidation, listAttachments);
router.post(
  '/:id/attachments',
  requireAuth,
  requireRole(['customer', 'technician', 'admin']),
  [param('id').isString()],
  handleValidation,
  uploadAtt.array('files', 3),
  uploadAttachments
);
router.delete(
  '/:id/attachments/:attachmentId',
  requireAuth,
  requireRole(['customer', 'technician', 'admin']),
  [param('id').isString(), param('attachmentId').isString()],
  handleValidation,
  deleteAttachment
);

// Parts linking endpoints (Admin/Technician)
router.get(
  '/:id/parts',
  requireAuth,
  requireRole(['admin', 'technician', 'customer']),
  [param('id').isString()],
  handleValidation,
  listRepairParts
);
router.post(
  '/:id/parts',
  requireAuth,
  requireRole(['admin', 'technician']),
  [
    param('id').isString(),
    body('inventoryId').isString(),
    body('quantity').isInt({ gt: 0 }),
    body('unitPrice').optional().isFloat({ gt: 0 }),
  ],
  handleValidation,
  addRepairPart
);
router.delete(
  '/:id/parts/:repairPartId',
  requireAuth,
  requireRole(['admin', 'technician']),
  [param('id').isString(), param('repairPartId').isString()],
  handleValidation,
  removeRepairPart
);

// Invoice endpoint (Admin/Technician)
router.get(
  '/:id/invoice',
  requireAuth,
  requireRole(['admin', 'technician', 'customer']),
  [param('id').isString()],
  handleValidation,
  getRepairInvoice
);

export default router;
