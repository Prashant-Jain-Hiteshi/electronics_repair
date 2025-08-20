import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import ThemedSelect from '@/components/common/ThemedSelect'

const deviceTypes = [
  'Home Appliances',
  'Consumer Electronics',
  'Personal Devices',
  'Computer Accessories',
  'Other Electronics',
]

const CreateRepairOrder: React.FC = () => {
  const navigate = useNavigate()
  const [deviceType, setDeviceType] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [issue, setIssue] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [pickupAddress, setPickupAddress] = useState('')
  const base = (import.meta as any)?.env?.BASE_URL || '/'
  
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ [k: string]: string }>({})

  

  function validate() {
    const next: { [k: string]: string } = {}
    if (!deviceType.trim()) next.deviceType = 'Please select a device type.'
    if (!brand.trim()) next.brand = 'Brand is required.'
    if (!model.trim()) next.model = 'Model is required.'
    if (!deviceName.trim()) next.deviceName = 'Device name is required.'
    if (!issue.trim()) next.issue = 'Please describe the issue.'
    if (!pickupAddress.trim()) next.pickupAddress = 'Pickup address is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!validate()) return

    setSubmitting(true)
    try {
      const payload = {
        deviceType,
        deviceBrand: brand,
        deviceModel: model,
        issueDescription: issue,
        deviceName,
        pickupAddress,
      }
      // POST JSON payload (no images)
      const { data } = await api.post('/repairs', payload)

      setSuccess('Repair order created successfully!')
      // Navigate to the newly created repair details to verify images immediately
      if (data?.repair?.id) {
        navigate(`/repairs/${data.repair.id}`)
      } else {
        navigate('/')
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create repair order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header / Breadcrumb */}
      <div className="mb-4">
        {/* <div className="text-sm text-slate-300 mb-1">Home • My Orders • <span className="text-white">New Repair</span></div> */}
        <h1 className="text-2xl font-semibold tracking-tight text-white">Create Repair Order</h1>
        <p className="text-sm text-slate-300 mt-1">Tell us about your device and issue. We’ll assign the best technician for you.</p>
      </div>

      {/* Branded stacked card: animation/banner on top, form below */}
      <div className="rounded-2xl border auth-card backdrop-blur shadow-lg overflow-hidden">
        {/* Top: Branding / theme banner */}
        <div className="relative p-6 md:p-7 bg-gradient-to-br from-[#1a132b] via-[#3a2f6b] to-[#A48AFB] text-white">
          <div className="flex items-center gap-2">
            <img src={`${base}logo.svg`} alt="Electro-Repair" className="h-8 w-auto" />
            <div className="text-lg font-semibold">Electro-Repair</div>
          </div>

          <div className="mt-6 max-w-sm">
            <div className="text-xl font-semibold leading-tight">Trusted electronics repair</div>
            <p className="mt-2 text-white/90 text-sm">Quick turnarounds, expert care — every time.</p>
          </div>

          {/* Minimal badges */}
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur-sm animate-float-slow">Genuine parts</span>
            <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur-sm animate-float-rev">Doorstep pickup</span>
          </div>

          <div className="mt-6 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 animate-float-slow">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="text-yellow-200">★</span>
              ))}
            </div>
            <span className="text-white/90">4.9/5 based on 1,200+ repairs</span>
          </div>

          {/* Decorative pattern */}
          <svg className="pointer-events-none absolute -right-8 -bottom-8 opacity-20" width="160" height="160" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M20 0H0V20" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="200" height="200" fill="url(#grid)"/>
          </svg>

          {/* Animated circuit lines */}
          <svg className="pointer-events-none absolute inset-x-0 bottom-0 opacity-40" height="80" viewBox="0 0 600 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path className="animate-dash" d="M0 40 H120 Q140 40 150 25 T180 10 H240 Q260 10 270 25 T300 40 H360 Q380 40 390 25 T420 10 H600" stroke="white" strokeOpacity="0.7" strokeWidth="2"/>
            <circle cx="150" cy="25" r="3" fill="white" fillOpacity="0.8"/>
            <circle cx="270" cy="25" r="3" fill="white" fillOpacity="0.8"/>
            <circle cx="390" cy="25" r="3" fill="white" fillOpacity="0.8"/>
          </svg>

          {/* Decorative bubbles */}
          <span className="pointer-events-none absolute top-6 right-6 h-4 w-4 rounded-full bg-white/30 blur-[1px] animate-pulse-slow" />
          <span className="pointer-events-none absolute top-16 right-10 h-6 w-6 rounded-full bg-white/20 blur-[1px] animate-float-rev" />
          <span className="pointer-events-none absolute bottom-10 left-8 h-5 w-5 rounded-full bg-white/25 blur-[1px] animate-float-slow" />

          {/* Rotating gear icon */}
          <div className="pointer-events-none absolute bottom-5 right-5 opacity-90">
            <svg className="w-8 h-8 drop-shadow-sm animate-rotate-slow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 4c0-.46-.04-.92-.1-1.36l2.02-1.57-2-3.46-2.4 1a8.96 8.96 0 0 0-2.35-1.36l-.36-2.57H10.2l-.36 2.57c-.84.3-1.62.74-2.35 1.36l-2.4-1-2 3.46 2.02 1.57c-.06.44-.1.9-.1 1.36s.04.92.1 1.36L1.09 14.9l2 3.46 2.4-1c.73.62 1.51 1.06 2.35 1.36l.36 2.57h4.61l.36-2.57c.84-.3 1.62-.74 2.35-1.36l2.4 1 2-3.46-2.02-1.57c.06-.44.1-.9.1-1.36Z" fill="white" fillOpacity="0.5"/>
            </svg>
          </div>

          {/* Fast bubble layer */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* Bubbles: different sizes, positions, speeds */}
            <span className="bubble bubble-sm left-6" style={{ bottom: '-20px', animationDelay: '0s', animationDuration: '2.2s' }} />
            <span className="bubble bubble-md left-16" style={{ bottom: '-30px', animationDelay: '0.3s', animationDuration: '2.6s' }} />
            <span className="bubble bubble-xs left-28" style={{ bottom: '-18px', animationDelay: '0.6s', animationDuration: '1.9s' }} />
            <span className="bubble bubble-sm left-40" style={{ bottom: '-22px', animationDelay: '0.15s', animationDuration: '2.1s' }} />
            <span className="bubble bubble-lg left-56" style={{ bottom: '-36px', animationDelay: '0.45s', animationDuration: '3s' }} />
            <span className="bubble bubble-xs left-72" style={{ bottom: '-16px', animationDelay: '0.9s', animationDuration: '1.8s' }} />
            <span className="bubble bubble-sm left-3/4" style={{ bottom: '-20px', animationDelay: '0.2s', animationDuration: '2.3s' }} />
            <span className="bubble bubble-md left-[85%]" style={{ bottom: '-28px', animationDelay: '0.7s', animationDuration: '2.5s' }} />
          </div>
        </div>

        {/* Bottom: Form */}
        <div className="p-6 md:p-8 border-t border-white/10 bg-[#0f1117]">
          {error && <div className="mb-3 text-sm text-red-500">{error}</div>}
          {success && <div className="mb-3 text-sm" style={{color:'#A48AFB'}}>{success}</div>}

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Device Type</label>
                <ThemedSelect
                  options={deviceTypes}
                  value={deviceType}
                  onChange={setDeviceType}
                  placeholder="Select type"
                />
                <p className="text-xs text-slate-300 mt-1">E.g., Laptop, Phone, Tablet</p>
                {errors.deviceType && <p className="text-xs text-red-400 mt-1">{errors.deviceType}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Brand</label>
                <input
                  className={`input border bg-transparent text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A48AFB] focus:border-[#A48AFB] ${errors.brand ? 'border-red-500 ring-2 ring-red-500' : 'border-white/10'}`}
                  value={brand}
                  onChange={(e) => { setBrand(e.target.value); if (errors.brand) setErrors(prev => ({ ...prev, brand: '' })) }}
                  placeholder="Apple, Samsung, Dell..."
                />
                {errors.brand && <p className="text-xs text-red-400 mt-1">{errors.brand}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Model</label>
                <input
                  className={`input border bg-transparent text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A48AFB] focus:border-[#A48AFB] ${errors.model ? 'border-red-500 ring-2 ring-red-500' : 'border-white/10'}`}
                  value={model}
                  onChange={(e) => { setModel(e.target.value); if (errors.model) setErrors(prev => ({ ...prev, model: '' })) }}
                  placeholder="Model name or number"
                />
                {errors.model && <p className="text-xs text-red-400 mt-1">{errors.model}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Device Name</label>
                <input
                  className={`input border bg-transparent text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A48AFB] focus:border-[#A48AFB] ${errors.deviceName ? 'border-red-500 ring-2 ring-red-500' : 'border-white/10'}`}
                  value={deviceName}
                  onChange={(e) => { setDeviceName(e.target.value); if (errors.deviceName) setErrors(prev => ({ ...prev, deviceName: '' })) }}
                  placeholder="Washing machine, TV, Mobile phone"
                />
                {errors.deviceName && <p className="text-xs text-red-400 mt-1">{errors.deviceName}</p>}
              </div>
              
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">Issue Description</label>
              <textarea
                className={`input min-h[120px] border bg-transparent text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A48AFB] focus:border-[#A48AFB] ${errors.issue ? 'border-red-500 ring-2 ring-red-500' : 'border-white/10'}`}
                value={issue}
                onChange={(e) => { setIssue(e.target.value); if (errors.issue) setErrors(prev => ({ ...prev, issue: '' })) }}
                placeholder="Describe the problem in detail (symptoms, when it started, any liquids/shocks, etc.)"
              />
              {errors.issue && <p className="text-xs text-red-400 mt-1">{errors.issue}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">Pickup Address</label>
              <textarea
                className={`input min-h-[90px] border bg-transparent text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A48AFB] focus:border-[#A48AFB] ${errors.pickupAddress ? 'border-red-500 ring-2 ring-red-500' : 'border-white/10'}`}
                value={pickupAddress}
                onChange={(e) => { setPickupAddress(e.target.value); if (errors.pickupAddress) setErrors(prev => ({ ...prev, pickupAddress: '' })) }}
                placeholder="House/Flat, Street, Area, City, Pincode, Contact instructions"
              />
              {errors.pickupAddress && <p className="text-xs text-red-400 mt-1">{errors.pickupAddress}</p>}
            </div>

            

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div className="text-xs text-slate-300">By submitting, you agree to our service terms and data policy.</div>
              <div className="flex items-center gap-3">
                <button className="btn" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</button>
                <button type="button" className="inline-flex items-center justify-center rounded-md border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5" onClick={() => navigate(-1)}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      </div>
      {/* Local keyframes for subtle animations */}
      <style>{`
        @keyframes floatY { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes floatYrev { 0%,100% { transform: translateY(0) } 50% { transform: translateY(5px) } }
        @keyframes rotate360 { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes dash { to { stroke-dashoffset: -400 } }
        @keyframes bubbleUp { 
          0% { transform: translateY(0) scale(1); opacity: 0.0 }
          10% { opacity: 0.8 }
          100% { transform: translateY(-140%) scale(1.08); opacity: 0.0 }
        }
        /* Faster durations for highlighted animation */
        .animate-float-slow { animation: floatY 6s ease-in-out infinite; }
        .animate-float-rev { animation: floatYrev 7s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse 1.6s ease-in-out infinite; }
        .animate-rotate-slow { animation: rotate360 10s linear infinite; transform-origin: center; }
        .animate-dash { stroke-dasharray: 8 6; stroke-dashoffset: 0; animation: dash 3.2s linear infinite; }
        .bubble { position: absolute; background: rgba(255,255,255,0.35); filter: blur(0.5px); border-radius: 9999px; animation-name: bubbleUp; animation-iteration-count: infinite; animation-timing-function: cubic-bezier(0.45, 0.05, 0.55, 0.95); }
        .bubble-xs { width: 6px; height: 6px; }
        .bubble-sm { width: 8px; height: 8px; }
        .bubble-md { width: 12px; height: 12px; }
        .bubble-lg { width: 16px; height: 16px; }
      `}</style>
    </div>
  )
}

export default CreateRepairOrder
