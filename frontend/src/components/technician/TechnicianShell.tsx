import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const TechnicianShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const isActive = (queryTab: string) => {
    const sp = new URLSearchParams(location.search)
    return location.pathname === '/technician' && (sp.get('tab') || 'pending') === queryTab
  }
  const [open, setOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const base = (import.meta as any)?.env?.BASE_URL || '/'

  const homePath = '/technician'

  return (
    <div className="auth-dark min-h-screen relative overflow-hidden">
      {/* Dark themed background */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b0d12_0%,#0f1218_100%)]" />
      <span className="pointer-events-none absolute -top-8 -left-8 h-32 w-32 rounded-full bg-[#A48AFB]/10 blur-2xl anim-float-slow" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full bg-[#A48AFB]/10 blur-2xl anim-float-rev" />

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-20 flex items-center justify-between px-3 py-3 bg-[#0b0d12]/80 backdrop-blur border-b border-white/10 text-white">
        <button aria-label="Open menu" className="rounded-md border border-white/10 bg-white/5 px-3 py-2" onClick={() => setOpen(true)}>☰</button>
        <Link to={homePath} className="flex items-center gap-2 font-semibold text-white">
          <img src={`${base}logo.svg`} alt="Electro-Repair" className="h-6 w-auto" />
          <span>Electro-Repair</span>
        </Link>
        <span />
      </div>

      <div className="relative flex gap-3 p-3 items-stretch h-[calc(100vh-1.5rem)] overflow-hidden">
        {/* Sidebar - desktop */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col rounded-2xl border border-white/10 bg-[#12151d] backdrop-blur shadow-sm p-4 sticky top-3 h-[calc(100vh-1.5rem)] text-white">
          <Link to={homePath} className="mb-4 flex items-center gap-2 font-semibold text-white">
            <img src={`${base}logo.svg`} alt="Electro-Repair" className="h-7 w-auto" />
            <span>Electro-Repair</span>
          </Link>
          <nav className="flex flex-col gap-1 text-sm">
            <Link to={`${homePath}?tab=pending`} className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 ${isActive('pending') ? 'bg-white/10 border border-white/10' : ''}`}>Pending</Link>
            <Link to={`${homePath}?tab=in_progress`} className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 ${isActive('in_progress') ? 'bg-white/10 border border-white/10' : ''}`}>In Progress</Link>
            <Link to={`${homePath}?tab=completed`} className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 ${isActive('completed') ? 'bg-white/10 border border-white/10' : ''}`}>Completed</Link>
          </nav>
          <div className="mt-auto pt-4 border-t border-white/10 text-xs text-slate-300">
            <div className="mb-2">{user?.firstName} {user?.lastName}</div>
            <button onClick={() => setShowLogoutConfirm(true)} className="rounded-md border border-white/10 px-3 py-1.5 hover:bg-white/5 w-full text-white">Logout</button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="rounded-2xl border border-white/10 auth-card backdrop-blur p-4 shadow-sm text-white">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile drawer sidebar */}
      {open && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-[#12151d] border-r border-white/10 shadow-xl p-4 flex flex-col text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-white flex items-center gap-2">
                <img src={`${base}logo.svg`} alt="Electro-Repair" className="h-6 w-auto" />
                <span>Electro-Repair</span>
              </span>
              <button aria-label="Close" className="rounded-md border border-white/10 px-2 py-1 hover:bg-white/5" onClick={() => setOpen(false)}>✕</button>
            </div>
            <nav className="flex flex-col gap-1 text-sm">
              <Link onClick={() => setOpen(false)} to={`${homePath}?tab=pending`} className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 ${isActive('pending') ? 'bg-white/10 border border-white/10' : ''}`}>Pending</Link>
              <Link onClick={() => setOpen(false)} to={`${homePath}?tab=in_progress`} className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 ${isActive('in_progress') ? 'bg-white/10 border border-white/10' : ''}`}>In Progress</Link>
              <Link onClick={() => setOpen(false)} to={`${homePath}?tab=completed`} className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 ${isActive('completed') ? 'bg-white/10 border border-white/10' : ''}`}>Completed</Link>
            </nav>
            <div className="mt-auto pt-4 text-xs text-slate-300">
              <div className="mb-2">{user?.firstName} {user?.lastName}</div>
              <button onClick={() => { setOpen(false); setShowLogoutConfirm(true); }} className="rounded-md border border-white/10 px-3 py-1.5 hover:bg-white/5 w-full text-white">Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* Local keyframes */}
      <style>{`
        @keyframes floatY { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @keyframes floatYrev { 0%,100% { transform: translateY(0) } 50% { transform: translateY(8px) } }
        .anim-float-slow { animation: floatY 14s ease-in-out infinite; }
        .anim-float-rev { animation: floatYrev 16s ease-in-out infinite; }
      `}</style>

      {/* Logout confirmation modal (dark themed) */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative z-10 w-[92vw] max-w-sm rounded-xl border border-white/10 bg-[#12151d] text-white shadow-xl">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="text-base font-semibold text-white">Confirm Logout</h3>
              <p className="mt-1 text-sm text-slate-300">Are you sure you want to logout?</p>
            </div>
            <div className="px-5 py-4 flex items-center justify-end gap-2">
              <button
                className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/5"
                onClick={() => setShowLogoutConfirm(false)}
              >Cancel</button>
              <button
                className="rounded-md bg-[#A48AFB] text-white px-3 py-1.5 text-sm hover:bg-[#9a80ff]"
                onClick={() => { setShowLogoutConfirm(false); logout(); }}
              >Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TechnicianShell
