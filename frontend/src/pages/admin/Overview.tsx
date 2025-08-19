import React, { useEffect, useState } from 'react'
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

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.get('/repairs/overview')
        if (!mounted) return
        setData(res.data)
      } catch (e: any) {
        const err = (e?.response?.data as ApiError) || {}
        setError(err.message || 'Failed to load overview')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!data) return null

  // Build a quick lookup for byStatus counts
  const statusMap = data.byStatus.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = s.count
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100 p-6">
        <span className="pointer-events-none absolute -top-6 -left-6 h-20 w-20 rounded-full bg-emerald-300/30 blur-xl anim-float-slow" />
        <span className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-emerald-300/25 blur-xl anim-float-rev" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-slate-600">Monitor repairs, customers, technicians, inventory and payments.</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-md border px-3 py-1.5 bg-white/60">Repairs: {data.repairsCount}</span>
            <span className="rounded-md border px-3 py-1.5 bg-white/60">Customers: {data.customersCount}</span>
            <span className="rounded-md border px-3 py-1.5 bg-white/60">Technicians: {data.techniciansCount}</span>
          </div>
        </div>
      </section>

      {/* Overview + Chart grid (mirrors customer) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
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

        {/* Right side metrics (5 cards) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white p-4 shadow-card">
            <p className="text-xs text-slate-500">Completed</p>
            <p className="text-3xl font-bold">{statusMap.completed || 0}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-card">
            <p className="text-xs text-slate-500">Delivered</p>
            <p className="text-3xl font-bold">{statusMap.delivered || 0}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-card">
            <p className="text-xs text-slate-500">Pending</p>
            <p className="text-3xl font-bold">{statusMap.pending || 0}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-card">
            <p className="text-xs text-slate-500">In Progress</p>
            <p className="text-3xl font-bold">{statusMap.in_progress || 0}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-card md:col-span-2 lg:col-span-1">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-3xl font-bold">{data.repairsCount}</p>
          </div>
        </div>
      </section>

      {/* Repairs by status chips */}
      <div>
        <h2 className="text-sm font-medium text-slate-600 mb-2">Repairs by Status</h2>
        <div className="flex flex-wrap gap-2">
          {data.byStatus.map((s) => (
            <div
              key={s.status}
              className="px-3 py-2 bg-white/90 backdrop-blur rounded-full border border-emerald-100 text-sm shadow-sm"
            >
              <span className="font-medium text-emerald-700">{s.status}</span>: {s.count}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const StatCard: React.FC<{ title: string; value: number | string }> = ({ title, value }) => (
  <div className="bg-white/90 backdrop-blur rounded-2xl border border-emerald-100 p-4 shadow-sm">
    <div className="text-xs text-slate-500">{title}</div>
    <div className="text-lg font-semibold mt-1 text-slate-800">{value}</div>
  </div>
)

// Lightweight decorative area chart (same as customer)
const MiniAreaChart: React.FC = () => {
  return (
    <svg viewBox="0 0 300 120" className="w-full h-40">
      <defs>
        <linearGradient id="ga1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ga2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#065f46" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#065f46" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="#e5e7eb" strokeWidth="1">
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={i} x1="0" x2="300" y1={20 * (i + 1)} y2={20 * (i + 1)} />
        ))}
      </g>
      <path d="M0,90 C30,70 60,80 90,68 C120,56 150,78 180,65 C210,52 240,60 270,50 L300,50 L300,120 L0,120 Z" fill="url(#ga2)" />
      <path d="M0,90 C30,70 60,80 90,68 C120,56 150,78 180,65 C210,52 240,60 270,50" fill="none" stroke="#065f46" strokeWidth="2" className="chart-path" />
      <path d="M0,95 C30,85 60,90 90,80 C120,70 150,92 180,84 C210,76 240,82 270,76 L300,76 L300,120 L0,120 Z" fill="url(#ga1)" />
      <path d="M0,95 C30,85 60,90 90,80 C120,70 150,92 180,84 C210,76 240,82 270,76" fill="none" stroke="#10b981" strokeWidth="2" className="chart-path" />
      <style>{`
        @keyframes floatLine { 0% { stroke-dashoffset: 600 } 100% { stroke-dashoffset: 0 } }
        .chart-path { stroke-dasharray: 600; animation: floatLine 2.2s ease forwards; }
      `}</style>
    </svg>
  )
}

export default Overview
