import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AuthLayout from '@/components/auth/AuthLayout'

const Register: React.FC = () => {
  const { signupStart, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (step === 'form') {
        await signupStart({ email, firstName, lastName, phone })
        setStep('otp')
      } else {
        await verifyOtp(email, otp)
        navigate('/', { replace: true })
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle={step === 'form' ? 'Join ElectroFix to manage your repairs with ease.' : 'We sent a 6‑digit code to your email to verify your account.'}
      rightTitle="Delight your customers with transparency"
      rightSubtitle="From drop‑off to delivery, keep everyone in the loop."
    >
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        {step === 'form' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">First name</label>
                <input className="input" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Last name</label>
                <input className="input" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Phone (optional)</label>
              <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <button className="btn w-full" disabled={loading}>{loading ? 'Sending OTP…' : 'Send OTP'}</button>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700">One‑Time Passcode</label>
              <input className="input tracking-widest" placeholder="Enter 6‑digit code" type="text" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} required />
              <p className="text-xs text-slate-500 mt-1">Didn’t receive the code? Check spam folder.</p>
            </div>
            <button className="btn w-full" disabled={loading}>{loading ? 'Verifying…' : 'Verify & Continue'}</button>
          </>
        )}
      </form>
      <p className="text-sm text-slate-600 mt-4 text-center">
        Already have an account? <Link className="link" to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}

export default Register
