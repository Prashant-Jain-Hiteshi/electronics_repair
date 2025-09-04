import DOMPurify from 'dompurify'

// Configure DOMPurify once
const purifier = DOMPurify

export function sanitizeHTML(html: string): string {
  return purifier.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  })
}

export function sanitizeString(input: string | null | undefined): string {
  if (!input) return ''
  return purifier.sanitize(String(input), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

export function sanitizeObject<T = any>(obj: T): T {
  if (obj == null) return obj
  if (typeof obj === 'string') return sanitizeString(obj) as unknown as T
  if (Array.isArray(obj)) return obj.map(sanitizeObject) as unknown as T
  if (typeof obj === 'object') {
    const out: any = {}
    for (const [k, v] of Object.entries(obj as any)) {
      out[k] = sanitizeObject(v)
    }
    return out
  }
  return obj
}
