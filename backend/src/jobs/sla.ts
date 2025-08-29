import { Op } from 'sequelize'
import RepairOrder, { Priority, RepairStatus } from '../models/RepairOrder'
import SlaPolicy from '../models/SlaPolicy'
import EscalationLog from '../models/EscalationLog'

function hoursBetween(a: Date, b: Date) {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60)
}

export async function runSlaChecks() {
  // Consider only active statuses
  const activeStatuses: RepairStatus[] = [
    RepairStatus.PENDING,
    RepairStatus.IN_PROGRESS,
    RepairStatus.AWAITING_PARTS,
  ]

  const now = new Date()
  const repairs = await RepairOrder.findAll({
    where: { status: { [Op.in]: activeStatuses } as any },
    raw: false,
  })

  // Load policies once
  const policies = await SlaPolicy.findAll()

  const policyKey = (deviceType: string, priority: string) => `${(deviceType||'').toLowerCase()}__${(priority||'').toLowerCase()}`
  const map = new Map<string, { resolutionHours: number; atRiskThresholdPct: number }>()
  for (const p of policies as any[]) {
    map.set(policyKey(p.deviceType, p.priority), { resolutionHours: Number(p.resolutionHours||48), atRiskThresholdPct: Number(p.atRiskThresholdPct||80) })
  }

  for (const r of repairs as any[]) {
    const key = policyKey(r.deviceType, r.priority)
    const policy = map.get(key)
    if (!policy) continue

    const startedAt = r.createdAt as Date
    const elapsedHrs = hoursBetween(startedAt, now)
    const pct = (elapsedHrs / policy.resolutionHours) * 100

    // Determine level
    let level: 'at_risk' | 'breach' | null = null
    if (pct >= 100) level = 'breach'
    else if (pct >= policy.atRiskThresholdPct) level = 'at_risk'

    if (level) {
      await EscalationLog.create({ repairOrderId: r.id, level })
    }
  }
}
