import React, { useEffect, useState } from 'react'
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

const Overview: React.FC = () => {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // recent repairs for overview table (admin)
  const [recent, setRecent] = useState<any[]>([])
  const [recentLoading, setRecentLoading] = useState<boolean>(true)
  const [recentError, setRecentError] = useState<string | null>(null)

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
    <div className="space-y-6 text-white">
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

      {/* Recent Repairs - responsive like customer table; show 2 rows */}
      <section className="rounded-xl border border-white/10 auth-card p-4 shadow-sm lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Recent Repairs</h2>
            <p className="text-xs text-slate-300">Quick view of latest repair orders.</p>
          </div>
          <Link to="/admin/repairs" className="btn whitespace-nowrap">Open</Link>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 auth-card p-4 shadow-sm hidden lg:block">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Repairs</h2>
          <div className="flex items-center gap-3">
            <Link to="/admin/repairs" className="rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/5 whitespace-nowrap">View all</Link>
          </div>
        </div>

        {recentLoading ? (
          <div className="py-10 text-center text-slate-300">Loading recent repairs...</div>
        ) : recentError ? (
          <div className="py-10 text-center text-red-400">{recentError}</div>
        ) : recent.length === 0 ? (
          <div className="py-10 text-center text-slate-300">No repairs found.</div>
        ) : (
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
        )}
      </section>

      {/* Overview + Chart grid (mirrors customer) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="rounded-2xl border border-white/10 auth-card backdrop-blur p-0 lg:col-span-2 overflow-hidden bg-[#12151d] text-white">
          <div className="px-5 pt-4 pb-2 border-b border-white/10 bg-white/5">
            <h3 className="text-lg font-semibold text-white">Dashboard Overview</h3>
          </div>
          <div className="p-5">
            <MiniAreaChart />
            <div className="mt-4 flex items-center gap-4 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#8d75ff] inline-block" /> Completed</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#A48AFB] inline-block" /> In Progress</span>
            </div>
          </div>
        </div>

        {/* Right side metrics (5 cards) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-[#12151d] p-4 shadow-sm">
            <p className="text-xs text-slate-300">Completed</p>
            <p className="text-3xl font-bold text-white">{statusMap.completed || 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#12151d] p-4 shadow-sm">
            <p className="text-xs text-slate-300">Delivered</p>
            <p className="text-3xl font-bold text-white">{statusMap.delivered || 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#12151d] p-4 shadow-sm">
            <p className="text-xs text-slate-300">Pending</p>
            <p className="text-3xl font-bold text-white">{statusMap.pending || 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#12151d] p-4 shadow-sm">
            <p className="text-xs text-slate-300">In Progress</p>
            <p className="text-3xl font-bold text-white">{statusMap.in_progress || 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#12151d] p-4 shadow-sm md:col-span-2 lg:col-span-1">
            <p className="text-xs text-slate-300">Total</p>
            <p className="text-3xl font-bold text-white">{data.repairsCount}</p>
          </div>
        </div>
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

// Lightweight decorative area chart (same as customer)
const MiniAreaChart: React.FC = () => {
  return (
    <svg viewBox="0 0 300 120" className="w-full h-40">
      <defs>
        <linearGradient id="ga1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#A48AFB" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#A48AFB" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ga2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#6E55E5" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6E55E5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="#2c3140" strokeWidth="1">
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={i} x1="0" x2="300" y1={20 * (i + 1)} y2={20 * (i + 1)} />
        ))}
      </g>
      <path d="M0,90 C30,70 60,80 90,68 C120,56 150,78 180,65 C210,52 240,60 270,50 L300,50 L300,120 L0,120 Z" fill="url(#ga2)" />
      <path d="M0,90 C30,70 60,80 90,68 C120,56 150,78 180,65 C210,52 240,60 270,50" fill="none" stroke="#6E55E5" strokeWidth="2" className="chart-path" />
      <path d="M0,95 C30,85 60,90 90,80 C120,70 150,92 180,84 C210,76 240,82 270,76 L300,76 L300,120 L0,120 Z" fill="url(#ga1)" />
      <path d="M0,95 C30,85 60,90 90,80 C120,70 150,92 180,84 C210,76 240,82 270,76" fill="none" stroke="#A48AFB" strokeWidth="2" className="chart-path" />
      <style>{`
        @keyframes floatLine { 0% { stroke-dashoffset: 600 } 100% { stroke-dashoffset: 0 } }
        .chart-path { stroke-dasharray: 600; animation: floatLine 2.2s ease forwards; }
      `}</style>
    </svg>
  )
}

export default Overview
