import React, { useEffect, useMemo, useState } from 'react'
import { api } from '@/api/client'
import type { RepairOrder, RepairStatus } from '@/types/repair'
import { useAuth } from '@/context/AuthContext'
import { Link } from 'react-router-dom'

// Small inline icons for metric cards (match admin)
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)
const IconTruck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 7h11v8H3z" />
    <path d="M14 11h4l3 3v1h-7z" />
    <circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" />
  </svg>
)
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
const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

const statusLabels: Record<RepairStatus, string> = {
  new: 'New',
  diagnosis: 'Diagnosis',
  waiting_parts: 'Waiting Parts',
  in_progress: 'In Progress',
  completed: 'Completed',
  delivered: 'Delivered',
  canceled: 'Canceled',
}

const statusColors: Record<RepairStatus, string> = {
  new: 'bg-slate-700 text-slate-100',
  diagnosis: 'bg-amber-900/40 text-amber-200',
  waiting_parts: 'bg-yellow-900/40 text-yellow-200',
  in_progress: 'bg-blue-900/40 text-blue-200',
  completed: 'bg-emerald-900/40 text-emerald-200',
  delivered: 'bg-teal-900/40 text-teal-200',
  canceled: 'bg-rose-900/40 text-rose-200',
}

const formatCurrency = (n: number | null | undefined) =>
  typeof n === 'number' ? n.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '-'

const CustomerDashboard: React.FC = () => {
  const { user } = useAuth()
  const [repairs, setRepairs] = useState<RepairOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  // Pending payments card removed to align with backend capabilities

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await api.get('/repairs/mine')
        const items: RepairOrder[] = data?.repairs || data || []
        setRepairs(items)
        // Removed unsupported pending payments fetch
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load your repair orders')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return repairs
    return repairs.filter((r) =>
      [r.ticketNumber, r.deviceBrand, r.deviceModel, r.issueDescription]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [repairs, query])

  const stats = useMemo(() => {
    const total = repairs.length
    // Use a generic status counter to include statuses like 'pending' if present
    const byStatus = repairs.reduce<Record<string, number>>((acc, r) => {
      const key = String(r.status)
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    return { total, byStatus }
  }, [repairs])

  // Pie data like admin (sequence and colors match)
  const pieData = useMemo(() => {
    const pending = stats.byStatus?.pending || 0
    const in_progress = stats.byStatus?.in_progress || 0
    const completed = stats.byStatus?.completed || 0
    return [
      { label: 'Pending', value: pending, color: '#F59E0B' },
      { label: 'In Progress', value: in_progress, color: '#7C6FF1' },
      { label: 'Completed', value: completed, color: '#A48AFB' },
    ]
  }, [stats.byStatus])

  return (
    <div className="  space-y-6 pb-10 sm:pb-16 ">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl border p-6 auth-card">
        <span className="pointer-events-none absolute -top-6 -left-6 h-20 w-20 rounded-full bg-[#A48AFB]/10 blur-xl anim-float-slow" />
        <span className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-[#A48AFB]/10 blur-xl anim-float-rev" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Hi, {user?.firstName} {user?.lastName}</h1>
          <p className="mt-1 text-slate-300">Welcome back! Track your device repairs and manage new orders here.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/repairs" className="rounded-md border px-4 py-2 text-sm text-white hover:bg-white/5">View all orders</Link>
            <Link to="/repairs/new" className="btn">Create Repair Order</Link>
          </div>
        </div>
      </section>

      {/* Overview + Chart grid to resemble the sample two-column layout */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Chart card */}
        <div className="rounded-2xl border auth-card shadow-card p-0 lg:col-span-2 overflow-hidden">
          <div className="px-5 pt-4 pb-2 border-b">
            <h3 className="text-lg font-semibold text-white">Dashboard Overview</h3>
          </div>
          <div className="p-5">
            <AdminPieChart data={pieData} />
            <div className="mt-4 flex items-center gap-4 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{background:'#F59E0B'}} /> Pending</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{background:'#7C6FF1'}} /> In Progress</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{background:'#A48AFB'}} /> Completed</span>
            </div>
          </div>
        </div>

        {/* Right side overview cards - 5 metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="rounded-xl border auth-card p-4 shadow-card min-w-0">
            <p className="text-xs text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-emerald-300 shrink-0"><IconCheck /></span> <span className="truncate whitespace-nowrap" title="Completed">Completed</span></p>
            <p className="text-3xl font-bold text-white">{stats.byStatus?.completed || 0}</p>
          </div>
          <div className="rounded-xl border auth-card p-4 shadow-card min-w-0">
            <p className="text-xs text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-slate-300 shrink-0"><IconTruck /></span> <span className="truncate whitespace-nowrap" title="Delivered">Delivered</span></p>
            <p className="text-3xl font-bold text-white">{stats.byStatus?.delivered || 0}</p>
          </div>
          <div className="rounded-xl border auth-card p-4 shadow-card min-w-0">
            <p className="text-xs text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-amber-300 shrink-0"><IconClock /></span> <span className="truncate whitespace-nowrap" title="Pending">Pending</span></p>
            <p className="text-3xl font-bold text-white">{stats.byStatus?.pending || 0}</p>
          </div>
          <div className="rounded-xl border auth-card p-4 shadow-card min-w-0">
            <p className="text-xs text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-[#A48AFB] shrink-0"><IconProgress /></span> <span className="truncate whitespace-nowrap" title="In Progress">In Progress</span></p>
            <p className="text-3xl font-bold text-white">{stats.byStatus?.in_progress || 0}</p>
          </div>
          <div className="rounded-xl border auth-card p-4 shadow-card md:col-span-2 lg:col-span-1 min-w-0">
            <p className="text-xs text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-slate-300 shrink-0"><IconGrid /></span> <span className="truncate whitespace-nowrap" title="Total">Total</span></p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
        </div>
      </section>

      {/* Removed secondary KPI chips to avoid duplicate information */}

      {/* Mobile CTA to view orders when table is hidden */}
      <section className="rounded-xl border auth-card p-4 shadow-card lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">My Repair Orders</h2>
            <p className="text-xs text-slate-300">View and manage all your repair requests.</p>
          </div>
          <Link to="/repairs" className="btn whitespace-nowrap">Open</Link>
        </div>
      </section>

      <section className="rounded-xl border auth-card p-4 shadow-card hidden lg:block">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">My Repair Orders</h2>
          <div className="flex items-center gap-3">
            <Link to="/repairs" className="rounded-md border px-3 py-2 text-sm text-white hover:bg-white/5 whitespace-nowrap">View all</Link>
            <Link to="/repairs/new" className="btn whitespace-nowrap">Create Repair Order</Link>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-300">Loading your repairs...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-slate-300">No repair orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm rounded-lg overflow-hidden text-white">
              <thead>
                <tr className="text-left text-slate-300">
                  <th className="py-2 px-3">Ticket</th>
                  <th className="py-2 px-3">Device</th>
                  <th className="py-2 px-3">Issue</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Estimate</th>
                  <th className="py-2 px-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 3).map((r, idx) => (
                  <tr key={r.id} className={idx % 2 === 0 ? 'border-t' : 'border-t bg-white/5 hover:bg-white/10'}>
                    <td className="py-2 px-3 font-medium">{r.ticketNumber || r.id.slice(0, 8)}</td>
                    <td className="py-2 px-3">{
                      [
                        // Prefer frontend fields if present, else fallback to backend naming
                        (r as any).deviceBrand ?? (r as any).brand,
                        (r as any).deviceModel ?? (r as any).model,
                      ]
                        .filter(Boolean)
                        .join(' ')
                    }</td>
                    <td className="py-2 px-3 max-w-[420px] truncate" title={r.issueDescription || ''}>
                      {r.issueDescription || '-'}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[r.status] || 'bg-slate-700 text-slate-100'}`}>
                        {statusLabels[r.status] || (r.status as any) || '-'}
                      </span>
                    </td>
                    <td className="py-2 px-3">{formatCurrency(r.estimatedCost ?? r.actualCost)}</td>
                    <td className="py-2 px-3">{new Date(r.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
          </div>
        )}
      </section>
      {/* Local animation keyframes to match auth theme */}
      <style>{`
        @keyframes floatY { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @keyframes floatYrev { 0%,100% { transform: translateY(0) } 50% { transform: translateY(6px) } }
        .anim-float-slow { animation: floatY 10s ease-in-out infinite; }
        .anim-float-rev { animation: floatYrev 11s ease-in-out infinite; }
      `}</style>
      {/* Chart styles not needed now; using simple SVG pie */}
    </div>
  )
}

// Donut pie chart (same as admin, with hover center info)
const AdminPieChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
  const width = 320, height = 200
  const cx = width / 2, cy = 100
  const outerR = 70, innerR = 42
  const total = Math.max(1, data.reduce((s, d) => s + (d.value || 0), 0))
  const [hover, setHover] = useState<number | null>(null)
  let start = -Math.PI / 2
  const arcs = data.map(d => {
    const frac = (d.value || 0) / total
    const end = start + frac * Math.PI * 2
    const large = end - start > Math.PI ? 1 : 0
    const x0 = cx + outerR * Math.cos(start), y0 = cy + outerR * Math.sin(start)
    const x1 = cx + outerR * Math.cos(end),   y1 = cy + outerR * Math.sin(end)
    const xi0 = cx + innerR * Math.cos(end),  yi0 = cy + innerR * Math.sin(end)
    const xi1 = cx + innerR * Math.cos(start),yi1 = cy + innerR * Math.sin(start)
    const dPath = `M ${x0} ${y0} A ${outerR} ${outerR} 0 ${large} 1 ${x1} ${y1} L ${xi0} ${yi0} A ${innerR} ${innerR} 0 ${large} 0 ${xi1} ${yi1} Z`
    const mid = (start + end) / 2
    const lx = cx + (outerR + 16) * Math.cos(mid)
    const ly = cy + (outerR + 16) * Math.sin(mid)
    const percent = Math.round(((d.value || 0) / total) * 100)
    start = end
    return { dPath, color: d.color, label: d.label, value: d.value || 0, lx, ly, percent }
  })
  const focus = hover !== null ? arcs[hover] : null
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 mx-auto block">
      <g>
        {arcs.map((a, i) => (
          <g key={i}
             onMouseEnter={() => setHover(i)}
             onMouseLeave={() => setHover(null)}
             onFocus={() => setHover(i)}
             onBlur={() => setHover(null)}
             role="button" tabIndex={0} style={{cursor:'pointer'}}>
            <path d={a.dPath}
                  fill={a.color}
                  opacity={hover === null ? (a.value === 0 ? 0.25 : 0.95) : (hover === i ? 1 : 0.18)}
                  stroke={hover === i ? '#ffffff' : 'none'} strokeWidth={hover === i ? 1.5 : 0}
            />
          </g>
        ))}
        {/* center text */}
        <circle cx={cx} cy={cy} r={innerR} fill="#0b0d12" />
        {focus ? (
          <>
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="12" fill="#cbd5e1">{focus.label}</text>
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize="18" fill="#ffffff" fontWeight={700}>{focus.value} ({focus.percent}%)</text>
          </>
        ) : (
          <>
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="12" fill="#cbd5e1">Total</text>
            <text x={cx} y={cy + 14} textAnchor="middle" fontSize="18" fill="#ffffff" fontWeight={700}>{total}</text>
          </>
        )}
      </g>
      {/* labels */}
      <g>
        {arcs.map((a, i) => (
          a.value > 0 ? (
            <g key={i}>
              <text x={a.lx} y={a.ly} textAnchor="middle" fontSize="11" fill="#cbd5e1">{a.percent}% ({a.value})</text>
            </g>
          ) : null
        ))}
      </g>
    </svg>
  )
}

export default CustomerDashboard
