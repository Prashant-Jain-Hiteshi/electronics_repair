import { Transaction } from 'sequelize';
import { AuditLog } from '../models';
import { AuthRequest } from '../middleware/auth';

export type AuditDetails = Record<string, any> | null | undefined;

export async function logAudit(
  req: Partial<AuthRequest> | undefined,
  entityType: string,
  entityId: string,
  action: string,
  details?: AuditDetails,
  options?: { transaction?: Transaction }
) {
  try {
    const userId = (req as any)?.user?.id || null;
    const ip = (req as any)?.ip || (req as any)?.headers?.['x-forwarded-for'] || null;
    const userAgent = (req as any)?.headers?.['user-agent'] || null;

    await AuditLog.create(
      {
        userId,
        entityType,
        entityId,
        action,
        details: details || null,
        ip: typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : null,
        userAgent: typeof userAgent === 'string' ? userAgent : null,
      } as any,
      { transaction: options?.transaction }
    );
  } catch (e) {
    // Do not throw; audit failures should not block main flow.
    // eslint-disable-next-line no-console
    console.warn('Audit log failed:', e);
  }
}
