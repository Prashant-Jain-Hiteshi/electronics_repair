import React from 'react'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  rightTitle?: string
  rightSubtitle?: string
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children, rightTitle, rightSubtitle }) => {
  const base = (import.meta as any)?.env?.BASE_URL || '/'
  return (
    <div className="auth-dark min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left: Form */}
      <div className="auth-panel relative overflow-hidden flex items-center justify-center p-6 md:p-10">
        {/* Small-screen animated background (visible only when right panel is hidden) */}
        <div className="absolute inset-0 md:hidden">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b0d12_0%,#0f1218_100%)]" />
          {/* Soft blobs */}
          <span className="pointer-events-none absolute -top-12 -left-12 h-40 w-40 rounded-full bg-[#A48AFB]/10 blur-2xl anim-float-slow" />
          <span className="pointer-events-none absolute bottom-0 right-0 h-44 w-44 rounded-full bg-[#A48AFB]/10 blur-2xl anim-float-rev" />
          <span className="pointer-events-none absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 h-56 w-56 rounded-full bg-[#A48AFB]/5 blur-3xl anim-pulse-glow" />
          {/* Floating chips (subtle) */}
          <div className="pointer-events-none absolute top-4 left-4 anim-drift-1">
            <div className="rounded-full bg-white/5 backdrop-blur px-2.5 py-1 text-[10px] text-slate-200/80 border border-white/10">Live Tracking</div>
          </div>
          <div className="pointer-events-none absolute top-20 right-4 anim-drift-2">
            <div className="rounded-full bg-white/5 backdrop-blur px-2.5 py-1 text-[10px] text-slate-200/80 border border-white/10">Instant OTP</div>
          </div>
        </div>
        <div className="w-full max-w-md relative z-10">
          {/** Resolve asset via BASE_URL for reliability across environments */}
          {/* Brand */}
          <div className="mb-8 flex items-center gap-3 justify-center md:justify-start">
            <img
              src={`${base}logo.svg`}
              alt="Electro-Repair"
              className="h-10 sm:h-12 w-auto shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
            <span className="text-white font-semibold text-xl sm:text-2xl leading-tight">Electro-Repair</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-center md:text-left">{title}</h1>
          {subtitle && <p className="mt-2 text-white text-center md:text-left">{subtitle}</p>}

          <div className="auth-card mt-8 backdrop-blur-sm rounded-xl border shadow-sm p-5 sm:p-6">
            {children}
          </div>

          <p className="mt-6 text-xs text-slate-500"> {new Date().getFullYear()} Electro-Repair. All rights reserved.</p>
        </div>
      </div>

      {/* Right: Showcase with subtle animations */}
      <div className="hidden md:block relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#0f1218_0%,#0b0d12_100%)]" />

        {/* Animated gradient blobs */}
        <span className="pointer-events-none absolute -top-10 -left-10 h-48 w-48 rounded-full bg-[#A48AFB]/15 blur-2xl anim-float-slow" />
        <span className="pointer-events-none absolute bottom-10 -right-10 h-56 w-56 rounded-full bg-[#A48AFB]/10 blur-2xl anim-float-rev" />
        <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-white/5 blur-3xl anim-pulse-glow" />

        {/* Floating chips */}
        <div className="pointer-events-none absolute top-8 left-8 anim-drift-1">
          <div className="rounded-full bg-white/10 backdrop-blur border border-white/20 px-3 py-1 text-xs text-white/90 shadow">Live Tracking</div>
        </div>
        <div className="pointer-events-none absolute top-24 right-10 anim-drift-2">
          <div className="rounded-full bg-white/10 backdrop-blur border border-white/20 px-3 py-1 text-xs text-white/90 shadow">Instant OTP</div>
        </div>
        <div className="pointer-events-none absolute bottom-16 left-14 anim-drift-3">
          <div className="rounded-full bg-white/10 backdrop-blur border border-white/20 px-3 py-1 text-xs text-white/90 shadow">Estimates</div>
        </div>

        <div className="absolute inset-0 p-8 flex items-center justify-center">
          {/* Animated border wrapper */}
          <div className="p-[1px] rounded-2xl bg-[conic-gradient(from_180deg_at_50%_50%,#2a2f3a_0%,#A48AFB_50%,#2a2f3a_100%)] anim-rotate-slow">
            <div className="w-full max-w-lg rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-8 text-white shadow-2xl">
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#A48AFB' }} />
                <span className="text-lg font-semibold">Electro-Repair</span>
              </div>
              <h2 className="text-2xl font-bold leading-tight">{rightTitle || 'Fast, Reliable, Transparent Repairs'}</h2>
              <p className="mt-2 text-slate-300">{rightSubtitle || 'Track repair status, approve estimates, and stay updated in real time.'}</p>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#A48AFB' }} />
                  <p>Live order tracking and notifications</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#A48AFB' }} />
                  <p>Easy estimates and approvals</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#A48AFB' }} />
                  <p>Secure, OTP-based sign in</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Local keyframes for animations */}
      <style>{`
        @keyframes floatY { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
        @keyframes floatYrev { 0%,100% { transform: translateY(0) } 50% { transform: translateY(10px) } }
        @keyframes pulseGlow { 0%,100% { opacity: .15 } 50% { opacity: .3 } }
        @keyframes rotateSlow { to { transform: rotate(360deg) } }
        @keyframes drift1 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(8px,-6px) } }
        @keyframes drift2 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(-10px,6px) } }
        @keyframes drift3 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(6px,10px) } }
        .anim-float-slow { animation: floatY 8s ease-in-out infinite; }
        .anim-float-rev { animation: floatYrev 9s ease-in-out infinite; }
        .anim-pulse-glow { animation: pulseGlow 6s ease-in-out infinite; }
        .anim-rotate-slow { animation: rotateSlow 24s linear infinite; }
        .anim-drift-1 { animation: drift1 7s ease-in-out infinite; }
        .anim-drift-2 { animation: drift2 8s ease-in-out infinite; }
        .anim-drift-3 { animation: drift3 9s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

export default AuthLayout
