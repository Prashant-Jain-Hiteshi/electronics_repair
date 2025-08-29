import SlaPolicy from '../models/SlaPolicy';
import { Priority, RepairStatus } from '../models/RepairOrder';

export type SlaBadge = 'on_track' | 'at_risk' | 'breached' | 'no_policy';

export interface SlaComputed {
  status: SlaBadge;
  progressPct: number; // 0..100 capped
  policy?: { resolutionHours: number; atRiskThresholdPct: number } | null;
}

export async function computeSLAForRepair(repair: any): Promise<SlaComputed> {
  try {
    if (!repair) return { status: 'no_policy', progressPct: 0, policy: null };
    if ([RepairStatus.COMPLETED, RepairStatus.DELIVERED, RepairStatus.CANCELLED].includes(repair.status)) {
      return { status: 'on_track', progressPct: 0, policy: null };
    }
    const deviceType = String(repair.deviceType || '').toLowerCase();
    const priority = String(repair.priority || Priority.MEDIUM).toLowerCase();
    const policy = await SlaPolicy.findOne({ where: { deviceType, priority } as any, raw: true });
    if (!policy) return { status: 'no_policy', progressPct: 0, policy: null };

    const start = new Date(repair.createdAt);
    const now = new Date();
    const elapsedMs = now.getTime() - start.getTime();
    const allowedMs = Number((policy as any).resolutionHours || 0) * 3600 * 1000;
    if (!allowedMs || allowedMs <= 0) return { status: 'no_policy', progressPct: 0, policy: null };

    const pct = Math.min(100, Math.max(0, Math.floor((elapsedMs / allowedMs) * 100)));
    const atRiskThreshold = Number((policy as any).atRiskThresholdPct || 80);

    if (pct >= 100) return { status: 'breached', progressPct: 100, policy: { resolutionHours: (policy as any).resolutionHours, atRiskThresholdPct: atRiskThreshold } };
    if (pct >= atRiskThreshold) return { status: 'at_risk', progressPct: pct, policy: { resolutionHours: (policy as any).resolutionHours, atRiskThresholdPct: atRiskThreshold } };
    return { status: 'on_track', progressPct: pct, policy: { resolutionHours: (policy as any).resolutionHours, atRiskThresholdPct: atRiskThreshold } };
  } catch {
    return { status: 'no_policy', progressPct: 0, policy: null };
  }
}
