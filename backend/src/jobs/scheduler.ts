import { Op, fn, col, literal, Sequelize } from 'sequelize'
import AnalyticsRollup from '../models/AnalyticsRollup'
import Payment from '../models/Payment'
import RepairOrder, { RepairStatus, Priority } from '../models/RepairOrder'
import SlaPolicy from '../models/SlaPolicy'
import EscalationLog from '../models/EscalationLog'
import { emitToRole, emitToUser } from '../socket'

function startAnalyticsRollups() {
  // Run every hour: roll up daily revenue for last 30 days
  const run = async () => {
    try {
      const to = new Date()
      const from = new Date(Date.now() - 30 * 24 * 3600 * 1000)
      const bucketExpr = literal(`date_trunc('day', "paidAt")`) as unknown as Sequelize | any
      const rows = await Payment.findAll({
        attributes: [[bucketExpr as any, 'bucket'], [fn('SUM', col('amount')), 'total']],
        where: { paidAt: { [Op.gte]: from, [Op.lte]: to } as any } as any,
        group: [bucketExpr as any] as any,
        raw: true,
      }) as any[]

      for (const r of rows) {
        const bucket = new Date(r.bucket)
        const value = Number(r.total || 0)
        await AnalyticsRollup.upsert({ metric: 'revenue.daily', bucket, value })
      }
    } catch (err) {
      console.error('Rollup job error:', err)
    }
  }
  run().catch(()=>{})
  return setInterval(run, 60 * 60 * 1000)
}

function startSLAChecks() {
  // Run every 5 minutes: evaluate SLA status and create escalation logs + notifications
  const run = async () => {
    try {
      const now = new Date()
      const openRepairs = await RepairOrder.findAll({
        where: {
          status: { [Op.in]: [RepairStatus.PENDING, RepairStatus.IN_PROGRESS, RepairStatus.AWAITING_PARTS] as any } as any,
        } as any,
        raw: true,
      }) as any[]

      if (!openRepairs.length) return

      // Fetch policies once and map by deviceType|priority
      const policies = await SlaPolicy.findAll({ raw: true }) as any[]
      const policyMap = new Map<string, any>()
      for (const p of policies) {
        policyMap.set(`${String(p.deviceType).toLowerCase()}|${String(p.priority).toLowerCase()}`, p)
      }

      for (const r of openRepairs) {
        const key = `${String(r.deviceType || '').toLowerCase()}|${String(r.priority || Priority.MEDIUM).toLowerCase()}`
        const policy = policyMap.get(key)
        if (!policy) continue

        // Use createdAt as start time by default
        const start = new Date(r.createdAt)
        const elapsedMs = now.getTime() - start.getTime()
        const allowedMs = Number(policy.resolutionHours || 0) * 3600 * 1000
        if (!allowedMs || allowedMs <= 0) continue

        const pct = Math.min(100, Math.max(0, Math.floor((elapsedMs / allowedMs) * 100)))
        const atRiskThreshold = Number(policy.atRiskThresholdPct || 80)
        const isAtRisk = pct >= atRiskThreshold && pct < 100
        const isBreached = pct >= 100

        if (!isAtRisk && !isBreached) continue

        // Check last escalation to prevent duplicates within same state
        const lastLog = await EscalationLog.findOne({
          where: { repairOrderId: r.id } as any,
          order: [['createdAt', 'DESC']] as any,
        }) as any
        const lastLevel = lastLog?.level as 'at_risk' | 'breach' | undefined

        let newLevel: 'at_risk' | 'breach' | null = null
        if (isBreached && lastLevel !== 'breach') newLevel = 'breach'
        else if (isAtRisk && lastLevel !== 'at_risk' && lastLevel !== 'breach') newLevel = 'at_risk'

        if (!newLevel) continue

        const log = await EscalationLog.create({
          repairOrderId: r.id,
          level: newLevel,
          technicianId: r.technicianId || null,
          managerId: null,
          note: newLevel === 'breach' ? `SLA breached (${pct}%)` : `SLA at risk (${pct}%)`,
        } as any)

        // Notify assigned technician
        try {
          if (r.technicianId) {
            emitToUser(String(r.technicianId), 'tech:notification:new', {
              kind: 'sla',
              level: newLevel,
              repairId: r.id,
              title: newLevel === 'breach' ? 'SLA Breached' : 'SLA At Risk',
              message: `${r.deviceType} ${r.brand} ${r.model} - ${newLevel.replace('_', ' ')}`,
              createdAt: new Date().toISOString(),
            })
          }
        } catch {}

        // Notify managers/admins
        try {
          emitToRole('admin', 'admin:notification:new', {
            kind: 'sla',
            level: newLevel,
            repairId: r.id,
            title: newLevel === 'breach' ? 'SLA Breached' : 'SLA At Risk',
            message: `${r.deviceType} ${r.brand} ${r.model} - ${newLevel.replace('_', ' ')}`,
            createdAt: new Date().toISOString(),
          })
        } catch {}
      }
    } catch (err) {
      console.error('SLA job error:', err)
    }
  }
  run().catch(()=>{})
  return setInterval(run, 5 * 60 * 1000)
}

export function startBackgroundJobs() {
  const timers = [startAnalyticsRollups(), startSLAChecks()]
  return () => timers.forEach(clearInterval)
}
