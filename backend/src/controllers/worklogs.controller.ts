import { Request, Response } from 'express'
import { Op, fn, col, literal } from 'sequelize'
import { WorkLog, RepairOrder, User } from '../models'

// Start a timer for a technician on a repair
export async function startWorkLog(req: Request, res: Response) {
  try {
    const technicianId = (req as any).user?.id as string
    const { repairOrderId, taskType, benchId, notes } = req.body || {}
    if (!repairOrderId || !taskType) {
      return res.status(400).json({ message: 'repairOrderId and taskType are required' })
    }

    // Validate repair exists
    const repair = await RepairOrder.findByPk(repairOrderId)
    if (!repair) return res.status(404).json({ message: 'Repair not found' })

    // Ensure no running log for this technician on this repair
    const running = await WorkLog.findOne({ where: { repairOrderId, technicianId, status: 'running' } })
    if (running) return res.status(400).json({ message: 'A timer is already running for this repair' })

    const log = await WorkLog.create({
      repairOrderId,
      technicianId,
      taskType,
      benchId: benchId || null,
      notes: notes || null,
      startTime: new Date(),
      status: 'running',
    })

    return res.json({ log })
  } catch (e) {
    return res.status(500).json({ message: 'Failed to start timer' })
  }
}

// Stop a timer (complete)
export async function stopWorkLog(req: Request, res: Response) {
  try {
    const id = req.params.id
    const log = await WorkLog.findByPk(id)
    if (!log) return res.status(404).json({ message: 'WorkLog not found' })
    if (log.status !== 'running') return res.status(400).json({ message: 'WorkLog is not running' })

    log.endTime = new Date()
    log.status = 'completed'
    await log.save()

    return res.json({ log })
  } catch (e) {
    return res.status(500).json({ message: 'Failed to stop timer' })
  }
}

// Abort a timer (optional)
export async function abortWorkLog(req: Request, res: Response) {
  try {
    const id = req.params.id
    const log = await WorkLog.findByPk(id)
    if (!log) return res.status(404).json({ message: 'WorkLog not found' })
    if (log.status !== 'running') return res.status(400).json({ message: 'WorkLog is not running' })

    log.endTime = new Date()
    log.status = 'aborted'
    await log.save()

    return res.json({ log })
  } catch (e) {
    return res.status(500).json({ message: 'Failed to abort timer' })
  }
}

// Active (running) log for a technician+repair
export async function activeLog(req: Request, res: Response) {
  try {
    const technicianId = (req as any).user?.id as string
    const { repairOrderId } = req.params
    const log = await WorkLog.findOne({ where: { repairOrderId, technicianId, status: 'running' } })
    return res.json({ log })
  } catch (e) {
    return res.status(500).json({ message: 'Failed to fetch active log' })
  }
}

// List logs (admin or self)
export async function listWorkLogs(req: Request, res: Response) {
  try {
    const { repairOrderId, technicianId, status, from, to } = req.query as Record<string, string>
    const where: any = {}
    if (repairOrderId) where.repairOrderId = repairOrderId
    if (technicianId) where.technicianId = technicianId
    if (status) where.status = status
    if (from || to) where.startTime = {}
    if (from) where.startTime[Op.gte] = new Date(from)
    if (to) where.startTime[Op.lte] = new Date(to)

    const logs = await WorkLog.findAll({ where, order: [['startTime', 'DESC']] })
    return res.json({ logs })
  } catch (e) {
    return res.status(500).json({ message: 'Failed to list work logs' })
  }
}

// Report: Productive hours per technician within window
export async function reportProductiveHours(req: Request, res: Response) {
  try {
    const { from, to, technicianId } = req.query as Record<string, string>
    const start = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 3600 * 1000)
    const end = to ? new Date(to) : new Date()

    // Only completed logs count towards productive hours
    const logs = await WorkLog.findAll({
      where: {
        status: 'completed',
        startTime: { [Op.lte]: end },
        endTime: { [Op.gte]: start },
        ...(technicianId ? { technicianId } : {}),
      },
      attributes: ['technicianId', 'startTime', 'endTime'],
      order: [['technicianId', 'ASC']],
    })

    const totals: Record<string, number> = {}
    for (const l of logs as any[]) {
      const s = Math.max(new Date(l.startTime).getTime(), start.getTime())
      const e = Math.min(new Date(l.endTime).getTime(), end.getTime())
      if (e > s) totals[l.technicianId] = (totals[l.technicianId] || 0) + (e - s)
    }

    return res.json({ window: { from: start, to: end }, totalsMs: totals })
  } catch (e) {
    return res.status(500).json({ message: 'Failed to generate report' })
  }
}

// Report: Bench utilization = occupied time / window
export async function reportBenchUtilization(req: Request, res: Response) {
  try {
    const { from, to, benchId } = req.query as Record<string, string>
    const start = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 3600 * 1000)
    const end = to ? new Date(to) : new Date()

    const where: any = {
      status: { [Op.in]: ['running', 'completed'] },
      startTime: { [Op.lte]: end },
      endTime: { [Op.or]: [{ [Op.eq]: null }, { [Op.gte]: start }] },
    }
    if (benchId) where.benchId = benchId

    const logs = await WorkLog.findAll({ where, attributes: ['benchId', 'startTime', 'endTime'] })

    const totals: Record<string, number> = {}
    for (const l of logs as any[]) {
      const s = Math.max(new Date(l.startTime).getTime(), start.getTime())
      const e = Math.min(new Date((l.endTime || new Date()).getTime()).getTime(), end.getTime())
      if (e > s) totals[l.benchId || 'unassigned'] = (totals[l.benchId || 'unassigned'] || 0) + (e - s)
    }

    const windowMs = Math.max(1, end.getTime() - start.getTime())
    const utilization = Object.fromEntries(Object.entries(totals).map(([bench, ms]) => [bench, (ms as number) / windowMs]))

    return res.json({ window: { from: start, to: end }, utilization })
  } catch (e) {
    return res.status(500).json({ message: 'Failed to generate bench utilization' })
  }
}
