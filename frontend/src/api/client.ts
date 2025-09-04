import axios, { type InternalAxiosRequestConfig } from 'axios'

let baseURL = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined
if (!baseURL || typeof baseURL !== 'string' || baseURL.trim() === '') {
  baseURL = 'http://localhost:5000/api'
  try { console.info('[api] VITE_API_BASE_URL not set. Using fallback:', baseURL) } catch {}
} else {
  try { console.info('[api] Base URL:', baseURL) } catch {}
}

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    // Prevent caching to avoid 304 Not Modified with empty bodies
    'Cache-Control': 'no-store',
  },
  // Always include credentials so cookies (e.g., CSRF secret) are sent
  withCredentials: true,
})

// Attach token from localStorage if present
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
  if (token) {
    if (typeof config.headers?.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`)
    } else {
      // Fallback for edge cases
      (config.headers as any) = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
      }
    }
  }
  // Add anti-cache headers on GET requests to ensure fresh JSON
  const method = (config.method || 'get').toLowerCase()
  if (method === 'get') {
    if (typeof config.headers?.set === 'function') {
      config.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      config.headers.set('Pragma', 'no-cache')
      config.headers.set('Expires', '0')
      config.headers.set('If-Modified-Since', '0')
    } else {
      (config.headers as any) = {
        ...(config.headers || {}),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'If-Modified-Since': '0',
      }
    }
  }
  return config
})

// Attach CSRF token for write requests
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const method = (config.method || 'get').toUpperCase()
  const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  if (!isWrite) return config
  const token = await ensureCsrfToken()
  if (token && token !== 'DISABLED') {
    if (typeof config.headers?.set === 'function') config.headers.set('X-CSRF-Token', token)
    else (config.headers as any) = { ...(config.headers || {}), 'X-CSRF-Token': token }
  }
  return config
})

// Lazy CSRF token cache (populated on first write request)
let __csrfToken: string | null = null
async function ensureCsrfToken() {
  if (__csrfToken) return __csrfToken
  try {
    const resp = await fetch(`${baseURL?.replace(/\/$/, '') || ''}/csrf-token`, { credentials: 'include' })
    if (resp.status === 204) {
      // CSRF disabled on server; nothing to attach
      __csrfToken = 'DISABLED'
      return __csrfToken
    }
    if (!resp.ok) throw new Error('Failed to fetch CSRF token')
    const data = await resp.json().catch(() => ({}))
    __csrfToken = (data && data.token) || null
    return __csrfToken
  } catch {
    // Fail open in dev if server disabled or unreachable; server will decide
    __csrfToken = 'DISABLED'
    return __csrfToken
  }
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

// Simple in-memory toast dedupe: avoid spamming identical errors in a short window
let lastToastKey = ''
let lastToastAt = 0
const shouldToast = (key: string, windowMs = 2500) => {
  const now = Date.now()
  if (key === lastToastKey && now - lastToastAt < windowMs) return false
  lastToastKey = key
  lastToastAt = now
  return true
}

// Response interceptor: normalize errors and broadcast a global toast event
api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Network or CORS error without response
    const status = error?.response?.status
    const data = error?.response?.data || {}
    const serverMsg = typeof data?.error?.message === 'string'
      ? data.error.message
      : typeof data?.message === 'string'
      ? data.message
      : undefined
    const fallbackMsg = status === 401
      ? 'You are not authorized. Please login again.'
      : status === 403
      ? 'You do not have permission to perform this action.'
      : status === 404
      ? 'The requested resource was not found.'
      : status && status >= 500
      ? 'Something went wrong on the server. Please try again later.'
      : 'Request failed. Please try again.'

    const normalized: ApiError = {
      message: serverMsg || fallbackMsg,
      errors: (data && typeof data === 'object' && (data.errors || data?.error?.errors)) ? (data.errors || data.error.errors) : undefined,
    }

    try {
      const method = error?.config?.method?.toUpperCase?.() || 'GET'
      const url = error?.config?.url || baseURL || ''
      console.error('[api] Request failed', {
        method,
        url,
        status,
        message: normalized.message,
        server: data,
      })
    } catch {}

    try {
      // Emit a global toast event that the App can listen to
      const toastKey = `${error?.config?.method||'get'}:${error?.config?.url||''}:${normalized.message}`
      if (shouldToast(toastKey)) {
        window.dispatchEvent(new CustomEvent('app:toast', {
          detail: { kind: 'error', message: normalized.message },
        }))
      }
    } catch {}

    // Ensure consumers always receive a consistent shape in e.response.data
    if (error && error.response) {
      error.response.data = normalized
    }
    return Promise.reject(error)
  }
)
