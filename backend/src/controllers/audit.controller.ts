import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import { AuditLog } from '../models';

export async function listByEntity(req: AuthRequest, res: Response) {
  try {
    const { entityType, entityId, page = '1', pageSize = '20' } = (req.query || {}) as Record<string, string | undefined>;

    if (!entityType || !entityId) {
      return res.status(400).json({ message: 'entityType and entityId are required' });
    }

    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const offset = (p - 1) * ps;

    const { rows, count } = await (AuditLog as any).findAndCountAll({
      where: { entityType, entityId } as any,
      order: [['createdAt', 'DESC']] as any,
      limit: ps,
      offset,
    });

    return res.status(200).json({ logs: rows, total: count, page: p, pageSize: ps });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('List audit by entity error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listRecent(req: AuthRequest, res: Response) {
  try {
    const { q, page = '1', pageSize = '20' } = (req.query || {}) as Record<string, string | undefined>;
    const where: any = {};
    if (q && q.trim()) {
      const s = q.trim();
      where[Op.or] = [
        { action: { [Op.iLike as any]: `%${s}%` } as any },
        { entityType: { [Op.iLike as any]: `%${s}%` } as any },
        { userAgent: { [Op.iLike as any]: `%${s}%` } as any },
      ];
    }

    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const offset = (p - 1) * ps;

    const { rows, count } = await (AuditLog as any).findAndCountAll({
      where,
      order: [['createdAt', 'DESC']] as any,
      limit: ps,
      offset,
    });

    return res.status(200).json({ logs: rows, total: count, page: p, pageSize: ps });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('List recent audit error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
