import React, { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

// Small inline icons to match sample style
const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a3 3 0 0 0-2-2.82" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const IconWrench = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14.7 6.3a4.5 4.5 0 0 1-6 6L3 18v3h3l5.7-5.7a4.5 4.5 0 0 1 3-9z" />
  </svg>
)
const IconClipboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="4" width="16" height="18" rx="2" />
    <path d="M9 2h6v4H9z" />
  </svg>
)
const IconBoxes = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 16V8l-9-5-9 5v8l9 5 9-5z" />
    <path d="M3.3 7.3L12 12l8.7-4.7" />
    <path d="M12 22V12" />
  </svg>
)
const IconCard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 10h20" />
  </svg>
)

const navItems = [
  { to: '/admin', label: 'Overview', Icon: IconDashboard },
  { to: '/admin/customers', label: 'Customers', Icon: IconUsers },
  { to: '/admin/technicians', label: 'Technicians', Icon: IconWrench },
  { to: '/admin/repairs', label: 'Repairs', Icon: IconClipboard },
  { to: '/admin/inventory', label: 'Inventory', Icon: IconBoxes },
  { to: '/admin/payments', label: 'Payments', Icon: IconCard },
]

const AdminShell: React.FC = () => {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const visibleNavItems = navItems.filter(i => i.to !== '/admin/inventory' && i.to !== '/admin/payments')

  const base = (import.meta as any)?.env?.BASE_URL || '/'

  return (
    <div className="auth-dark fixed inset-0 md:relative md:min-h-screen md:overflow-hidden">
      {/* Dark background to match theme */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b0d12_0%,#0f1218_100%)]" />
      <span className="pointer-events-none absolute -top-8 -left-8 h-32 w-32 rounded-full bg-[#A48AFB]/10 blur-2xl anim-float-slow" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full bg-[#A48AFB]/10 blur-2xl anim-float-rev" />

      {/* Mobile/Tablet top bar (fixed, visible < md) */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-3 py-3 bg-[#0b0d12]/80 backdrop-blur border-b border-white/10 text-white">
        <button aria-label="Open menu" className="rounded-md border border-white/10 bg-white/5 px-3 py-2" onClick={() => setOpen(true)}>☰</button>
        <Link to="/admin" className="flex items-center gap-2 font-semibold text-white">
          <img src={`${base}logo.svg`} alt="Electro-Repair" className="h-6 w-auto" />
          <span>Electro-Repair</span>
        </Link>
        <span className="text-xs px-2 py-1 rounded border border-white/10">Admin</span>
      </div>

      <div className="relative mt-14 md:mt-0 flex gap-3 p-3 items-stretch h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-1.5rem)] overflow-hidden">
        {/* Sidebar - desktop sticky full height (visible ≥ md) */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col rounded-2xl border border-white/10 bg-[#12151d] backdrop-blur shadow-sm p-4 sticky top-3 h-[calc(100vh-1.5rem)] text-white">
          <Link to="/admin" className="mb-4 flex items-center gap-2 font-semibold text-white">
            <img src={`${base}logo.svg`} alt="Electro-Repair" className="h-7 w-auto" />
            <span>Electro-Repair</span>
          </Link>
          <nav className="flex flex-col gap-1 text-sm">
            {visibleNavItems.map(i => (
              <NavLink
                key={i.to}
                to={i.to}
                end
                className={({isActive}) => `rounded-lg px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2 ${isActive ? 'bg-white/10 border border-white/10' : ''}`}
              >
                <span className="text-slate-300"><i.Icon /></span>
                <span>{i.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto pt-4 border-t border-white/10 text-xs text-slate-300">
            <div className="mb-2">{user?.firstName} {user?.lastName} • Admin</div>
            <button onClick={() => setConfirmLogout(true)} className="rounded-md border border-white/10 px-3 py-1.5 hover:bg-white/5 w-full text-white">Logout</button>
          </div>
        </aside>

        {/* Main (independent scroll) */}
        <main className="flex-1 overflow-y-auto">
          <div className="rounded-2xl border border-white/10 auth-card backdrop-blur p-4 shadow-sm ">
            <Outlet />
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
                <span>Electro-Repair • Admin</span>
              </span>
              <button aria-label="Close" className="rounded-md border border-white/10 px-2 py-1 hover:bg-white/5" onClick={() => setOpen(false)}>✕</button>
            </div>
            <nav className="flex flex-col gap-1 text-sm">
              {visibleNavItems.map(i => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end
                  onClick={() => setOpen(false)}
                  className={({isActive}) => `rounded-lg px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2 ${isActive ? 'bg-white/10 border border-white/10' : ''}`}
                >
                  <span className="text-slate-300"><i.Icon /></span>
                  <span>{i.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto pt-4 text-xs text-slate-300">
              <div className="mb-2">{user?.firstName} {user?.lastName}</div>
              <button onClick={() => { setOpen(false); setConfirmLogout(true); }} className="rounded-md border border-white/10 px-3 py-1.5 hover:bg-white/5 w-full text-white">Logout</button>
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

      {/* Themed confirmation modal for logout */}
      {confirmLogout && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmLogout(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#12151d] shadow-xl text-white">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold">Confirm Logout</h3>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <p className="text-slate-300">Are you sure you want to logout from the admin dashboard?</p>
            </div>
            <div className="p-4 border-t border-white/10 flex items-center justify-end gap-2">
              <button className="btn-outline" onClick={() => setConfirmLogout(false)}>Cancel</button>
              <button
                className="btn"
                onClick={() => {
                  setConfirmLogout(false)
                  logout()
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminShell

