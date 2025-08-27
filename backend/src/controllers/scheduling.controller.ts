import { Request, Response } from 'express'
import { Op } from 'sequelize'
import { AuthRequest } from '../middleware/auth'
import TechnicianSchedule from '../models/TechnicianSchedule'
import TechnicianProfile from '../models/TechnicianProfile'
import RepairOrder from '../models/RepairOrder'

// GET /technicians/:id/schedule
export async function getTechnicianSchedule(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params // technician userId
    const { start, end } = (req.query || {}) as { start?: string; end?: string }

    // Authorization: technicians can only view their own schedule
    const role = (req.user as any)?.role
    const userId = (req.user as any)?.id
    if (role === 'technician' && userId && userId !== id) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    // Optional time window
    const where: any = { technicianId: id }
    if (start || end) {
      const s = start ? new Date(start) : new Date(Date.now() - 7 * 24 * 3600 * 1000)
      const e = end ? new Date(end) : new Date(Date.now() + 30 * 24 * 3600 * 1000)
      where[Op.or] = [
        { start: { [Op.between]: [s, e] } },
        { end: { [Op.between]: [s, e] } },
        { start: { [Op.lte]: s }, end: { [Op.gte]: e } },
      ]
    }

    const [profile, events] = await Promise.all([
      TechnicianProfile.findOne({ where: { userId: id } as any }),
      TechnicianSchedule.findAll({ where, order: [['start', 'ASC']] as any }),
    ])

    // Attach repair info for assignment events
    const repairIds = events.map((e: any) => e.repairOrderId).filter(Boolean)
    const repairs = repairIds.length
      ? await RepairOrder.findAll({ where: { id: { [Op.in]: repairIds } as any } })
      : []
    const repairMap = new Map(repairs.map((r: any) => [r.id, r]))

    const daily: Record<string, { assignedUnits: number; events: any[] }> = {}
    const cap = (profile as any)?.dailyCapacity ?? 8

    for (const ev of events as any[]) {
      const dayKey = new Date(ev.start).toISOString().slice(0, 10)
      if (!daily[dayKey]) daily[dayKey] = { assignedUnits: 0, events: [] }
      if (ev.kind === 'assignment') daily[dayKey].assignedUnits += Number(ev.capacityUnits || 0)
      daily[dayKey].events.push({ ...ev.toJSON(), repair: ev.repairOrderId ? repairMap.get(ev.repairOrderId) || null : null })
    }

    const capacity = Object.entries(daily).map(([date, d]) => ({ date, assignedUnits: d.assignedUnits, capacity: cap, overbooked: d.assignedUnits > cap }))

    return res.status(200).json({ profile, events, capacity })
  } catch (err) {
    console.error('Get technician schedule error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
