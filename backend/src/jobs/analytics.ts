import { Op, fn, col } from 'sequelize'
import AnalyticsRollup from '../models/AnalyticsRollup'
import Payment from '../models/Payment'

// Roll up paid revenue per day (UTC) into AnalyticsRollup
export async function rollupDailyRevenue() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

  // Sum payments paid within [start, end)
  const rows = await Payment.findAll({
    attributes: [
      // bucket at 00:00 UTC for the payment day
      [fn('date_trunc', 'day', col('paidAt')), 'bucket'],
      [fn('sum', col('amount')), 'value'],
    ],
    where: { paidAt: { [Op.gte]: start, [Op.lt]: end } as any },
    group: [fn('date_trunc', 'day', col('paidAt')) as any],
    raw: true as any,
  }) as unknown as Array<{ bucket: Date; value: string | number }>

  if (rows.length === 0) {
    // Ensure we write zero for the day to avoid gaps (optional)
    await AnalyticsRollup.upsert({ metric: 'revenue.daily', bucket: start as any, value: 0 })
    return
  }

  for (const r of rows) {
    const bucket = new Date(r.bucket)
    const value = Number(r.value || 0)
    await AnalyticsRollup.upsert({ metric: 'revenue.daily', bucket: bucket as any, value })
  }
}

export async function runAnalyticsRollups() {
  try {
    await rollupDailyRevenue()
  } catch (e) {
    try { console.warn('[jobs] runAnalyticsRollups error', (e as any)?.message || e) } catch {}
  }
}
