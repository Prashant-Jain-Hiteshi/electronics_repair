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
  const token = localStorage.getItem('auth_token')
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
