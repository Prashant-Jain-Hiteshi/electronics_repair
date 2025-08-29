import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Ensure base upload directories exist
const baseDir = path.join(process.cwd(), 'uploads')
const avatarsDir = path.join(baseDir, 'avatars')
for (const p of [baseDir, avatarsDir]) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarsDir)
  },
  filename: (req: any, file, cb) => {
    const userId = req.user?.id || 'anon'
    const ext = path.extname(file.originalname) || '.jpg'
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext.toLowerCase()) ? ext : '.jpg'
    const name = `${userId}-${Date.now()}${safeExt}`
    cb(null, name)
  },
})

export const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
})
