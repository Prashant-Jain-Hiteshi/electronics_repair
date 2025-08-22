import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { connectSocket, disconnectSocket } from '@/api/socket'

// Small inline icons
const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6l4 2" />
  </svg>
)
const IconProgress = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
)
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)
const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

const TechnicianShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const isActive = (queryTab: string) => {
    const sp = new URLSearchParams(location.search)
    const tab = sp.get('tab')
    return location.pathname === '/technician' && tab === queryTab
  }
  const isDashboardActive = () => {
    const sp = new URLSearchParams(location.search)
    return location.pathname === '/technician' && !sp.get('tab')
  }
  const [open, setOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const base = (import.meta as any)?.env?.BASE_URL || '/'

  const homePath = '/technician'

  // Notifications (persist per technician user)
  const [notifOpen, setNotifOpen] = useState(false)
  const [techNotifs, setTechNotifs] = useState<any[]>([])
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Lock browser/body scroll while in technician shell
  useEffect(() => {
    document.body.classList.add('no-scroll')
    return () => { document.body.classList.remove('no-scroll') }
  }, [])

  // Storage helpers
  const userId = user?.id as string | undefined
  const storeKey = userId ? `tech_notifs_${userId}` : 'tech_notifs'
  const loadNotifs = () => { try { return JSON.parse(localStorage.getItem(storeKey) || '[]') } catch { return [] } }
  const saveNotifs = (list: any[]) => localStorage.setItem(storeKey, JSON.stringify(list))
  const unreadCount = techNotifs.filter(n => !n.read).length

  // Click outside & escape to close dropdowns
  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node
      if (notifOpen) {
        const inside = (!!menuRef.current && menuRef.current.contains(t)) || (!!btnRef.current && btnRef.current.contains(t))
        if (!inside) setNotifOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNotifOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true } as any)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [notifOpen])

  // Socket listener for technician notifications
  useEffect(() => {
    if (user?.role !== 'technician') return
    setTechNotifs(loadNotifs())
    const token = localStorage.getItem('auth_token') || ''
    const s = connectSocket(token)
    const handler = (payload: any) => {
      const baseId = payload.repairId ?? payload.id ?? Math.random().toString(36).slice(2)
      const next = [{ id: `${baseId}-${payload.createdAt}`, ...payload, read: false }, ...loadNotifs()].slice(0, 50)
      saveNotifs(next)
      setTechNotifs(next)
    }
    s.on('tech:notification:new', handler)
    return () => {
      try { s.off('tech:notification:new', handler) } catch {}
      disconnectSocket()
    }
  }, [user?.role])

  const markRead = (id: string) => { const next = techNotifs.map(n => n.id===id?{...n, read:true}:n); saveNotifs(next); setTechNotifs(next) }
  const markAllRead = () => { const next = techNotifs.map(n => ({...n, read:true})); saveNotifs(next); setTechNotifs(next) }

  return (
    <div className="auth-dark min-h-screen relative overflow-hidden">
      {/* Dark themed background */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b0d12_0%,#0f1218_100%)]" />
      <span className="pointer-events-none absolute -top-8 -left-8 h-32 w-32 rounded-full bg-[#A48AFB]/10 blur-2xl anim-float-slow" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full bg-[#A48AFB]/10 blur-2xl anim-float-rev" />

      <div className="relative flex flex-col md:flex-row gap-3 p-3 pt-0 md:pt-3 items-stretch h-[calc(100vh-1.5rem)] overflow-y-auto md:overflow-hidden">
        {/* Mobile top bar (inside scroll container so it stays sticky) */}
        <div className="md:hidden sticky top-0 z-20 flex items-center justify-between px-3 py-3 bg-[#0b0d12]/80 backdrop-blur border border-white/10 rounded-xl text-white">
          <button aria-label="Open menu" className="rounded-md border border-white/10 bg-white/5 px-3 py-2" onClick={() => setOpen(true)}>☰</button>
          <Link to={homePath} className="flex items-center gap-2 font-semibold text-white">
            <img src={`${base}logo.svg`} alt="Electro-Repair" className="h-6 w-auto" />
            <span>Electro-Repair</span>
          </Link>
          <div className="relative">
            <button
              ref={btnRef}
              aria-label="Notifications"
              className="relative rounded-md border border-white/10 bg-white/5 px-3 py-2"
              onClick={() => setNotifOpen(v => !v)}
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] h-5 min-w-[1.25rem] px-1">{unreadCount}</span>
              )}
            </button>
            {notifOpen && (
              <div ref={menuRef} className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-lg border border-white/10 bg-[#12151d] text-white shadow-xl z-40">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                  <div className="font-medium text-sm">Notifications</div>
                  <button className="text-xs rounded border border-white/10 px-2 py-1 hover:bg-white/5" onClick={markAllRead} disabled={unreadCount===0}>Mark all read</button>
                </div>
                <div className="max-h-80 overflow-y-auto scrollbar-none">
                  {techNotifs.length === 0 ? (
                    <div className="p-3 text-xs text-slate-300">No notifications</div>
                  ) : (
                    techNotifs.slice(0,20).map(n => (
                      <div key={n.id} className="px-3 py-2 border-b border-white/5 text-sm flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate"><span className="font-medium">{n.title || 'Update'}</span> • {n.message}</div>
                          <div className="text-[11px] text-slate-400 truncate">{new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {(n.kind === 'new_repair' || n.kind === 'status_change') && (
                            <Link to={`/technician`} onClick={() => setNotifOpen(false)} className="rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/5 text-white">Open</Link>
                          )}
                          {!n.read && (
                            <button className="rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/5" onClick={() => markRead(n.id)}>Mark read</button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-3 py-2 border-t border-white/10 flex justify-end">
                  <button className="text-xs rounded border border-white/10 px-2 py-1 hover:bg-white/5" onClick={() => { saveNotifs([]); setTechNotifs([]); }} disabled={techNotifs.length===0}>Clear all</button>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Sidebar - desktop */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col rounded-2xl border border-white/10 bg-[#12151d] backdrop-blur shadow-sm p-4 sticky top-3 h-[calc(100vh-1.5rem)] text-white">
          <Link to={homePath} className="mb-4 flex items-center gap-2 font-semibold text-white">
            <img src={`${base}logo.svg`} alt="Electro-Repair" className="h-7 w-auto" />
            <span>Electro-Repair</span>
          </Link>
          <nav className="flex flex-col gap-1 text-sm">
            <Link to={homePath} className={`rounded-lg px-3 py-2 text-white hover:bg:white/5 hover:bg-white/5 flex items-center gap-2 ${isDashboardActive() ? 'bg-white/10 border border-white/10' : ''}`}>
              <span className="text-slate-300"><IconDashboard /></span>
              <span>Dashboard</span>
            </Link>
            <Link to={`${homePath}?tab=pending`} className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2 ${isActive('pending') ? 'bg-white/10 border border-white/10' : ''}`}>
              <span className="text-slate-300"><IconClock /></span>
              <span>Pending</span>
            </Link>
            <Link to={`${homePath}?tab=in_progress`} className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2 ${isActive('in_progress') ? 'bg-white/10 border border-white/10' : ''}`}>
              <span className="text-slate-300"><IconProgress /></span>
              <span>In Progress</span>
            </Link>
            <Link to={`${homePath}?tab=completed`} className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2 ${isActive('completed') ? 'bg-white/10 border border-white/10' : ''}`}>
              <span className="text-slate-300"><IconCheck /></span>
              <span>Completed</span>
            </Link>
          </nav>
          <div className="mt-auto pt-4 border-t border-white/10 text-xs text-slate-300">
            <div className="mb-2">{user?.firstName} {user?.lastName}</div>
            <button onClick={() => setShowLogoutConfirm(true)} className="rounded-md border border-white/10 px-3 py-1.5 hover:bg-white/5 w-full text-white">Logout</button>
          </div>
        </aside>

        {/* Main (independent scroll) */}
        <main className="flex-1 overflow-y-auto scrollbar-none">
          {/* Desktop sticky header row with notifications */}
          <div className="hidden md:flex sticky top-3 z-20 mb-3 items-center justify-between text-white bg-[#0b0d12]/80 backdrop-blur border border-white/10 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 font-semibold">
              <img src={`${base}logo.svg`} alt="Electro-Repair" className="h-7 w-auto" />
              <span>Technician</span>
            </div>
            <div className="relative">
              <button
                ref={btnRef}
                aria-label="Notifications"
                className="relative rounded-md border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10"
                onClick={() => setNotifOpen(v => !v)}
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] h-5 min-w-[1.25rem] px-1">{unreadCount}</span>
                )}
              </button>
              {notifOpen && (
                <div ref={menuRef} className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-lg border border-white/10 bg-[#12151d] text-white shadow-xl z-40">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                    <div className="font-medium text-sm">Notifications</div>
                    <button className="text-xs rounded border border-white/10 px-2 py-1 hover:bg-white/5" onClick={markAllRead} disabled={unreadCount===0}>Mark all read</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-none">
                    {techNotifs.length === 0 ? (
                      <div className="p-3 text-xs text-slate-300">No notifications</div>
                    ) : (
                      techNotifs.slice(0,20).map(n => (
                        <div key={n.id} className="px-3 py-2 border-b border-white/5 text-sm flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate"><span className="font-medium">{n.title || 'Update'}</span> • {n.message}</div>
                            <div className="text-[11px] text-slate-400 truncate">{new Date(n.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            {(n.kind === 'new_repair' || n.kind === 'status_change') && (
                              <Link to={`/technician`} className="rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/5 text-white">Open</Link>
                            )}
                            {!n.read && (
                              <button className="rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/5" onClick={() => markRead(n.id)}>Mark read</button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-3 py-2 border-t border-white/10 flex justify-end">
                    <button className="text-xs rounded border border-white/10 px-2 py-1 hover:bg-white/5" onClick={() => { saveNotifs([]); setTechNotifs([]); }} disabled={techNotifs.length===0}>Clear all</button>
                  </div>
                </div>
              )}
            </div>
          </div>
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
              <Link onClick={() => setOpen(false)} to={homePath} className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2 ${isDashboardActive() ? 'bg-white/10 border border-white/10' : ''}`}>
                <span className="text-slate-300"><IconDashboard /></span>
                <span>Dashboard</span>
              </Link>
              <Link onClick={() => setOpen(false)} to={`${homePath}?tab=pending`} className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2 ${isActive('pending') ? 'bg-white/10 border border-white/10' : ''}`}>
                <span className="text-slate-300"><IconClock /></span>
                <span>Pending</span>
              </Link>
              <Link onClick={() => setOpen(false)} to={`${homePath}?tab=in_progress`} className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2 ${isActive('in_progress') ? 'bg-white/10 border border-white/10' : ''}`}>
                <span className="text-slate-300"><IconProgress /></span>
                <span>In Progress</span>
              </Link>
              <Link onClick={() => setOpen(false)} to={`${homePath}?tab=completed`} className={`rounded-lg px-3 py-2 text-white hover:bg-white/5 flex items-center gap-2 ${isActive('completed') ? 'bg-white/10 border border-white/10' : ''}`}>
                <span className="text-slate-300"><IconCheck /></span>
                <span>Completed</span>
              </Link>
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
        /* Hide scrollbars but keep scrolling */
        .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
        .scrollbar-none::-webkit-scrollbar { width: 0; height: 0; display: none; }
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
