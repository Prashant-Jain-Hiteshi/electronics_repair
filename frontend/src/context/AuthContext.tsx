 import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
 import { api } from '@/api/client'

 export type User = {
  id: string
  mobile: string
  role: 'admin' | 'technician' | 'customer'
  firstName: string
  lastName: string
  address?: string | null
}

 type AuthState = {
  user: User | null
  token: string | null
  loading: boolean
  requestOtp: (mobile: string) => Promise<{ exists: boolean; otp: string }>
  verifyOtp: (payload: { mobile: string; otp: string; firstName?: string; lastName?: string; address?: string }) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'))
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const init = async () => {
      if (token) {
        try {
          await fetchMe()
        } catch {
          setUser(null)
          setToken(null)
          localStorage.removeItem('auth_token')
        }
      }
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const requestOtp = async (mobile: string) => {
    const { data } = await api.post('/auth/request-otp', { mobile })
    return { exists: !!data?.exists, otp: String(data?.otp || '') }
  }

  const verifyOtp = async (payload: { mobile: string; otp: string; firstName?: string; lastName?: string; address?: string }) => {
    const { data } = await api.post('/auth/verify-otp', payload)
    const tk: string | undefined = data?.token
    const u: User | undefined = data?.user
    if (tk) {
      localStorage.setItem('auth_token', tk)
      setToken(tk)
    }
    if (u) setUser(u)
    if (!u) await fetchMe()
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    setToken(null)
  }

  const fetchMe = async () => {
    const { data } = await api.get('/auth/me')
    setUser(data?.user)
  }

  const value = useMemo(
    () => ({ user, token, loading, requestOtp, verifyOtp, logout, fetchMe }),
    [user, token, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
