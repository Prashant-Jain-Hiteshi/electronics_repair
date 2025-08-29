import { Request, Response } from 'express'
import sequelize from '../config/database'
import Payment from '../models/Payment'
import RepairOrder from '../models/RepairOrder'
import User, { UserRole } from '../models/User'
import { Op, fn, col, literal, Sequelize } from 'sequelize'

// GET /api/analytics/revenue?range=daily|weekly|monthly&from=&to=
export async function revenueBreakdown(req: Request, res: Response) {
  try {
    const range = String((req.query.range as string) || 'daily')
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null

    const where: any = {}
    if (from) where.paidAt = { [Op.gte]: from }
    if (to) where.paidAt = { ...(where.paidAt || {}), [Op.lte]: to }

    const unit = range === 'monthly' ? 'month' : range === 'weekly' ? 'week' : 'day'
    const bucketExpr = literal(`date_trunc('${unit}', "paidAt")`) as unknown as Sequelize | any

    const rows = await Payment.findAll({
      attributes: [
        [bucketExpr as any, 'bucket'],
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count'],
      ] as any,
      where,
      group: [bucketExpr as any] as any,
      order: [[bucketExpr as any, 'ASC']] as any,
      raw: true,
    })

    return res.status(200).json({ range, rows })
  } catch (err) {
    console.error('Revenue breakdown error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }

}

// GET /api/analytics/repairs?groupBy=month|technician|device
export async function repairsAggregation(req: Request, res: Response) {
  try {
    const groupBy = String((req.query.groupBy as string) || 'month')
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    const technicianId = req.query.technicianId ? String(req.query.technicianId) : null
    const deviceType = req.query.deviceType ? String(req.query.deviceType) : null

    const where: any = {}
    if (from) where.updatedAt = { [Op.gte]: from }
    if (to) where.updatedAt = { ...(where.updatedAt || {}), [Op.lte]: to }
    if (technicianId) where.technicianId = technicianId as any
    if (deviceType) where.deviceType = deviceType as any

    if (groupBy === 'technician') {
      const rows = await RepairOrder.findAll({
        attributes: [
          'technicianId',
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { technicianId: { [Op.ne]: null } as any, ...(where || {}) },
        group: ['technicianId'],
        raw: true,
      })
      const techIds = rows.map((r: any) => r.technicianId)
      const techs = await User.findAll({ where: { id: { [Op.in]: techIds as any } as any, role: UserRole.TECHNICIAN as any } as any })
      const map = new Map(techs.map((t: any) => [t.id, t.name || t.email || t.id]))
      return res.status(200).json({ rows: rows.map((r: any) => ({ technicianId: r.technicianId, technician: map.get(r.technicianId) || r.technicianId, count: Number(r.count) })) })
    }

    if (groupBy === 'device') {
      const rows = await RepairOrder.findAll({
        attributes: [
          'deviceType',
          [fn('COUNT', col('id')), 'count'],
        ],
        where,
        group: ['deviceType'],
        raw: true,
      })
      return res.status(200).json({ rows: rows.map((r: any) => ({ deviceType: r.deviceType || 'Unknown', count: Number(r.count) })) })
    }

    // default month grouping using updatedAt
    const monthExpr = literal(`date_trunc('month', "updatedAt")`) as unknown as Sequelize | any
    const rows = await RepairOrder.findAll({
      attributes: [
        [monthExpr as any, 'bucket'],
        [fn('COUNT', col('id')), 'count'],
      ] as any,
      where,
      group: [monthExpr as any] as any,
      order: [[monthExpr as any, 'ASC']] as any,
      raw: true,
    })
    return res.status(200).json({ rows })
  } catch (err) {
    console.error('Repairs aggregation error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
// GET /api/analytics/turnaround-distribution?from=&to=
// Buckets completion time (hours) for completed repairs
export async function turnaroundDistribution(req: Request, res: Response) {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    const replacements: any = {}
    let where = `WHERE r.status = 'completed' AND r."actualCompletionDate" IS NOT NULL`
    if (from) { where += ` AND r."actualCompletionDate" >= :from`; replacements.from = from }
    if (to) { where += ` AND r."actualCompletionDate" <= :to`; replacements.to = to }

    const [rows]: any = await sequelize.query(
      `WITH diffs AS (
         SELECT
           r.id,
           EXTRACT(EPOCH FROM (r."actualCompletionDate" - r."createdAt")) / 3600.0 AS hours
         FROM repair_orders r
         ${where}
       )
       SELECT
         SUM(CASE WHEN hours < 4 THEN 1 ELSE 0 END)                AS lt_4,
         SUM(CASE WHEN hours >= 4  AND hours < 8 THEN 1 ELSE 0 END)  AS b4_8,
         SUM(CASE WHEN hours >= 8  AND hours < 24 THEN 1 ELSE 0 END) AS b8_24,
         SUM(CASE WHEN hours >= 24 AND hours < 48 THEN 1 ELSE 0 END) AS b24_48,
         SUM(CASE WHEN hours >= 48 AND hours < 72 THEN 1 ELSE 0 END) AS b48_72,
         SUM(CASE WHEN hours >= 72 THEN 1 ELSE 0 END)                AS gte_72,
         COUNT(*) AS total
       FROM diffs`,
      { replacements }
    )
    const r = (rows && rows[0]) || {}
    return res.status(200).json({
      buckets: [
        { label: '<4h', value: Number(r.lt_4 || 0) },
        { label: '4-8h', value: Number(r.b4_8 || 0) },
        { label: '8-24h', value: Number(r.b8_24 || 0) },
        { label: '24-48h', value: Number(r.b24_48 || 0) },
        { label: '48-72h', value: Number(r.b48_72 || 0) },
        { label: '≥72h', value: Number(r.gte_72 || 0) },
      ],
      total: Number(r.total || 0),
    })
  } catch (err) {
    console.error('Turnaround distribution error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/analytics/first-pass-fix?from=&to=
// Approximate FPFR as completed repairs with no part usage entries
export async function firstPassFixRate(req: Request, res: Response) {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    const replacements: any = {}
    let dateClause = ''
    if (from) { dateClause += ' AND r."actualCompletionDate" >= :from'; replacements.from = from }
    if (to) { dateClause += ' AND r."actualCompletionDate" <= :to'; replacements.to = to }

    const [rows]: any = await sequelize.query(
      `WITH completed AS (
         SELECT r.id
         FROM repair_orders r
         WHERE r.status = 'completed' AND r."actualCompletionDate" IS NOT NULL${dateClause}
       ),
       usage_counts AS (
         SELECT iu."repairOrderId" AS rid, COUNT(*) AS cnt
         FROM inventory_usage iu
         WHERE iu."repairOrderId" IS NOT NULL AND iu.reason = 'usage'
         GROUP BY iu."repairOrderId"
       )
       SELECT 
         (SELECT COUNT(*) FROM completed) AS total,
         COALESCE(SUM(CASE WHEN COALESCE(u.cnt,0) = 0 THEN 1 ELSE 0 END),0) AS first_pass
       FROM completed c
       LEFT JOIN usage_counts u ON u.rid = c.id`,
      { replacements }
    )
    const r = (rows && rows[0]) || { total: 0, first_pass: 0 }
    const total = Number(r.total || 0)
    const firstPass = Number(r.first_pass || 0)
    const rate = total > 0 ? firstPass / total : 0
    return res.status(200).json({ total, firstPass, rate })
  } catch (err) {
    console.error('First pass fix error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/analytics/parts/costs?from=&to=&groupBy=category|device
export async function partUsageCosts(req: Request, res: Response) {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    const groupBy = String((req.query.groupBy as string) || 'category')
    const replacements: any = {}
    let dateClause = ''
    if (from) { dateClause += ' AND iu."createdAt" >= :from'; replacements.from = from }
    if (to) { dateClause += ' AND iu."createdAt" <= :to'; replacements.to = to }

    const groupCol = groupBy === 'device' ? 'r."deviceType"' : 'i.category'
    const [rows]: any = await sequelize.query(
      `SELECT ${groupCol} AS grp,
              COALESCE(SUM(CASE WHEN iu.quantityChange < 0 THEN (-iu.quantityChange) * i."unitCost" ELSE 0 END)::decimal, 0) AS cost,
              COALESCE(SUM(CASE WHEN iu.quantityChange < 0 THEN (-iu.quantityChange) ELSE 0 END), 0) AS units
       FROM inventory_usage iu
       JOIN inventory i ON i.id = iu."inventoryId"
       LEFT JOIN repair_orders r ON r.id = iu."repairOrderId"
       WHERE iu.reason = 'usage'${dateClause}
       GROUP BY ${groupCol}
       ORDER BY cost DESC`,
      { replacements }
    )
    return res.status(200).json({ groupBy, rows: (rows || []).map((r: any) => ({ group: r.grp || 'Unknown', cost: Number(r.cost || 0), units: Number(r.units || 0) })) })
  } catch (err) {
    console.error('Part usage costs error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/analytics/revenue/cohorts?months=6
// Customer revenue cohorts by first purchase month
export async function revenueCohorts(req: Request, res: Response) {
  try {
    const months = Math.max(1, Math.min(24, Number(req.query.months || 6)))
    const [rows]: any = await sequelize.query(
      `WITH firsts AS (
         SELECT c.id AS customer_id, date_trunc('month', MIN(p."paidAt")) AS cohort
         FROM customers c
         JOIN repair_orders r ON r."customerId" = c.id
         JOIN payments p ON p."repairOrderId" = r.id
         GROUP BY c.id
       ),
       rev AS (
         SELECT f.cohort,
                date_trunc('month', p."paidAt") AS paid_month,
                EXTRACT(YEAR FROM date_trunc('month', p."paidAt")) * 12 + EXTRACT(MONTH FROM date_trunc('month', p."paidAt")) -
                (EXTRACT(YEAR FROM f.cohort) * 12 + EXTRACT(MONTH FROM f.cohort)) AS month_offset,
                SUM(p.amount)::decimal AS revenue
         FROM firsts f
         JOIN repair_orders r ON r."customerId" = f.customer_id
         JOIN payments p ON p."repairOrderId" = r.id
         GROUP BY f.cohort, paid_month, month_offset
       )
       SELECT to_char(cohort, 'YYYY-MM') AS cohort,
              month_offset,
              COALESCE(SUM(revenue),0) AS revenue
       FROM rev
       WHERE month_offset >= 0 AND month_offset < :months
       GROUP BY cohort, month_offset
       ORDER BY cohort ASC, month_offset ASC`,
      { replacements: { months } }
    )
    const byCohort = new Map<string, Array<{ monthOffset: number; revenue: number }>>()
    for (const r of rows || []) {
      const key = String(r.cohort)
      const arr = byCohort.get(key) || []
      arr.push({ monthOffset: Number(r.month_offset || 0), revenue: Number(r.revenue || 0) })
      byCohort.set(key, arr)
    }
    const series = Array.from(byCohort.entries()).map(([cohort, arr]) => ({
      cohort,
      points: Array.from({ length: months }, (_, i) => {
        const found = arr.find(x => x.monthOffset === i)
        return { monthOffset: i, revenue: found ? found.revenue : 0 }
      })
    }))
    return res.status(200).json({ months, series })
  } catch (err) {
    console.error('Revenue cohorts error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/analytics/technicians/status -> online technician IDs
export async function technicianStatus(_req: Request, res: Response) {
  try {
    // dynamic import to avoid circular
    const { getOnlineTechnicians } = await import('../socket')
    const online = getOnlineTechnicians()
    return res.status(200).json({ online: Array.from(online) })
  } catch (err) {
    console.error('Technician status error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/analytics/technicians/current-status
// Returns { technicians: [{ id, name, online, onJob }] }
export async function techniciansCurrentStatus(_req: Request, res: Response) {
  try {
    const techs = await User.findAll({ where: { role: UserRole.TECHNICIAN as any } as any, raw: true })
    const ids = techs.map((t: any) => t.id)

    // Count in-progress per technician
    const inProg = await RepairOrder.findAll({
      attributes: ['technicianId', [fn('COUNT', col('id')), 'cnt']],
      where: { technicianId: { [Op.in]: ids as any } as any, status: 'in_progress' as any },
      group: ['technicianId'],
      raw: true,
    })
    const inProgCountMap = new Map<string, number>(inProg.map((r: any) => [String(r.technicianId), Number(r.cnt) || 0]))
    const onJobMap = new Map<string, boolean>(inProg.map((r: any) => [String(r.technicianId), Number(r.cnt) > 0]))

    // Count completed per technician
    const completed = await RepairOrder.findAll({
      attributes: ['technicianId', [fn('COUNT', col('id')), 'cnt']],
      where: { technicianId: { [Op.in]: ids as any } as any, status: 'completed' as any },
      group: ['technicianId'],
      raw: true,
    })
    const completedMap = new Map<string, number>(completed.map((r: any) => [String(r.technicianId), Number(r.cnt) || 0]))

    // Total assigned per technician (any status)
    const totals = await RepairOrder.findAll({
      attributes: ['technicianId', [fn('COUNT', col('id')), 'cnt']],
      where: { technicianId: { [Op.in]: ids as any } as any },
      group: ['technicianId'],
      raw: true,
    })
    const totalMap = new Map<string, number>(totals.map((r: any) => [String(r.technicianId), Number(r.cnt) || 0]))

    const { getOnlineTechnicians } = await import('../socket')
    const online = getOnlineTechnicians()

    const technicians = techs.map((t: any) => ({
      id: t.id,
      name: `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.mobile || t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      mobile: t.mobile,
      address: t.address,
      isActive: !!t.isActive,
      isVerified: !!t.isVerified,
      online: online.has(String(t.id)),
      onJob: !!onJobMap.get(String(t.id)),
      stats: {
        totalAssigned: totalMap.get(String(t.id)) || 0,
        inProgress: inProgCountMap.get(String(t.id)) || 0,
        completed: completedMap.get(String(t.id)) || 0,
      },
    }))
    return res.status(200).json({ technicians })
  } catch (err) {
    console.error('Technicians current status error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/analytics/technicians/performance?from=&to=
export async function technicianPerformance(req: Request, res: Response) {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    const where: any = { technicianId: { [Op.ne]: null } as any }
    if (from) where.updatedAt = { [Op.gte]: from }
    if (to) where.updatedAt = { ...(where.updatedAt || {}), [Op.lte]: to }

    // Base metrics from RepairOrder
    const rows = await RepairOrder.findAll({
      attributes: [
        'technicianId',
        [fn('COUNT', col('id')), 'totalRepairs'],
        [fn('SUM', literal(`CASE WHEN status = 'completed' THEN 1 ELSE 0 END`)), 'completed'],
        // average completion time in hours for completed repairs
        [
          fn(
            'AVG',
            literal(`CASE WHEN status = 'completed' AND "actualCompletionDate" IS NOT NULL THEN EXTRACT(EPOCH FROM ("actualCompletionDate" - "createdAt")) / 3600 ELSE NULL END`)
          ),
          'avgCompletionHours',
        ],
      ],
      where,
      group: ['technicianId'],
      raw: true,
    })

    // Revenue per technician via Payments joined through RepairOrder (raw query for simplicity)
    // Apply optional date filters to paidAt as well
    const replacements: any = {}
    let revenueWhere = ''
    if (from) { revenueWhere += ' AND p."paidAt" >= :from'; replacements.from = from }
    if (to) { revenueWhere += ' AND p."paidAt" <= :to'; replacements.to = to }
    const [revRows]: any = await sequelize.query(
      `SELECT r."technicianId" as "technicianId", COALESCE(SUM(p.amount)::decimal, 0) as revenue
       FROM payments p
       JOIN repair_orders r ON r.id = p."repairOrderId"
       WHERE r."technicianId" IS NOT NULL${revenueWhere}
       GROUP BY r."technicianId"`,
      { replacements }
    )
    const revenueMap = new Map<string, number>((revRows || []).map((r: any) => [String(r.technicianId), Number(r.revenue || 0)]))

    const techIds = rows.map((r: any) => r.technicianId)
    const techs = await User.findAll({ where: { id: { [Op.in]: techIds as any } as any, role: UserRole.TECHNICIAN as any } as any })
    const map = new Map(techs.map((t: any) => [t.id, t.name || t.email || t.id]))

    return res.status(200).json({
      rows: rows.map((r: any) => ({
        technicianId: r.technicianId,
        technician: map.get(r.technicianId) || r.technicianId,
        totalRepairs: Number(r.totalRepairs || 0),
        completed: Number(r.completed || 0),
        avgCompletionHours: r.avgCompletionHours != null ? Number(r.avgCompletionHours) : null,
        revenue: Number(revenueMap.get(String(r.technicianId)) || 0),
      })),
    })
  } catch (err) {
    console.error('Technician performance error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
