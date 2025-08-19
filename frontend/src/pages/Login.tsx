import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/api/client'
import AuthLayout from '@/components/auth/AuthLayout'

const Login: React.FC = () => {
  const { requestLoginOtp, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as any
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (step === 'email') {
        await requestLoginOtp(email)
        setStep('otp')
      } else {
        await verifyOtp(email, otp)
        // Decide redirect: respect prior intent, else role-based default
        let redirect = location.state?.from?.pathname as string | undefined
        try {
          const { data } = await api.get('/auth/me')
          const role: string | undefined = data?.user?.role
          if (!redirect) redirect = role === 'admin' ? '/admin' : '/'
        } catch {
          if (!redirect) redirect = '/'
        }
        navigate(redirect!, { replace: true })
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome Back!"
      subtitle={step === 'email' ? 'Please login to your account.' : 'We sent a 6‑digit code to your email.'}
      rightTitle="Streamline Your Repair Workflow"
      rightSubtitle="Technicians and Admins get real‑time updates and a powerful dashboard"
    >
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            className="input"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={step==='otp'}
          />
        </div>

        {step === 'otp' && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">One‑Time Passcode</label>
            <input
              className="input tracking-widest"
              placeholder="Enter 6‑digit code"
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            <p className="text-xs text-slate-500">Didn’t receive the code? Check spam folder.</p>
          </div>
        )}

        <button className="btn w-full" disabled={loading}>
          {loading ? (step==='email' ? 'Sending OTP…' : 'Verifying…') : (step==='email' ? 'Send OTP' : 'Verify & Sign in')}
        </button>
      </form>

      <p className="text-sm text-slate-600 mt-4 text-center">
        Don’t have an account? <Link className="link" to="/register">Sign up</Link>
      </p>
    </AuthLayout>
  )
}

export default Login
