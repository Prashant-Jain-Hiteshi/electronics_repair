import { Request, Response, NextFunction } from 'express'
import xss from 'xss'

// JSON-like type without any/unknown
export type Json = string | number | boolean | null | Json[] | { [k: string]: Json }

// Recursively sanitize strings in objects/arrays
function sanitizeValue(v: Json): Json {
  if (typeof v === 'string') {
    const trimmed = v.trim()
    // Basic XSS sanitize; keep it conservative for backend text
    return xss(trimmed)
  }
  if (Array.isArray(v)) return v.map(sanitizeValue)
  if (v && typeof v === 'object') {
    const out: { [k: string]: Json } = {}
    for (const [k, val] of Object.entries(v)) {
      out[k] = sanitizeValue(val as Json)
    }
    return out
  }
  return v
}

export function sanitizeRequest() {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.body) req.body = sanitizeValue(req.body as Json) as never
      if (req.query) req.query = sanitizeValue(req.query as unknown as Json) as never
      if (req.params) req.params = sanitizeValue(req.params as unknown as Json) as never
    } catch {
      // do not block request on sanitize failure
    }
    next()
  }
}
