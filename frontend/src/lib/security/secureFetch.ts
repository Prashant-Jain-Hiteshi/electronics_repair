// A minimal secure fetch wrapper that:
// - Ensures credentials are included for CSRF cookie
// - Fetches and caches a CSRF token from /api/csrf-token
// - Adds X-CSRF-Token header for write requests
// - Provides a simple in-memory rate limiter per method+path

let csrfToken: string | null = null

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken
  const resp = await fetch('/api/csrf-token', { credentials: 'include' })
  if (!resp.ok) throw new Error('Failed to fetch CSRF token')
  const data = await resp.json()
  csrfToken = data?.token || null
  if (!csrfToken) throw new Error('Invalid CSRF token response')
  return csrfToken
}

// Simple token bucket per key (method+path)
const buckets = new Map<string, { tokens: number; lastRefill: number }>()
const RATE = 10 // tokens
const INTERVAL_MS = 10000 // per 10s

function rateLimitKey(method: string, path: string) {
  return `${method.toUpperCase()} ${path}`
}

function checkRateLimit(method: string, path: string) {
  const key = rateLimitKey(method, path)
  const now = Date.now()
  const bucket = buckets.get(key) || { tokens: RATE, lastRefill: now }
  const elapsed = now - bucket.lastRefill
  if (elapsed > INTERVAL_MS) {
    bucket.tokens = RATE
    bucket.lastRefill = now
  }
  if (bucket.tokens <= 0) return false
  bucket.tokens -= 1
  buckets.set(key, bucket)
  return true
}

export async function secureFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as URL).toString()
  const method = (init.method || 'GET').toUpperCase()

  // Rate limit
  if (!checkRateLimit(method, url)) {
    const e: any = new Error('Too many requests (client-side rate limit)')
    e.status = 429
    throw e
  }

  const headers = new Headers(init.headers || {})
  const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(method)

  if (isWrite) {
    const token = await getCsrfToken()
    headers.set('X-CSRF-Token', token)
  }

  // Always include credentials so CSRF cookie is sent
  const resp = await fetch(input, {
    ...init,
    credentials: 'include',
    headers,
  })

  return resp
}
