import axios, { type InternalAxiosRequestConfig } from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL as string

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
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
  return config
})

export type ApiError = {
  message?: string
  errors?: Record<string, string[]>
}

// Response interceptor: normalize errors and broadcast a global toast event
api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Network or CORS error without response
    const status = error?.response?.status
    const data = error?.response?.data || {}
    const serverMsg = typeof data?.message === 'string' ? data.message : undefined
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
      errors: (data && typeof data === 'object' && data.errors) ? data.errors : undefined,
    }

    try {
      // Emit a global toast event that the App can listen to
      window.dispatchEvent(new CustomEvent('app:toast', {
        detail: { kind: 'error', message: normalized.message },
      }))
    } catch {}

    // Ensure consumers always receive a consistent shape in e.response.data
    if (error && error.response) {
      error.response.data = normalized
    }
    return Promise.reject(error)
  }
)
