import React, { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/api/client'
import { connectSocket, disconnectSocket } from '@/api/socket'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import CustomerDashboard from '@/pages/CustomerDashboard'
import CreateRepairOrder from '@/pages/CreateRepairOrder'
import MyRepairOrders from '@/pages/MyRepairOrders'
import RepairOrderDetails from '@/pages/RepairOrderDetails'
import AdminShell from '@/components/admin/AdminShell'
import AdminOverview from '@/pages/admin/Overview'
import AdminCustomers from '@/pages/admin/Customers'
import AdminTechnicians from '@/pages/admin/Technicians'
import AdminRepairs from '@/pages/admin/Repairs'
import AdminRepairDetails from '@/pages/admin/AdminRepairDetails'
import AdminInventory from '@/pages/admin/Inventory'
import AdminPayments from '@/pages/admin/Payments'
import TechnicianDashboard from '@/pages/technician/Dashboard'
import TechnicianShell from '@/components/technician/TechnicianShell'

// Small inline icons for sidebar
const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)
const IconClipboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="4" width="16" height="18" rx="2" />
    <path d="M9 2h6v4H9z" />
  </svg>
)
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <>{children}</>
}

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

const TechnicianProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (user.role !== 'technician') return <Navigate to="/" replace />
  return <>{children}</>
}

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth()
  const homePath = user?.role === 'admin' ? '/admin' : user?.role === 'technician' ? '/technician' : '/'
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path
  const [open, setOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [repairs, setRepairs] = useState<any[]>([])
  const base = (import.meta as any)?.env?.BASE_URL || '/'

  // Customer notifications state
  const [custNotifOpen, setCustNotifOpen] = useState(false)
  const [custNotifs, setCustNotifs] = useState<any[]>([])

  // Refs for click-outside handling
  const custBtnDesktopRef = useRef<HTMLButtonElement | null>(null)
  const custMenuDesktopRef = useRef<HTMLDivElement | null>(null)
  const custBtnMobileRef = useRef<HTMLButtonElement | null>(null)
  const custMenuMobileRef = useRef<HTMLDivElement | null>(null)
  const adminBtnRef = useRef<HTMLButtonElement | null>(null)
  const adminMenuRef = useRef<HTMLDivElement | null>(null)

  // Local storage helpers (per-user)
  const userId = (useAuth().user?.id) as string | undefined
  const storeKey = userId ? `cust_notifs_${userId}` : 'cust_notifs'
  function loadCustNotifs(): any[] {
    try { return JSON.parse(localStorage.getItem(storeKey) || '[]') } catch { return [] }
  }
  function saveCustNotifs(list: any[]) {
    localStorage.setItem(storeKey, JSON.stringify(list))
  }
  const unreadCount = custNotifs.filter(n => !n.read).length

  // Lock browser scroll for ALL customer pages (header stays, only content scrolls)
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const enable = user?.role === 'customer'
    if (enable) {
      html.classList.add('no-scroll')
      body.classList.add('no-scroll')
    } else {
      html.classList.remove('no-scroll')
      body.classList.remove('no-scroll')
    }
    return () => { html.classList.remove('no-scroll'); body.classList.remove('no-scroll') }
  }, [user?.role])

  // Close popups on click-outside, Escape, and route change
  useEffect(() => {
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node
      // Customer dropdowns (desktop and mobile)
      if (custNotifOpen) {
        const insideCustomer =
          (!!custMenuDesktopRef.current && custMenuDesktopRef.current.contains(t)) ||
          (!!custBtnDesktopRef.current && custBtnDesktopRef.current.contains(t)) ||
          (!!custMenuMobileRef.current && custMenuMobileRef.current.contains(t)) ||
          (!!custBtnMobileRef.current && custBtnMobileRef.current.contains(t))
        if (!insideCustomer) setCustNotifOpen(false)
      }
      // Admin dropdown
      if (notifOpen) {
        const insideAdmin =
          (!!adminMenuRef.current && adminMenuRef.current.contains(t)) ||
          (!!adminBtnRef.current && adminBtnRef.current.contains(t))
        if (!insideAdmin) setNotifOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setCustNotifOpen(false); setNotifOpen(false) }
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer, { passive: true })
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [custNotifOpen, notifOpen])

  // Close on route change
  useEffect(() => { setCustNotifOpen(false); setNotifOpen(false) }, [location.pathname])

  // Connect socket for customer, listen for notifications
  useEffect(() => {
    if (user?.role !== 'customer') return
    // initialize from storage
    setCustNotifs(loadCustNotifs())
    const token = localStorage.getItem('auth_token') || ''
    const s = connectSocket(token)
    const handler = (payload: any) => {
      const next = [
        {
          id: `${payload.repairId}-${payload.createdAt}`,
          ...payload,
          read: false,
        },
        ...loadCustNotifs(),
      ].slice(0, 50)
      saveCustNotifs(next)
      setCustNotifs(next)
    }
    s.on('notification:new', handler)
    return () => {
      try { s.off('notification:new', handler) } catch {}
      disconnectSocket()
    }
  }, [user?.role])

  // Notifications: treat new pending repairs as notifications. Track read IDs in localStorage.
  function getReadIds(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem('admin_read_notifications') || '[]')) } catch { return new Set() }
  }
  function setReadIds(ids: Set<string>) {
    localStorage.setItem('admin_read_notifications', JSON.stringify(Array.from(ids)))
  }
  const unread = repairs.filter(r => r?.status === 'pending' && !getReadIds().has(r.id))

  useEffect(() => {
    if (user?.role !== 'admin') return
    let mounted = true
    let timer: any
    const load = async () => {
      try {
        const res = await api.get('/repairs')
        if (!mounted) return
        setRepairs(res.data?.repairs || [])
      } catch { /* ignore */ }
    }
    load()
    timer = setInterval(load, 30000)
    return () => { mounted = false; if (timer) clearInterval(timer) }
  }, [user?.role])

  const markRead = (id: string) => {
    const s = getReadIds(); s.add(id); setReadIds(s); setRepairs([...repairs])
  }
  const markAllRead = () => {
    const s = getReadIds(); unread.forEach(n => s.add(n.id)); setReadIds(s); setRepairs([...repairs])
  }

  // Customer: Sidebar layout with animated background
  if (user?.role === 'customer') {
    return (
      <div className="auth-dark fixed inset-0 md:relative md:min-h-screen md:overflow-hidden">
        {/* Dark themed background */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b0d12_0%,#0f1218_100%)]" />
        <span className="pointer-events-none absolute -top-8 -left-8 h-32 w-32 rounded-full bg-[#A48AFB]/10 blur-2xl anim-float-slow" />
        <span className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full bg-[#A48AFB]/10 blur-2xl anim-float-rev" />

        {/* Desktop sticky header (≥ md) */}
        <div className="hidden md:flex sticky top-0 z-20 items-center justify-between px-4 py-3 bg-[#0b0d12]/80 backdrop-blur border-b border-white/10 text-white">
          <Link to={homePath} className="flex items-center gap-2 font-semibold text-white">
            <img src={`${base}logo.svg`} alt="Electro-Repair" className="h-7 w-auto" />
            <span>Electro-Repair</span>
          </Link>
          <div className="relative">
            <button
              aria-label="Notifications"
              className="relative rounded-md border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10"
              onClick={() => setCustNotifOpen(v => !v)}
              ref={custBtnDesktopRef}
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] h-5 min-w-[1.25rem] px-1">
                  {unreadCount}
                </span>
              )}
            </button>
            {custNotifOpen && (
              <div ref={custMenuDesktopRef} className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-lg border border-white/10 bg-[#12151d] text-white shadow-xl z-40">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                  <div className="font-medium text-sm">Notifications</div>
                  <button
                    className="text-xs rounded border border-white/10 px-2 py-1 hover:bg-white/5"
                    onClick={() => { saveCustNotifs([]); setCustNotifs([]); }}
                    disabled={custNotifs.length === 0}
                  >Clear all</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {custNotifs.length === 0 ? (
                    <div className="p-3 text-xs text-slate-300">No notifications</div>
                  ) : (
                    custNotifs.slice(0, 20).map(n => (
                      <div key={n.id} className="px-3 py-2 border-b border-white/5 text-sm flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate"><span className="font-medium">{n.title || 'Update'}</span> • {n.message}</div>
                          <div className="text-[11px] text-slate-400 truncate">{new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <Link to={`/repairs/${n.repairId}`} onClick={() => setCustNotifOpen(false)} className="rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/5 text-white">Open</Link>
                          {!n.read && (
                            <button className="rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/5" onClick={() => { const next = custNotifs.map(x => x.id===n.id?{...x, read:true}:x); saveCustNotifs(next); setCustNotifs(next); }}>Mark read</button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile/Tablet top bar (sticky, visible < md) */}
        <div className="md:hidden sticky top-0 z-20 flex items-center justify-between px-3 py-3 bg-[#0b0d12]/80 backdrop-blur border-b border-white/10 text-white">
          <button aria-label="Open menu" className="rounded-md border border-white/10 bg-white/5 px-3 py-2" onClick={() => setOpen(true)}>☰</button>
          <Link to={homePath} className="flex items-center gap-2 font-semibold text-white">
            <img src={`${base}logo.svg`} alt="Electro-Repair" className="h-6 w-auto" />
            <span>Electro-Repair</span>
          </Link>
          <div className="relative">
            <button
              aria-label="Notifications"
              className="relative rounded-md border border-white/10 bg-white/5 px-3 py-2"
              onClick={() => setCustNotifOpen(v => !v)}
              ref={custBtnMobileRef}
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] h-5 min-w-[1.25rem] px-1">
                  {unreadCount}
                </span>
              )}
            </button>
            {custNotifOpen && (
              <div ref={custMenuMobileRef} className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-lg border border-white/10 bg-[#12151d] text-white shadow-xl z-40">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                  <div className="font-medium text-sm">Notifications</div>
                  <button
                    className="text-xs rounded border border-white/10 px-2 py-1 hover:bg-white/5"
                    onClick={() => { const next = custNotifs.map(n => ({...n, read: true})); saveCustNotifs(next); setCustNotifs(next); }}
                    disabled={unreadCount === 0}
                  >Mark all read</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {custNotifs.length === 0 ? (
                    <div className="p-3 text-xs text-slate-300">No notifications</div>
                  ) : (
                    custNotifs.slice(0, 20).map(n => (
                      <div key={n.id} className="px-3 py-2 border-b border-white/5 text-sm flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate"><span className="font-medium">{n.title || 'Update'}</span> • {n.message}</div>
                          <div className="text-[11px] text-slate-400 truncate">{new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <Link to={`/repairs/${n.repairId}`} onClick={() => setCustNotifOpen(false)} className="rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/5 text-white">Open</Link>
                          {!n.read && (
                            <button className="rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/5" onClick={() => { const next = custNotifs.map(x => x.id===n.id?{...x, read:true}:x); saveCustNotifs(next); setCustNotifs(next); }}>Mark read</button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* On mobile, subtract the top bar (~3.5rem) so only the main scrolls */}
        <div className="relative flex gap-3 p-3 items-stretch h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] overflow-hidden">
          {/* Sidebar - desktop sticky full height (visible ≥ md) */}
          <aside className="hidden md:flex w-60 shrink-0 flex-col rounded-2xl border border-white/10 bg-[#12151d] backdrop-blur shadow-sm p-4 sticky top-3 h-full text-white">
            <nav className="flex flex-col gap-1 text-sm">
              <Link to={homePath} className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2 ${isActive('/') ? 'bg-white/10 border border-white/10' : ''}`}>
                <span className="text-slate-300"><IconDashboard /></span>
                <span>Dashboard</span>
              </Link>
              <Link to="/repairs" className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2 ${isActive('/repairs') ? 'bg-white/10 border border-white/10' : ''}`}>
                <span className="text-slate-300"><IconClipboard /></span>
                <span>My Orders</span>
              </Link>
              <Link to="/repairs/new" className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2 ${isActive('/repairs/new') ? 'bg-white/10 border border-white/10' : ''}`}>
                <span className="text-slate-300"><IconPlus /></span>
                <span>New Order</span>
              </Link>
            </nav>
            <div className="mt-auto pt-4 border-t border-white/10 text-xs text-slate-300">
              <div className="mb-2">{user?.firstName} {user?.lastName}</div>
              <button onClick={() => setShowLogoutConfirm(true)} className="rounded-md border border-white/10 px-3 py-1.5 hover:bg-white/5 w-full text-white">Logout</button>
            </div>
          </aside>

          {/* Main (independent scroll) */}
          <main className="customer-main flex-1 overflow-y-auto">
            <div className="rounded-2xl border border-white/10 auth-card backdrop-blur p-4 shadow-sm ">
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
                <Link onClick={() => setOpen(false)} to={homePath} className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2 ${isActive('/') ? 'bg-white/10 border border-white/10' : ''}`}>
                  <span className="text-slate-300"><IconDashboard /></span>
                  <span>Dashboard</span>
                </Link>
                <Link onClick={() => setOpen(false)} to="/repairs" className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2 ${isActive('/repairs') ? 'bg-white/10 border border-white/10' : ''}`}>
                  <span className="text-slate-300"><IconClipboard /></span>
                  <span>My Orders</span>
                </Link>
                <Link onClick={() => setOpen(false)} to="/repairs/new" className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2 ${isActive('/repairs/new') ? 'bg-white/10 border border-white/10' : ''}`}>
                  <span className="text-slate-300"><IconPlus /></span>
                  <span>New Order</span>
                </Link>
              </nav>
              <div className="mt-auto pt-4 text-xs text-slate-300">
                <div className="mb-2">{user?.firstName} {user?.lastName}</div>
                <button onClick={() => { setOpen(false); logout(); }} className="rounded-md border border-white/10 px-3 py-1.5 hover:bg-white/5 w-full text-white">Logout</button>
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
          /* Prevent browser window from scrolling in customer view */
          .no-scroll { overflow: hidden !important; }
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

  // Admin/Technician: keep header layout, but apply same soft background
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100" />
      <span className="pointer-events-none absolute -top-8 -left-8 h-28 w-28 rounded-full bg-emerald-300/20 blur-2xl anim-float-slow" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-36 w-36 rounded-full bg-emerald-300/20 blur-2xl anim-float-rev" />

      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-6">
            <Link to={homePath} className="flex items-center gap-2 font-semibold text-primary-700">
              <img src={`${base}logo.svg`} alt="Electro-Repair" className="h-7 w-auto" />
              <span className="hidden sm:inline text-slate-800">Electro-Repair</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm text-slate-700">
              <Link to={homePath} className="hover:text-primary-700">Dashboard</Link>
              {user?.role === 'technician' && (
                <Link to="/technician" className="hover:text-primary-700">Technician</Link>
              )}
              {user?.role === 'admin' && (
                <Link to="/admin" className="hover:text-primary-700">Admin</Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user?.role === 'admin' && (
              <div className="relative">
                <button
                  aria-label="Notifications"
                  className="relative rounded-md border px-3 py-1.5 hover:bg-slate-50"
                  onClick={() => setNotifOpen(v => !v)}
                  ref={adminBtnRef}
                >
                  🔔
                  {unread.length > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] h-5 min-w-[1.25rem] px-1">
                      {unread.length}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div ref={adminMenuRef} className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-lg border bg-white shadow-lg z-40">
                    <div className="flex items-center justify-between px-3 py-2 border-b">
                      <div className="font-medium text-sm">Notifications</div>
                      <button
                        className="text-xs rounded border px-2 py-1 hover:bg-slate-50"
                        onClick={markAllRead}
                        disabled={unread.length === 0}
                      >Mark all read</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {unread.length === 0 ? (
                        <div className="p-3 text-xs text-slate-600">No new notifications</div>
                      ) : (
                        unread.slice(0, 20).map(n => (
                          <div key={n.id} className="px-3 py-2 border-b text-sm flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate"><span className="font-medium">New repair</span> • {n.deviceType} {n.brand} {n.model}</div>
                              <div className="text-xs text-slate-500 truncate">Ticket {n.id}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Link to={`/admin/repairs/${n.id}`} className="btn btn-xs">Open</Link>
                              <button className="btn btn-xs" onClick={() => markRead(n.id)}>Mark read</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <span className="text-slate-600 hidden sm:inline">{user?.firstName} {user?.lastName} • {user?.role}</span>
            <button onClick={() => setShowLogoutConfirm(true)} className="rounded-md border px-3 py-1.5 hover:bg-slate-50">Logout</button>
          </div>
        </div>
      </header>
      <main className="relative container py-4">
        {children}
      </main>

      <style>{`
        @keyframes floatY { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @keyframes floatYrev { 0%,100% { transform: translateY(0) } 50% { transform: translateY(8px) } }
        .anim-float-slow { animation: floatY 14s ease-in-out infinite; }
        .anim-float-rev { animation: floatYrev 16s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Shell>
              {/* Redirect admins/technicians to their dashboards; customers see customer dashboard */}
              {(() => {
                const { user } = useAuth()
                if (user?.role === 'admin') return <Navigate to="/admin" replace />
                if (user?.role === 'technician') return <Navigate to="/technician" replace />
                return <CustomerDashboard />
              })()}
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/repairs/new"
        element={
          <ProtectedRoute>
            <Shell>
              <CreateRepairOrder />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/repairs"
        element={
          <ProtectedRoute>
            <Shell>
              <MyRepairOrders />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/repairs/:id"
        element={
          <ProtectedRoute>
            <Shell>
              <RepairOrderDetails />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/technician"
        element={
          <TechnicianProtectedRoute>
            <TechnicianShell>
              <TechnicianDashboard />
            </TechnicianShell>
          </TechnicianProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      {/* Admin area */}
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminShell />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="technicians" element={<AdminTechnicians />} />
        <Route path="repairs" element={<AdminRepairs />} />
        <Route path="repairs/:id" element={<AdminRepairDetails />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="payments" element={<AdminPayments />} />
      </Route>
    </Routes>
  )
}

export default App
