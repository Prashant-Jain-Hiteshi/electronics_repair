import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { body } from 'express-validator'
import { handleValidation } from '../middleware/validate'
import { getMyUser, updateMyUser, uploadMyAvatar } from '../controllers/users.controller'
import { avatarUpload } from '../middleware/upload'

const router = Router()

// All roles: view/update own basic user profile
router.get('/me', requireAuth, getMyUser)
router.put(
  '/me',
  requireAuth,
  [
    body('firstName').optional().isString(),
    body('lastName').optional().isString(),
    body('address').optional().isString(),
    body('mobile').optional().matches(/^\d{10}$/).withMessage('mobile must be exactly 10 digits'),
  ],
  handleValidation,
  updateMyUser
)

// Upload avatar
router.post('/me/avatar', requireAuth, avatarUpload.single('avatar'), uploadMyAvatar)

export default router
