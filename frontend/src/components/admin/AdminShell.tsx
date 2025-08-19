import React, { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { to: '/admin', label: 'Overview' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/technicians', label: 'Technicians' },
  { to: '/admin/repairs', label: 'Repairs' },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/payments', label: 'Payments' },
]

const AdminShell: React.FC = () => {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const visibleNavItems = navItems.filter(i => i.to !== '/admin/inventory' && i.to !== '/admin/payments')

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated soft background (same as customer) */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100" />
      <span className="pointer-events-none absolute -top-8 -left-8 h-32 w-32 rounded-full bg-emerald-300/25 blur-2xl anim-float-slow" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full bg-emerald-300/20 blur-2xl anim-float-rev" />

      {/* Mobile/Tablet top bar (sticky, visible < md) */}
      <div className="md:hidden sticky top-0 z-20 flex items-center justify-between px-3 py-3 bg-white/80 backdrop-blur border-b">
        <button aria-label="Open menu" className="rounded-md border bg-white/80 backdrop-blur px-3 py-2" onClick={() => setOpen(true)}>☰</button>
        <Link to="/admin" className="font-semibold text-slate-800">ElectroFix</Link>
        <span className="text-xs px-2 py-1 rounded border">Admin</span>
      </div>

      <div className="relative flex gap-3 p-3 items-stretch h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-1.5rem)] overflow-hidden">
        {/* Sidebar - desktop sticky full height (visible ≥ md) */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col rounded-2xl border bg-gradient-to-br from-[#d1fae5] via-[#d1fae5]/75 to-[#a7f3d0] backdrop-blur shadow-sm p-4 sticky top-3 h-[calc(100vh-1.5rem)]">
          <Link to="/admin" className="font-semibold text-slate-800 mb-4">ElectroFix</Link>
          <nav className="flex flex-col gap-1 text-sm">
            {visibleNavItems.map(i => (
              <NavLink
                key={i.to}
                to={i.to}
                end
                className={({isActive}) => `rounded-lg px-3 py-2 hover:bg-slate-50 ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : ''}`}
              >
                {i.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto pt-4 border-t text-xs text-slate-600">
            <div className="mb-2">{user?.firstName} {user?.lastName} • Admin</div>
            <button onClick={logout} className="rounded-md border px-3 py-1.5 hover:bg-slate-50 w-full">Logout</button>
          </div>
        </aside>

        {/* Main (independent scroll) */}
        <main className="flex-1 overflow-y-auto">
          <div className="rounded-2xl border backdrop-blur p-4 shadow-sm h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile drawer sidebar */}
      {open && (
        <div className="fixed inset-0 z-30 sm:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-gradient-to-b from-[#d1fae5] via-[#d1fae5]/75 to-[#a7f3d0] shadow-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-slate-800">ElectroFix • Admin</span>
              <button aria-label="Close" className="rounded-md border px-2 py-1" onClick={() => setOpen(false)}>✕</button>
            </div>
            <nav className="flex flex-col gap-1 text-sm">
              {visibleNavItems.map(i => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end
                  onClick={() => setOpen(false)}
                  className={({isActive}) => `rounded-lg px-3 py-2 hover:bg-slate-50 ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : ''}`}
                >
                  {i.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto pt-4 text-xs text-slate-600">
              <div className="mb-2">{user?.firstName} {user?.lastName}</div>
              <button onClick={() => { setOpen(false); logout(); }} className="rounded-md border px-3 py-1.5 hover:bg-slate-50 w-full">Logout</button>
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
    </div>
  )
}

export default AdminShell
