import { Request, Response } from 'express';
import { Op, fn, col, literal, Sequelize } from 'sequelize';
import SlaPolicy from '../models/SlaPolicy';
import EscalationLog from '../models/EscalationLog';
import RepairOrder, { Priority } from '../models/RepairOrder';

export async function listPolicies(_req: Request, res: Response) {
  try {
    const items = await SlaPolicy.findAll({ order: [['deviceType', 'ASC'], ['priority', 'ASC']] });
    return res.status(200).json({ policies: items });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list policies' });
  }
}

export async function createPolicy(req: Request, res: Response) {
  try {
    const { deviceType, priority, resolutionHours, atRiskThresholdPct } = req.body || {};
    if (!deviceType || !priority) return res.status(400).json({ message: 'deviceType and priority are required' });
    const payload = {
      deviceType: String(deviceType).toLowerCase(),
      priority: String(priority).toLowerCase(),
      resolutionHours: Number(resolutionHours || 48),
      atRiskThresholdPct: Number(atRiskThresholdPct || 80),
    } as any;
    const existing = await SlaPolicy.findOne({ where: { deviceType: payload.deviceType, priority: payload.priority } as any });
    if (existing) return res.status(409).json({ message: 'Policy already exists for this deviceType and priority' });
    const created = await SlaPolicy.create(payload);
    return res.status(201).json({ policy: created });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create policy' });
  }
}

export async function updatePolicy(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const policy = await SlaPolicy.findByPk(id);
    if (!policy) return res.status(404).json({ message: 'Policy not found' });
    const body = req.body || {};
    if (body.deviceType != null) (policy as any).deviceType = String(body.deviceType).toLowerCase();
    if (body.priority != null) (policy as any).priority = String(body.priority).toLowerCase();
    if (body.resolutionHours != null) (policy as any).resolutionHours = Number(body.resolutionHours);
    if (body.atRiskThresholdPct != null) (policy as any).atRiskThresholdPct = Number(body.atRiskThresholdPct);
    await policy.save();
    return res.status(200).json({ policy });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update policy' });
  }
}

export async function deletePolicy(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const policy = await SlaPolicy.findByPk(id);
    if (!policy) return res.status(404).json({ message: 'Policy not found' });
    await policy.destroy();
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete policy' });
  }
}

export async function listEscalations(req: Request, res: Response) {
  try {
    const { repairId, level } = (req.query || {}) as Record<string, string | undefined>;
    const where: any = {};
    if (repairId) where.repairOrderId = repairId;
    if (level) where.level = level;
    const items = await EscalationLog.findAll({ where, order: [['createdAt', 'DESC']] as any });
    return res.status(200).json({ escalations: items });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list escalations' });
  }
}

// Basic analytics: breach % by deviceType, technician, priority in last 30 days
export async function slaAnalytics(_req: Request, res: Response) {
  try {
    const to = new Date();
    const from = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    // Count all open-or-closed repairs created in window by buckets
    const repairs = (await RepairOrder.findAll({ raw: true })) as any[];

    // Gather breaches in window by repairId
    const breaches = (await EscalationLog.findAll({
      where: { level: 'breach' as any, createdAt: { [Op.gte]: from as any, [Op.lte]: to as any } as any } as any,
      raw: true,
    })) as any[];
    const breachSet = new Set(breaches.map((b: any) => b.repairOrderId));

    // Compute buckets
    const byDevice: Record<string, { total: number; breached: number }> = {};
    const byTech: Record<string, { total: number; breached: number }> = {};
    const byPriority: Record<string, { total: number; breached: number }> = {};

    for (const r of repairs) {
      const dev = String(r.deviceType || 'unknown');
      const tech = String(r.technicianId || 'unassigned');
      const pri = String(r.priority || Priority.MEDIUM);
      byDevice[dev] = byDevice[dev] || { total: 0, breached: 0 };
      byTech[tech] = byTech[tech] || { total: 0, breached: 0 };
      byPriority[pri] = byPriority[pri] || { total: 0, breached: 0 };
      byDevice[dev].total++;
      byTech[tech].total++;
      byPriority[pri].total++;
      if (breachSet.has(r.id)) {
        byDevice[dev].breached++;
        byTech[tech].breached++;
        byPriority[pri].breached++;
      }
    }

    function toSeries(map: Record<string, { total: number; breached: number }>) {
      return Object.entries(map).map(([k, v]) => ({ key: k, total: v.total, breached: v.breached, breachPct: v.total ? Math.round((v.breached / v.total) * 100) : 0 }));
    }

    return res.status(200).json({
      range: { from: from.toISOString(), to: to.toISOString() },
      byDevice: toSeries(byDevice),
      byTechnician: toSeries(byTech),
      byPriority: toSeries(byPriority),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to build SLA analytics' });
  }
}
