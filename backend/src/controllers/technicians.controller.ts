import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import TechnicianProfile from '../models/TechnicianProfile'

export async function getMyTechnicianProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })
    let profile = await TechnicianProfile.findOne({ where: { userId: req.user.id } })
    // If missing, create a default profile so the UI always has a record
    if (!profile) {
      profile = await TechnicianProfile.create({
        userId: req.user.id,
        skills: [],
        dailyCapacity: 8,
        timezone: null,
        color: null,
      } as any)
    }
    return res.status(200).json({ profile })
  } catch (err) {
    console.error('Get my technician profile error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export async function upsertMyTechnicianProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' })
    const { skills, dailyCapacity, timezone, color } = req.body || {}

    let profile = await TechnicianProfile.findOne({ where: { userId: req.user.id } })
    if (!profile) {
      profile = await TechnicianProfile.create({
        userId: req.user.id,
        skills: Array.isArray(skills) ? skills : [],
        dailyCapacity: Number.isFinite(dailyCapacity) ? Number(dailyCapacity) : 8,
        timezone: timezone ?? null,
        color: color ?? null,
      } as any)
    } else {
      if (skills != null) (profile as any).skills = Array.isArray(skills) ? skills : (profile as any).skills
      if (dailyCapacity != null) (profile as any).dailyCapacity = Number(dailyCapacity)
      if (timezone != null) (profile as any).timezone = timezone
      if (color != null) (profile as any).color = color
      await (profile as any).save?.()
    }

    return res.status(200).json({ profile })
  } catch (err) {
    console.error('Upsert my technician profile error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
