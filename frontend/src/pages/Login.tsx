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
  // Inline field errors
  const [mobileError, setMobileError] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [firstNameError, setFirstNameError] = useState<string | null>(null)
  const [lastNameError, setLastNameError] = useState<string | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    // reset inline errors
    setMobileError(null)
    setOtpError(null)
    setFirstNameError(null)
    setLastNameError(null)
    setAddressError(null)
    setLoading(true)
    try {
      if (step === 'mobile') {
        // Validate: exactly 10 digits
        if (!/^\d{10}$/.test(mobile)) {
          setMobileError('Enter a valid 10‑digit mobile number')
          return
        }
        const { exists } = await requestOtp(mobile)
        setIsExisting(exists)
        setStep('otp')
      } else {
        // Validate OTP: 6 digits
        if (!/^\d{6}$/.test(otp)) {
          setOtpError('Enter the 6‑digit OTP')
          return
        }
        // Validate new user fields when needed
        if (isExisting === false) {
          let hasError = false
          if (!firstName.trim()) { setFirstNameError('First name is required'); hasError = true }
          if (!lastName.trim()) { setLastNameError('Last name is required'); hasError = true }
          if (!address.trim()) { setAddressError('Address is required'); hasError = true }
          if (hasError) return
        }
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
      title={step === 'mobile' ? 'Sign in with Mobile' : 'OTP Verification'}
      subtitle={step === 'mobile' ? 'Enter your mobile number to receive a one‑time passcode (OTP).' : `Enter the 6‑digit code sent to +91 ${mobile}.`}
      rightTitle="Streamline Your Repair Workflow"
      rightSubtitle="Technicians and Admins get real‑time updates and a powerful dashboard"
    >
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
      )}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
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
              if (mobileError && /^\d{10}$/.test(digits)) setMobileError(null)
            }}
            onBlur={(e) => setMobile(e.target.value.trim())}
            disabled={step==='otp'}
          />
          {mobileError && <p className="text-xs text-red-600">{mobileError}</p>}
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
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
                setOtp(digits)
                if (otpError && /^\d{6}$/.test(digits)) setOtpError(null)
              }}
            />
            {otpError ? (
              <p className="text-xs text-red-600">{otpError}</p>
            ) : (
              <p className="text-xs text-slate-500">Didn’t receive the code? Check spam folder.</p>
            )}
          </div>
        )}

        {step === 'otp' && isExisting === false && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">First name</label>
              <input
                className="input"
                type="text"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); if (firstNameError && e.target.value.trim()) setFirstNameError(null) }}
              />
              {firstNameError && <p className="text-xs text-red-600">{firstNameError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Last name</label>
              <input
                className="input"
                type="text"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); if (lastNameError && e.target.value.trim()) setLastNameError(null) }}
              />
              {lastNameError && <p className="text-xs text-red-600">{lastNameError}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Address</label>
              <input
                className="input"
                type="text"
                value={address}
                onChange={(e) => { setAddress(e.target.value); if (addressError && e.target.value.trim()) setAddressError(null) }}
              />
              {addressError && <p className="text-xs text-red-600">{addressError}</p>}
            </div>
          </div>
        )}

        <button className="btn w-full" disabled={loading}>
          {loading ? (step==='mobile' ? 'Sending OTP…' : 'Verifying…') : (step==='mobile' ? 'Send OTP' : 'Verify & Continue')}
        </button>

        {step === 'otp' && (
          <div className="mt-2 text-center">
            <a
              href="#"
              className="text-sm text-[#A48AFB] hover:text-[#9a86f6] underline-offset-4 hover:underline transition-colors"
              onClick={(e) => {
                e.preventDefault()
                setStep('mobile')
                setOtp('')
                setError(null)
              }}
            >
              Use a different mobile number
            </a>
          </div>
        )}
      </form>

      <p className="text-sm text-slate-600 mt-4 text-center">
        {/* We’ll send a one‑time passcode (OTP) to verify your number. No password required. */}
      </p>
    </AuthLayout>
  )
}

export default Login
