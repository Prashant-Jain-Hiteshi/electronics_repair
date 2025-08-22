import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/api/client'
import { useAuth } from '@/context/AuthContext'

// Minimal shape for repairs we need
interface RepairOrderLite {
  id: string
  ticketNumber?: string
  customerId: string
  technicianId?: string | null
  deviceType?: string
  brand?: string
  model?: string
  issueDescription?: string
  status: string
  estimatedCost?: number | string | null
  actualCost?: number | string | null
  estimatedCompletionDate?: string | Date | null
  updatedAt: string
}

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  delivered: 'bg-teal-100 text-teal-800',
  cancelled: 'bg-rose-100 text-rose-800',
}

const fmtInr = (n?: number | string | null) => {
  if (n == null) return '-'
  const v = typeof n === 'string' ? Number(n) : n
  if (Number.isNaN(v)) return '-'
  return v.toLocaleString(undefined, { style: 'currency', currency: 'INR' })
}

// Small inline icons for metrics
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

const TechnicianDashboard: React.FC = () => {
  const { user } = useAuth()
  const [repairs, setRepairs] = useState<RepairOrderLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sp, setSp] = useSearchParams()
  const initialTab = (sp.get('tab') as 'pending'|'in_progress'|'completed') || 'pending'
  const [tab, setTab] = useState<'pending' | 'in_progress' | 'completed'>(initialTab)
  const [busyId, setBusyId] = useState<string | null>(null)
  const hasTab = !!sp.get('tab')

  // Estimate form state per row
  const [estimateForm, setEstimateForm] = useState<Record<string, { amount: string; serviceCharge: string; timeRequired: string }>>({})

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/repairs')
      const items: RepairOrderLite[] = data?.repairs || data || []
      setRepairs(items)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Reload data when tab changes so navigating between tabs always fetches latest
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // sync tab with URL
  useEffect(() => {
    const current = (sp.get('tab') as any) || 'pending'
    if (current !== tab) setTab(current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp])

  const setTabUrl = (t: 'pending'|'in_progress'|'completed') => {
    const next = new URLSearchParams(sp)
    next.set('tab', t)
    setSp(next, { replace: true })
    setTab(t)
  }

  const myRepairs = useMemo(() => {
    const techId = user?.id
    return repairs.filter(r => r.technicianId === techId)
  }, [repairs, user?.id])

  const filtered = useMemo(() => {
    return myRepairs.filter(r => r.status === tab)
  }, [myRepairs, tab])

  async function acceptJob(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await api.put(`/repairs/${id}`, { status: 'in_progress' })
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to accept job')
    } finally { setBusyId(null) }
  }

  async function rejectJob(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await api.put(`/repairs/${id}`, { technicianId: null, status: 'pending' })
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to reject job')
    } finally { setBusyId(null) }
  }

  async function saveEstimate(id: string) {
    const f = estimateForm[id] || { amount: '', serviceCharge: '', timeRequired: '' }
    const amount = Number(f.amount || 0)
    const svc = Number(f.serviceCharge || 0)
    const total = amount + svc
    // naive time parsing: "2 days" -> add 2 days
    let estimatedCompletionDate: Date | undefined
    const match = f.timeRequired.match(/(\d+)/)
    if (match) {
      const days = Number(match[1])
      if (!Number.isNaN(days)) {
        estimatedCompletionDate = new Date()
        estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + days)
      }
    }
    setBusyId(id)
    setError(null)
    try {
      await api.put(`/repairs/${id}`, {
        estimatedCost: total,
        estimatedCompletionDate: estimatedCompletionDate?.toISOString(),
        // Optional: keep a note
        repairNotes: `Estimate: amount=${amount}, serviceCharge=${svc}, total=${total}, timeRequired=${f.timeRequired}`,
      })
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save estimate')
    } finally { setBusyId(null) }
  }

  async function markCompleted(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await api.put(`/repairs/${id}`, { status: 'completed' })
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to complete job')
    } finally { setBusyId(null) }
  }

  // derived stats
  const counts = useMemo(() => ({
    total: myRepairs.length,
    pending: myRepairs.filter(r=>r.status==='pending').length,
    in_progress: myRepairs.filter(r=>r.status==='in_progress').length,
    completed: myRepairs.filter(r=>r.status==='completed').length,
    delivered: myRepairs.filter(r=>r.status==='delivered').length,
  }), [myRepairs])

  const pieData = useMemo(() => (
    [
      { label: 'Pending', value: counts.pending, color: '#F59E0B' },
      { label: 'In Progress', value: counts.in_progress, color: '#7C6FF1' },
      { label: 'Completed', value: counts.completed, color: '#A48AFB' },
    ]
  ), [counts.pending, counts.in_progress, counts.completed])

  // Toggle between Line and Pie chart like admin
  const [chartView, setChartView] = useState<'line' | 'pie'>('line')

  // Monthly series for line chart derived from myRepairs (last 12 months)
  const seriesData = useMemo(() => {
    const now = new Date()
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const countsByMonth = new Array(12).fill(0)
    myRepairs.forEach(r => {
      const d = new Date(r.updatedAt)
      if (Number.isFinite(d.getTime())) {
        const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
        if (diffMonths >= 0 && diffMonths < 12) {
          countsByMonth[d.getMonth()] += 1
        }
      }
    })
    return months.map((m, i) => ({ label: m, value: countsByMonth[i] }))
  }, [myRepairs])

  return (
    <div className="space-y-6 text-white pb-4 sm:pb-16 md:pb-0">
      {!hasTab && (
        <>
          {/* Hero to mirror admin */}
          <section className="relative overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(180deg,#0b0d12_0%,#0f1218_100%)] p-6">
            <span className="pointer-events-none absolute -top-6 -left-6 h-20 w-20 rounded-full bg-[#A48AFB]/20 blur-xl anim-float-slow" />
            <span className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-[#A48AFB]/15 blur-xl anim-float-rev" />
            <div className="relative">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Technician Dashboard</h1>
              <p className="mt-1 text-slate-300">Welcome {user?.firstName} {user?.lastName}. Monitor and manage your assigned repair jobs.</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="rounded-md border border-white/10 px-3 py-1.5 bg-white/5 text-white/90">My Jobs: {counts.total}</span>
                <span className="rounded-md border border-white/10 px-3 py-1.5 bg-white/5 text-white/90">Pending: {counts.pending}</span>
                <span className="rounded-md border border-white/10 px-3 py-1.5 bg-white/5 text-white/90">In Progress: {counts.in_progress}</span>
              </div>
            </div>
          </section>

          {/* Overview + Chart grid like admin */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Chart */}
            <div className="rounded-2xl border border-white/10 auth-card backdrop-blur p-0 lg:col-span-2 overflow-hidden bg-[#12151d] text-white">
              <div className="px-5 pt-4 pb-2 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Dashboard Overview</h3>
                <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5">
                  <button onClick={()=>setChartView('line')} className={`px-2.5 py-1 text-xs rounded-md ${chartView==='line'?'bg-white/20 text-white':'text-slate-300 hover:text-white'}`}>Line</button>
                  <button onClick={()=>setChartView('pie')} className={`px-2.5 py-1 text-xs rounded-md ${chartView==='pie'?'bg-white/20 text-white':'text-slate-300 hover:text-white'}`}>Pie</button>
                </div>
              </div>
              <div className="p-5">
                {chartView === 'line' ? (
                  <>
                    <LineAreaChart data={seriesData} />
                    <div className="mt-3 text-xs text-slate-300">
                      <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full" style={{background:'#7C6FF1'}} /> Total Requests</span>
                    </div>
                  </>
                ) : (
                  <>
                    <TechPieChart data={pieData} />
                    <div className="mt-4 flex items-center gap-4 text-xs text-slate-300">
                      <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{background:'#F59E0B'}} /> Pending</span>
                      <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{background:'#7C6FF1'}} /> In Progress</span>
                      <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{background:'#A48AFB'}} /> Completed</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right side metrics (5 cards) */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-[#12151d] p-4 shadow-sm min-w-0">
                <p className="text-xs text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-emerald-300 shrink-0"><IconCheck /></span> <span className="truncate whitespace-nowrap" title="Completed">Completed</span></p>
                <p className="text-3xl font-bold text-white">{counts.completed}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#12151d] p-4 shadow-sm min-w-0">
                <p className="text-xs text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-slate-300 shrink-0"><IconTruck /></span> <span className="truncate whitespace-nowrap" title="Delivered">Delivered</span></p>
                <p className="text-3xl font-bold text-white">{counts.delivered}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#12151d] p-4 shadow-sm min-w-0">
                <p className="text-xs text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-amber-300 shrink-0"><IconClock /></span> <span className="truncate whitespace-nowrap" title="Pending">Pending</span></p>
                <p className="text-3xl font-bold text-white">{counts.pending}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#12151d] p-4 shadow-sm min-w-0">
                <p className="text-xs text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-[#A48AFB] shrink-0"><IconProgress /></span> <span className="truncate whitespace-nowrap" title="In Progress">In Progress</span></p>
                <p className="text-3xl font-bold text-white">{counts.in_progress}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#12151d] p-4 shadow-sm md:col-span-2 lg:col-span-1 min-w-0">
                <p className="text-xs text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-slate-300 shrink-0"><IconGrid /></span> <span className="truncate whitespace-nowrap" title="Total">Total</span></p>
                <p className="text-3xl font-bold text-white">{counts.total}</p>
              </div>
            </div>
          </section>
          
        </>
      )}

      {loading ? (
        <div className="py-10 text-center text-slate-300">Loading jobs...</div>
      ) : error ? (
        <div className="py-3 text-rose-400">{error}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#12151d]">
          {/* Quick tab buttons like before */}
          <div className="flex items-center gap-2 p-3 border-b border-white/10">
            {(['pending','in_progress','completed'] as const).map(t => (
              <button key={t} onClick={()=> hasTab ? setTabUrl(t) : setTab(t)}
                className={`rounded-md px-3 py-1.5 text-sm ${hasTab && tab===t ? 'bg-white/10 border border-white/20 text-white' : 'border border-white/10 hover:bg-white/5 text-slate-200'}`}
              >{t==='in_progress'?'In Progress':t.charAt(0).toUpperCase()+t.slice(1)}</button>
            ))}
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-300 border-b border-white/10">
                <th className="py-2 px-3">Ticket</th>
                <th className="py-2 px-3">Device</th>
                <th className="py-2 px-3">Issue</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Estimate</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(!hasTab ? filtered.slice(0,3) : filtered).map(r => (
                <tr key={r.id} className="border-t border-white/10 hover:bg-white/5 align-top">
                  <td className="py-2 px-3 font-medium">{r.ticketNumber || r.id.slice(0,8)}</td>
                  <td className="py-2 px-3">{[r.brand, r.model].filter(Boolean).join(' ') || r.deviceType || '-'}</td>
                  <td className="py-2 px-3 max-w-[300px] truncate" title={r.issueDescription || ''}>{r.issueDescription || '-'}</td>
                  <td className="py-2 px-3"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${statusBadge[r.status]||'bg-slate-100 text-slate-700'}`}>{r.status}</span></td>
                  <td className="py-2 px-3">{fmtInr(r.estimatedCost)}</td>
                  
                  <td className="py-2 px-3">
                    {tab === 'pending' && (
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <button disabled={busyId===r.id} className="btn shrink-0" onClick={()=>acceptJob(r.id)}>{busyId===r.id?'...':'Accept'}</button>
                        <button disabled={busyId===r.id} className="btn-outline shrink-0" onClick={()=>rejectJob(r.id)}>{busyId===r.id?'...':'Reject'}</button>
                      </div>
                    )}

                    {tab === 'in_progress' && (
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <input
                          className="input inline-block w-auto shrink-0"
                          style={{ width: 'auto' }}
                          size={8}
                          placeholder="Amount"
                          type="number"
                          value={estimateForm[r.id]?.amount ?? ''}
                          onChange={e=>setEstimateForm(prev=>({ ...prev, [r.id]: { ...(prev[r.id]||{amount:'',serviceCharge:'',timeRequired:''}), amount: e.target.value } }))}
                        />
                        <input
                          className="input inline-block w-auto shrink-0"
                          style={{ width: 'auto' }}
                          size={12}
                          placeholder="Service Charge"
                          type="number"
                          value={estimateForm[r.id]?.serviceCharge ?? ''}
                          onChange={e=>setEstimateForm(prev=>({ ...prev, [r.id]: { ...(prev[r.id]||{amount:'',serviceCharge:'',timeRequired:''}), serviceCharge: e.target.value } }))}
                        />
                        <input
                          className="input inline-block w-auto shrink-0"
                          style={{ width: 'auto' }}
                          size={24}
                          placeholder="Time Required (e.g., 2 days)"
                          value={estimateForm[r.id]?.timeRequired ?? ''}
                          onChange={e=>setEstimateForm(prev=>({ ...prev, [r.id]: { ...(prev[r.id]||{amount:'',serviceCharge:'',timeRequired:''}), timeRequired: e.target.value } }))}
                        />
                        <button disabled={busyId===r.id} className="btn shrink-0" onClick={()=>saveEstimate(r.id)}>{busyId===r.id?'Saving...':'Save Estimate'}</button>
                        <button disabled={busyId===r.id} className="btn-outline shrink-0" onClick={()=>markCompleted(r.id)}>{busyId===r.id?'...':'Mark Completed'}</button>
                      </div>
                    )}

                    {tab === 'completed' && (
                      <span className="text-slate-400">Updated: {new Date(r.updatedAt).toLocaleDateString()}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!hasTab && filtered.length > 3 && (
            <div className="flex justify-end p-3 border-t border-white/10">
              <button onClick={()=>setTabUrl(tab)} className="btn">View all</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Donut pie chart with rotation + auto cycling highlight
const TechPieChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
  const width = 320, height = 200
  const cx = width / 2, cy = 100
  const outerR = 70, innerR = 42
  const total = Math.max(1, data.reduce((s, d) => s + (d.value || 0), 0))
  const [hover, setHover] = useState<number | null>(null)
  const [autoIndex, setAutoIndex] = useState(0)
  useEffect(() => {
    const n = data.length || 1
    const id = setInterval(() => setAutoIndex(i => (i + 1) % n), 2500)
    return () => clearInterval(id)
  }, [data.length])
  const effectiveHover = hover !== null ? hover : (data.length ? autoIndex % data.length : null)

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
    const percent = Math.round(((d.value || 0) / total) * 100)
    start = end
    return { dPath, color: d.color, label: d.label, value: d.value || 0, percent }
  })
  const focus = effectiveHover !== null && effectiveHover! < arcs.length ? arcs[effectiveHover!] : null
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 mx-auto block">
      <g>
        <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="12s" repeatCount="indefinite" />
        {arcs.map((a, i) => (
          <g key={i}
             onMouseEnter={() => setHover(i)}
             onMouseLeave={() => setHover(null)}
             onFocus={() => setHover(i)}
             onBlur={() => setHover(null)}
             role="button" tabIndex={0} style={{cursor:'pointer'}}>
            <path d={a.dPath}
                  fill={a.color}
                  opacity={effectiveHover === null ? (a.value === 0 ? 0.25 : 0.95) : (effectiveHover === i ? 1 : 0.18)}
                  stroke={effectiveHover === i ? '#ffffff' : 'none'} strokeWidth={effectiveHover === i ? 1.5 : 0}
            />
          </g>
        ))}
      </g>
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
    </svg>
  )
}

// Animated Line + Area chart with gradient and moving marker
function LineAreaChart({ data }: { data: { label: string; value: number }[] }) {
  const width = 640
  const height = 220
  const padding = { left: 24, right: 24, top: 16, bottom: 34 }
  const w = width - padding.left - padding.right
  const h = height - padding.top - padding.bottom

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const nonZero = data?.some(d => d.value > 0)
  const series = (nonZero && data?.length) ? data : [5,7,4,9,12,8,11,6,10,7,9,13].map((v,i)=>({label:months[i], value:v}))

  const maxV = Math.max(1, ...series.map(d => d.value))
  const stepX = series.length > 1 ? (w / (series.length - 1)) : w
  const points = series.map((d, i) => {
    const x = padding.left + i * stepX
    const y = padding.top + (h - (d.value / maxV) * h)
    return { x, y }
  })

  const pathD = (() => {
    if (!points.length) return ''
    const d: string[] = []
    d.push(`M ${points[0].x} ${points[0].y}`)
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1]
      const p1 = points[i]
      const cx = (p0.x + p1.x) / 2
      d.push(`C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`)
    }
    return d.join(' ')
  })()

  const areaD = pathD
    ? `${pathD} L ${padding.left + (series.length - 1) * stepX} ${padding.top + h} L ${padding.left} ${padding.top + h} Z`
    : ''

  const gradId = React.useRef(`grad-${Math.random().toString(36).slice(2)}`).current
  const pathId = React.useRef(`path-${Math.random().toString(36).slice(2)}`).current

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 block">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A48AFB" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#A48AFB" stopOpacity="0.08" />
        </linearGradient>
        <filter id="soft-tech" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
        </filter>
      </defs>

      <path d={areaD} fill={`url(#${gradId})`} />
      <path id={pathId} d={pathD} fill="none" stroke="#7C6FF1" strokeWidth={3} style={{ filter: 'url(#soft-tech)' }}>
        <animate attributeName="stroke-dasharray" from="0,1000" to="1000,0" dur="1.1s" fill="freeze" />
      </path>

      <circle r={6} fill="#ffffff" stroke="#7C6FF1" strokeWidth={3}>
        <animateMotion dur="10s" repeatCount="indefinite" rotate="auto">
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>

      <g>
        {series.map((d, i) => (
          <text key={i} x={padding.left + i * stepX} y={height - 10} textAnchor="middle" fontSize="10" fill="#cbd5e1">{d.label}</text>
        ))}
      </g>
    </svg>
  )
}

export default TechnicianDashboard
