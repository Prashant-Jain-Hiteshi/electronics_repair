import React, { useEffect, useMemo, useState } from 'react'
import { api } from '@/api/client'
import type { RepairOrder, RepairStatus } from '@/types/repair'
import { useAuth } from '@/context/AuthContext'
import { Link } from 'react-router-dom'

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
  new: 'bg-slate-200 text-slate-700',
  diagnosis: 'bg-amber-200 text-amber-800',
  waiting_parts: 'bg-yellow-200 text-yellow-800',
  in_progress: 'bg-blue-200 text-blue-800',
  completed: 'bg-emerald-200 text-emerald-800',
  delivered: 'bg-teal-200 text-teal-800',
  canceled: 'bg-rose-200 text-rose-800',
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

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100 p-6">
        <span className="pointer-events-none absolute -top-6 -left-6 h-20 w-20 rounded-full bg-emerald-300/30 blur-xl anim-float-slow" />
        <span className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-emerald-300/25 blur-xl anim-float-rev" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Hi, {user?.firstName} {user?.lastName}</h1>
          <p className="mt-1 text-slate-600">Welcome back! Track your device repairs and manage new orders here.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/repairs" className="rounded-md border px-4 py-2 text-sm text-slate-700 hover:bg-white/60">View all orders</Link>
            <Link to="/repairs/new" className="btn">Create Repair Order</Link>
          </div>
        </div>
      </section>

      {/* Overview + Chart grid to resemble the sample two-column layout */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Chart card */}
        <div className="rounded-2xl border bg-white shadow-card p-0 lg:col-span-2 overflow-hidden">
          <div className="px-5 pt-4 pb-2 border-b bg-white/60">
            <h3 className="text-lg font-semibold">Dashboard Overview</h3>
          </div>
          <div className="p-5">
            <MiniAreaChart />
            <div className="mt-4 flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-600 inline-block" /> Completed</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> In Progress</span>
            </div>
          </div>
        </div>

        {/* Right side overview cards - 5 metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white p-4 shadow-card">
            <p className="text-xs text-slate-500">Completed</p>
            <p className="text-3xl font-bold">{stats.byStatus?.completed || 0}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-card">
            <p className="text-xs text-slate-500">Delivered</p>
            <p className="text-3xl font-bold">{stats.byStatus?.delivered || 0}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-card">
            <p className="text-xs text-slate-500">Pending</p>
            <p className="text-3xl font-bold">{stats.byStatus?.pending || 0}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-card">
            <p className="text-xs text-slate-500">In Progress</p>
            <p className="text-3xl font-bold">{stats.byStatus?.in_progress || 0}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-card md:col-span-2 lg:col-span-1">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>
        </div>
      </section>

      {/* Removed secondary KPI chips to avoid duplicate information */}

      {/* Mobile CTA to view orders when table is hidden */}
      <section className="rounded-xl border bg-white p-4 shadow-card lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">My Repair Orders</h2>
            <p className="text-xs text-slate-500">View and manage all your repair requests.</p>
          </div>
          <Link to="/repairs" className="btn whitespace-nowrap">Open</Link>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-card hidden lg:block">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">My Repair Orders</h2>
          <div className="flex items-center gap-3">
            <Link to="/repairs" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50 whitespace-nowrap">View all</Link>
            <Link to="/repairs/new" className="btn whitespace-nowrap">Create Repair Order</Link>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-600">Loading your repairs...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-slate-600">No repair orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm rounded-lg overflow-hidden">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="py-2 px-3">Ticket</th>
                  <th className="py-2 px-3">Device</th>
                  <th className="py-2 px-3">Issue</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Estimate</th>
                  <th className="py-2 px-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 4).map((r, idx) => (
                  <tr key={r.id} className={idx % 2 === 0 ? 'border-t bg-white' : 'border-t bg-slate-50 hover:bg-slate-100'}>
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
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[r.status] || 'bg-slate-100 text-slate-700'}`}>
                        {statusLabels[r.status] || (r.status as any) || '-'}
                      </span>
                    </td>
                    <td className="py-2 px-3">{formatCurrency(r.estimatedCost ?? r.actualCost)}</td>
                    <td className="py-2 px-3">{new Date(r.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 4 && (
              <div className="mt-3 flex justify-end">
                <Link to="/repairs" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">View all</Link>
              </div>
            )}
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
      {/* Inline chart component styles */}
      <style>{`
        @keyframes floatLine { 0% { stroke-dashoffset: 600 } 100% { stroke-dashoffset: 0 } }
        .chart-path { stroke-dasharray: 600; animation: floatLine 2.4s ease forwards; }
      `}</style>
    </div>
  )
}

// Lightweight decorative area chart matching the sample style (no external lib)
const MiniAreaChart: React.FC = () => {
  // Static path for aesthetics only
  return (
    <svg viewBox="0 0 300 120" className="w-full h-40">
      <defs>
        <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#065f46" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#065f46" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* grid lines */}
      <g stroke="#e5e7eb" strokeWidth="1">
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={i} x1="0" x2="300" y1={20 * (i + 1)} y2={20 * (i + 1)} />
        ))}
      </g>
      {/* dark emerald area */}
      <path d="M0,90 C30,70 60,80 90,68 C120,56 150,78 180,65 C210,52 240,60 270,50 L300,50 L300,120 L0,120 Z" fill="url(#g2)" />
      <path d="M0,90 C30,70 60,80 90,68 C120,56 150,78 180,65 C210,52 240,60 270,50" fill="none" stroke="#065f46" strokeWidth="2" className="chart-path" />
      {/* green area */}
      <path d="M0,95 C30,85 60,90 90,80 C120,70 150,92 180,84 C210,76 240,82 270,76 L300,76 L300,120 L0,120 Z" fill="url(#g1)" />
      <path d="M0,95 C30,85 60,90 90,80 C120,70 150,92 180,84 C210,76 240,82 270,76" fill="none" stroke="#10b981" strokeWidth="2" className="chart-path" style={{animationDelay:'0.2s'}} />
    </svg>
  )
}

export default CustomerDashboard
