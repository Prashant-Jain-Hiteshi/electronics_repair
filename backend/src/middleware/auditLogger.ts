import { Request, Response, NextFunction } from 'express'

export function auditLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now()
    const user = (req as any).user || null
    const id = (req as any).requestId

    const done = () => {
      res.removeListener('finish', done)
      res.removeListener('close', done)
      const ms = Date.now() - start
      const payload = {
        ts: new Date(start).toISOString(),
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: ms,
        requestId: id,
        userId: user?.id || null,
        ip: req.ip,
        ua: req.headers['user-agent'] || null,
      }
      try {
        const line = `[audit] ${payload.ts} ${payload.method} ${payload.path} -> ${payload.status} ${payload.durationMs}ms user=${payload.userId || '-'} reqId=${payload.requestId || '-'}`
        if (payload.status >= 500) console.error(line)
        else console.log(line)
      } catch {}
    }

    res.on('finish', done)
    res.on('close', done)
    next()
  }
}
