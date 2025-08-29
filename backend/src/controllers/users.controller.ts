import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import User from '../models/User'
import path from 'path'

export async function getMyUser(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })
    const user = await User.findByPk(req.user.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    return res.status(200).json({ user: user.toJSON() })
  } catch (err) {
    console.error('Get my user error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function uploadMyAvatar(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })
    const user = await User.findByPk(req.user.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    // multer sets req.file
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) return res.status(400).json({ message: 'No file uploaded' })

    const rel = `/uploads/avatars/${path.basename(file.path)}`
    ;(user as any).avatarUrl = rel
    await user.save()

    return res.status(200).json({ user: user.toJSON() })
  } catch (err) {
    console.error('Upload avatar error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
export async function updateMyUser(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })
    const user = await User.findByPk(req.user.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const { firstName, lastName, address, mobile } = req.body || {}
    if (firstName != null) (user as any).firstName = firstName
    if (lastName != null) (user as any).lastName = lastName
    if (address != null) (user as any).address = address
    if (mobile != null) (user as any).mobile = mobile
    await user.save()

    return res.status(200).json({ user: user.toJSON() })
  } catch (err) {
    console.error('Update my user error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
