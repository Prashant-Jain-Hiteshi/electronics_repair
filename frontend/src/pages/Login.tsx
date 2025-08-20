 import React, { useState } from 'react'
 import { Link, useLocation, useNavigate } from 'react-router-dom'
 import { useAuth } from '@/context/AuthContext'
 import { api } from '@/api/client'
 import AuthLayout from '@/components/auth/AuthLayout'

const Login: React.FC = () => {
  const { requestOtp, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as any
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile')
  const [isExisting, setIsExisting] = useState<boolean | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (step === 'mobile') {
        // Custom validation: exactly 10 digits
        if (!/^\d{10}$/.test(mobile)) {
          setError('Please enter exactly 10 digits')
          return
        }
        const { exists } = await requestOtp(mobile)
        setIsExisting(exists)
        setStep('otp')
      } else {
        await verifyOtp({
          mobile,
          otp,
          ...(isExisting ? {} : { firstName, lastName, address }),
        })
        // Decide redirect: force role-based default (ignore prior intent)
        try {
          const { data } = await api.get('/auth/me')
          const role: string | undefined = data?.user?.role
          const redirect = role === 'admin'
            ? '/admin'
            : role === 'technician'
              ? '/technician?tab=pending'
              : '/'
          navigate(redirect, { replace: true })
        } catch {
          navigate('/', { replace: true })
        }
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
      subtitle={step === 'mobile' ? 'Login with your mobile number.' : 'Enter the 6‑digit code we sent via SMS.'}
      rightTitle="Streamline Your Repair Workflow"
      rightSubtitle="Technicians and Admins get real‑time updates and a powerful dashboard"
    >
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">Mobile (India)</label>
          <input
            className="input"
            placeholder="9876543210"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={mobile}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
              setMobile(digits)
            }}
            onBlur={(e) => setMobile(e.target.value.trim())}
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

        {step === 'otp' && isExisting === false && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">First name</label>
              <input className="input" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Last name</label>
              <input className="input" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Address</label>
              <input className="input" type="text" value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
          </div>
        )}

        {step === 'otp' && (
          <button
            type="button"
            className="btn w-full"
            onClick={() => {
              setStep('mobile')
              setOtp('')
              setError(null)
            }}
            disabled={loading}
          >
            Back
          </button>
        )}

        <button className="btn w-full" disabled={loading}>
          {loading ? (step==='mobile' ? 'Sending OTP…' : 'Verifying…') : (step==='mobile' ? 'Send OTP' : 'Verify & Continue')}
        </button>
      </form>

      <p className="text-sm text-slate-600 mt-4 text-center">
        New user? Enter your mobile, request OTP, then fill your details on the next step.
      </p>
    </AuthLayout>
  )
}

export default Login
