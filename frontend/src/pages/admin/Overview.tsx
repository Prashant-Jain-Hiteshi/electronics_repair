import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type ApiError } from '@/api/client'

type OverviewData = {
  repairsCount: number
  customersCount: number
  techniciansCount: number
  inventoryCount: number
  paymentsTotal: number
  byStatus: { status: string; count: number }[]
}

// Small inline icons for metric cards
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

const Overview: React.FC = () => {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // recent repairs for overview table (admin)
  const [recent, setRecent] = useState<any[]>([])
  const [recentLoading, setRecentLoading] = useState<boolean>(true)
  const [recentError, setRecentError] = useState<string | null>(null)

  // Pie data from data.byStatus totals (defensive to missing data)
  const pieData = useMemo(() => {
    const byStatus = Array.isArray(data?.byStatus) ? data!.byStatus : []
    const map: Record<string, number> = {}
    for (const r of byStatus) {
      const s = String(r?.status || '')
      const c = Number(r?.count || 0)
      map[s] = (map[s] || 0) + (Number.isFinite(c) ? c : 0)
    }
    const pending = map['pending'] || 0
    const in_progress = map['in_progress'] || 0
    const completed = map['completed'] || 0
    return [
      { label: 'Pending', value: pending, color: '#F59E0B' },
      { label: 'In Progress', value: in_progress, color: '#7C6FF1' },
      { label: 'Completed', value: completed, color: '#A48AFB' },
    ]
  }, [data?.byStatus])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.get('/repairs/overview')
        if (!mounted) return
        setData(res.data)
        // Load recent repairs for the admin table
        setRecentLoading(true)
        setRecentError(null)
        try {
          const r = await api.get('/repairs')
          if (!mounted) return
          const rows = Array.isArray(r.data) ? r.data : (r.data?.repairs || [])
          setRecent(rows)
        } catch (e: any) {
          if (!mounted) return
          const err = (e?.response?.data as ApiError) || {}
          setRecentError(err.message || 'Failed to load recent repairs')
        } finally {
          if (mounted) setRecentLoading(false)
        }
      } catch (e: any) {
        const err = (e?.response?.data as ApiError) || {}
        setError(err.message || 'Failed to load overview')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="text-white">Loading...</div>
  if (error) return <div className="text-red-400">{error}</div>
  if (!data) return null

  // Build a quick lookup for byStatus counts
  const statusMap = data.byStatus.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = s.count
    return acc
  }, {})

  

  return (
    <div className="space-y-6 text-white pb-4 sm:pb-16 md:pb-0">
      {/* Hero (dark themed like customer) */}
      <section className="relative overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(180deg,#0b0d12_0%,#0f1218_100%)] p-6">
        <span className="pointer-events-none absolute -top-6 -left-6 h-20 w-20 rounded-full bg-[#A48AFB]/20 blur-xl anim-float-slow" />
        <span className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-[#A48AFB]/15 blur-xl anim-float-rev" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Admin Dashboard</h1>
          <p className="mt-1 text-slate-300">Monitor repairs, customers, technicians, inventory and payments.</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-md border border-white/10 px-3 py-1.5 bg-white/5 text-white/90">Repairs: {data.repairsCount}</span>
            <span className="rounded-md border border-white/10 px-3 py-1.5 bg-white/5 text-white/90">Customers: {data.customersCount}</span>
            <span className="rounded-md border border-white/10 px-3 py-1.5 bg-white/5 text-white/90">Technicians: {data.techniciansCount}</span>
          </div>
        </div>
      </section>
      

      
      

      

      

      

      {/* Overview + Chart grid (mirrors customer) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="rounded-2xl border border-white/10 auth-card backdrop-blur p-0 lg:col-span-2 overflow-hidden bg-[#12151d] text-white">
          <div className="px-5 pt-4 pb-2 border-b border-white/10 bg-white/5">
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

        {/* Right side metrics (5 cards) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-[#12151d] p-4 shadow-sm min-w-0">
            <p className="text-xs text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-emerald-300 shrink-0"><IconCheck /></span> <span className="truncate whitespace-nowrap" title="Completed">Completed</span></p>
            <p className="text-3xl font-bold text-white">{statusMap.completed || 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#12151d] p-4 shadow-sm min-w-0">
            <p className="text-xs text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-slate-300 shrink-0"><IconTruck /></span> <span className="truncate whitespace-nowrap" title="Delivered">Delivered</span></p>
            <p className="text-3xl font-bold text-white">{statusMap.delivered || 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#12151d] p-4 shadow-sm min-w-0">
            <p className="text-xs text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-amber-300 shrink-0"><IconClock /></span> <span className="truncate whitespace-nowrap" title="Pending">Pending</span></p>
            <p className="text-3xl font-bold text-white">{statusMap.pending || 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#12151d] p-4 shadow-sm min-w-0">
            <p className="text-xs text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-[#A48AFB] shrink-0"><IconProgress /></span> <span className="truncate whitespace-nowrap" title="In Progress">In Progress</span></p>
            <p className="text-3xl font-bold text-white">{statusMap.in_progress || 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#12151d] p-4 shadow-sm md:col-span-2 lg:col-span-1 min-w-0">
            <p className="text-xs text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-slate-300 shrink-0"><IconGrid /></span> <span className="truncate whitespace-nowrap" title="Total">Total</span></p>
            <p className="text-3xl font-bold text-white">{data.repairsCount}</p>
          </div>
        </div>
      </section>

      {/* My Repair Orders - desktop, placed after chart to match customer */}
      <section className="rounded-xl border border-white/10 auth-card p-4 shadow-sm hidden lg:block">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">My Repair Orders</h2>
          <div className="flex items-center gap-3">
            <Link to="/admin/repairs" className="rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/5 whitespace-nowrap">View all</Link>
            <Link to="/admin/repairs/create" className="rounded-md border border-[#7C6FF1]/30 bg-[#7C6FF1]/10 px-3 py-2 text-sm text-[#7C6FF1] hover:bg-[#7C6FF1]/20 whitespace-nowrap">Create Repair Order</Link>
          </div>
        </div>

        {recentLoading ? (
          <div className="py-10 text-center text-slate-300">Loading recent repairs...</div>
        ) : recentError ? (
          <div className="py-10 text-center text-red-400">{recentError}</div>
        ) : recent.length === 0 ? (
          <div className="py-10 text-center text-slate-300">No repairs found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm rounded-lg overflow-hidden text-white">
                <thead>
                  <tr className="text-left text-slate-300 border-b border-white/10">
                    <th className="py-2 px-3">ID</th>
                    <th className="py-2 px-3">Device</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Priority</th>
                    <th className="py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.slice(0, 2).map((r: any, idx: number) => (
                    <tr key={r.id} className={idx % 2 === 0 ? 'border-t border-white/10' : 'border-t border-white/10 hover:bg-white/5'}>
                      <td className="py-2 px-3 font-mono text-xs">{r.id}</td>
                      <td className="py-2 px-3">{r.deviceType} • {r.brand} {r.model}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.status === 'pending' ? 'text-amber-300 bg-amber-400/10 border border-amber-400/20' :
                          r.status === 'in_progress' ? 'text-[#A48AFB] bg-[#A48AFB]/10 border border-[#A48AFB]/20' :
                          r.status === 'awaiting_parts' ? 'text-[#A48AFB] bg-[#A48AFB]/10 border border-[#A48AFB]/20' :
                          r.status === 'completed' ? 'text-emerald-300 bg-emerald-400/10 border border-emerald-400/20' :
                          r.status === 'delivered' ? 'text-slate-300 bg-white/5 border border-white/10' :
                          r.status === 'cancelled' ? 'text-rose-300 bg-rose-400/10 border border-rose-400/20' :
                          'text-slate-300 bg-white/5 border border-white/10'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 px-3">{r.priority}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <Link className="btn btn-sm" to={`/admin/repairs/${r.id}`}>Details</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex justify-end">
              <Link to="/admin/repairs" className="rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/5 whitespace-nowrap">View all</Link>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

const StatCard: React.FC<{ title: string; value: number | string }> = ({ title, value }) => (
  <div className="bg-[#12151d] backdrop-blur rounded-2xl border border-white/10 p-4 shadow-sm">
    <div className="text-xs text-slate-300">{title}</div>
    <div className="text-lg font-semibold mt-1 text-white">{value}</div>
  </div>
)

// Donut pie chart for status totals (with hover highlight)
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
             role="button"
             tabIndex={0}
             style={{cursor:'pointer'}}>
            <path d={a.dPath}
                  fill={a.color}
                  opacity={hover === null ? (a.value === 0 ? 0.25 : 0.95) : (hover === i ? 1 : 0.18)}
                  stroke={hover === i ? '#ffffff' : 'none'}
                  strokeWidth={hover === i ? 1.5 : 0}
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

export default Overview
