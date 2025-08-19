import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const payload = jwt.verify(token, secret) as any;
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}
