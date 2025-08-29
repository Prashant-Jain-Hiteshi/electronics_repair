import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import type { Request } from 'express'
import type { FileFilterCallback } from 'multer'
import { body, param } from 'express-validator'
import { requireAuth, requireRole } from '../middleware/auth'
import { handleValidation } from '../middleware/validate'
import { createRma, listMyRmas, getRmaById } from '../controllers/rma.controller'

// Ensure temp dir exists
const TMP_DIR = 'uploads/rma_tmp'
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })

// Restrict to images only
const rmaFileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => void = (_req, file, cb) => {
  const ok = /^(image\/(jpeg|jpg|png|webp))$/i.test(file.mimetype)
  if (!ok) return cb(new Error('Only JPG, PNG, WEBP images are allowed'))
  cb(null, true)
}

// For initial RMA creation, accept any image files; controller moves to uploads/rma/:id
const uploadTmp = multer({ dest: TMP_DIR + '/', fileFilter: rmaFileFilter, limits: { fileSize: 5 * 1024 * 1024 } })

const router = Router()

// Customer: create an RMA ticket (within warranty)
router.post(
  '/',
  requireAuth,
  requireRole(['customer']),
  uploadTmp.any(),
  [
    body('repairOrderId').isString().notEmpty(),
    body('reason').optional().isString(),
    body('description').optional().isString(),
  ],
  handleValidation,
  createRma
)

// Customer: list own RMA tickets
router.get('/mine', requireAuth, requireRole(['customer']), listMyRmas)

// Customer/Admin/Technician: get RMA by id (customer restricted to own)
router.get(
  '/:id',
  requireAuth,
  requireRole(['customer', 'technician', 'admin']),
  [param('id').isString()],
  handleValidation,
  getRmaById
)

export default router
