import { Op, fn, col, literal, Sequelize } from 'sequelize'
import AnalyticsRollup from '../models/AnalyticsRollup'
import Payment from '../models/Payment'
import RepairOrder, { RepairStatus } from '../models/RepairOrder'

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
  // Run every 15 minutes: flag overdue repairs
  const run = async () => {
    try {
      const now = new Date()
      const overdue = await RepairOrder.findAll({
        where: {
          status: { [Op.in]: [RepairStatus.PENDING, RepairStatus.IN_PROGRESS, RepairStatus.AWAITING_PARTS] as any } as any,
          estimatedCompletionDate: { [Op.ne]: null as any, [Op.lt]: now as any } as any,
        } as any,
        raw: true,
      })
      if (overdue.length) {
        console.warn(`SLA check: ${overdue.length} repair(s) overdue as of ${now.toISOString()}`)
      }
    } catch (err) {
      console.error('SLA job error:', err)
    }
  }
  run().catch(()=>{})
  return setInterval(run, 15 * 60 * 1000)
}

export function startBackgroundJobs() {
  const timers = [startAnalyticsRollups(), startSLAChecks()]
  return () => timers.forEach(clearInterval)
}
