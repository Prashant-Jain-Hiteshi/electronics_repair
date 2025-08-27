import React, { useEffect, useMemo, useState } from 'react'
import { api } from '@/api/client'

const Analytics: React.FC = () => {
  // Filters
  const [revRange, setRevRange] = useState<'daily'|'weekly'|'monthly'>('monthly')
  const [filterDevice, setFilterDevice] = useState<string>('')
  const [filterTech, setFilterTech] = useState<string>('')
  const [revMin, setRevMin] = useState<number | ''>('')
  const [revMax, setRevMax] = useState<number | ''>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  // Data
  const [revenueRows, setRevenueRows] = useState<any[]>([])
  const [techPerf, setTechPerf] = useState<any[]>([])
  const [deviceRows, setDeviceRows] = useState<any[]>([])
  const [techMetric, setTechMetric] = useState<'completed'|'revenue'|'avgTime'>('completed')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const rev = await api.get('/analytics/revenue', { params: { range: revRange, from: fromDate || undefined, to: toDate || undefined } })
        if (!mounted) return
        const rows = Array.isArray(rev.data?.rows) ? rev.data.rows : []
        const filtered = rows.filter((r: any) => {
          const total = Number(r.total || 0)
          const minOk = revMin === '' || total >= Number(revMin)
          const maxOk = revMax === '' || total <= Number(revMax)
          return minOk && maxOk
        })
        setRevenueRows(filtered)
      } catch {}

      try {
        const tp = await api.get('/analytics/technicians/performance', { params: { from: fromDate || undefined, to: toDate || undefined } })
        if (!mounted) return
        let rows = Array.isArray(tp.data?.rows) ? tp.data.rows : []
        if (filterTech) rows = rows.filter((r: any) => String(r.technicianId) === String(filterTech) || String(r.technician) === filterTech)
        setTechPerf(rows)
      } catch {}

      try {
        const dev = await api.get('/analytics/repairs', { params: { groupBy: 'device', from: fromDate || undefined, to: toDate || undefined, deviceType: filterDevice || undefined, technicianId: filterTech || undefined } })
        if (!mounted) return
        let rows = Array.isArray(dev.data?.rows) ? dev.data.rows : []
        if (filterDevice) rows = rows.filter((r: any) => String(r.deviceType || 'Unknown') === filterDevice)
        setDeviceRows(rows)
      } catch {}
    })()
    return () => { mounted = false }
  }, [revRange, revMin, revMax, filterTech, filterDevice, fromDate, toDate])

  const revenueSeries = useMemo(() => {
    const fmt = (d: any) => {
      try {
        const dt = new Date(d)
        if (revRange === 'daily') return dt.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
        if (revRange === 'weekly') return `Wk ${getWeek(dt)}`
        return dt.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
      } catch { return String(d) }
    }
    return (Array.isArray(revenueRows) ? revenueRows : []).map((r: any) => ({ label: fmt(r.bucket), value: Number(r.total || 0) }))
  }, [revenueRows, revRange])

  return (
    <div className="space-y-4 text-white">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      {/* Filters */}
      <div className="rounded-2xl border border-white/10 bg-[#12151d] text-white p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-slate-300">Revenue Range</label>
            <select value={revRange} onChange={e=>setRevRange(e.target.value as any)} className="block mt-1 bg-[#0b0d12] border border-white/10 rounded-md px-2 py-1 text-sm">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-300">From</label>
            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="block mt-1 bg-[#0b0d12] border border-white/10 rounded-md px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-300">To</label>
            <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="block mt-1 bg-[#0b0d12] border border-white/10 rounded-md px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-300">Min Revenue</label>
            <input value={revMin} onChange={e=>setRevMin(e.target.value===''? '': Number(e.target.value))} placeholder="e.g. 100" className="block mt-1 bg-[#0b0d12] border border-white/10 rounded-md px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-300">Max Revenue</label>
            <input value={revMax} onChange={e=>setRevMax(e.target.value===''? '': Number(e.target.value))} placeholder="e.g. 5000" className="block mt-1 bg-[#0b0d12] border border-white/10 rounded-md px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-300">Device Type</label>
            <input value={filterDevice} onChange={e=>setFilterDevice(e.target.value)} placeholder="e.g. Phone" className="block mt-1 bg-[#0b0d12] border border-white/10 rounded-md px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-300">Technician</label>
            <input value={filterTech} onChange={e=>setFilterTech(e.target.value)} placeholder="ID or Name" className="block mt-1 bg-[#0b0d12] border border-white/10 rounded-md px-2 py-1 text-sm" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-[#12151d] p-3">
          <div className="text-sm text-slate-300 mb-2">Revenue Trends</div>
          <LineAreaChart data={revenueSeries} />
        </div>
        <div className="rounded-xl border border-white/10 bg-[#12151d] p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-300">Technician Performance</div>
            <select value={techMetric} onChange={e=>setTechMetric(e.target.value as any)} className="bg-[#0b0d12] border border-white/10 rounded-md px-2 py-1 text-xs">
              <option value="completed">Completed</option>
              <option value="revenue">Revenue</option>
              <option value="avgTime">Avg Time (hrs)</option>
            </select>
          </div>
          <TechBarChart data={(techPerf||[]).map((r:any)=>{
            const name = String(r.technician||r.technicianId).slice(0,8)
            const value = techMetric==='completed' ? Number(r.completed||0) : techMetric==='revenue' ? Number(r.revenue||0) : Number(r.avgCompletionHours||0)
            return { name, value }
          })} />
        </div>
        <div className="rounded-xl border border-white/10 bg-[#12151d] p-3">
          <div className="text-sm text-slate-300 mb-2">Device Type Distribution</div>
          <AdminPieChart data={(deviceRows||[]).map((r:any,i:number)=>({ label: r.deviceType||'Unknown', value: Number(r.count||0), color: ['#A48AFB','#7C6FF1','#F59E0B','#10B981','#38BDF8','#F43F5E'][i%6] }))} />
        </div>
      </div>

      {/* Technician Performance Table */}
      <div className="rounded-2xl border border-white/10 bg-[#12151d] text-white p-4">
        <div className="text-sm text-slate-300 mb-3">Technician Performance & Reports</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-300">
              <tr className="text-left border-b border-white/10">
                <th className="py-2 pr-4">Technician</th>
                <th className="py-2 pr-4">Total Repairs</th>
                <th className="py-2 pr-4">Completed</th>
                <th className="py-2 pr-4">Revenue</th>
                <th className="py-2 pr-4">Avg Completion Time</th>
              </tr>
            </thead>
            <tbody>
              {(techPerf||[]).map((r:any, idx:number)=> (
                <tr key={idx} className="border-b border-white/5">
                  <td className="py-2 pr-4">{r.technician || r.technicianId}</td>
                  <td className="py-2 pr-4">{Number(r.totalRepairs||0)}</td>
                  <td className="py-2 pr-4">{Number(r.completed||0)}</td>
                  <td className="py-2 pr-4">${'{'}Number(r.revenue||0).toFixed(2){'}'}</td>
                  <td className="py-2 pr-4">{r.avgCompletionHours!=null? Number(r.avgCompletionHours).toFixed(2) : '—'} hrs</td>
                </tr>
              ))}
              {(!techPerf || techPerf.length===0) && (
                <tr>
                  <td className="py-4 text-slate-400" colSpan={5}>No technician data for selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Utils
function getWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1))
  return Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1)/7)
}

// Simple Bar chart
const TechBarChart: React.FC<{ data: { name: string; value: number }[] }> = ({ data }) => {
  const width = 640
  const height = 220
  const padding = { left: 34, right: 16, top: 16, bottom: 34 }
  const w = width - padding.left - padding.right
  const h = height - padding.top - padding.bottom
  const maxV = Math.max(1, ...data.map(d => d.value))
  const bw = data.length ? Math.max(12, w / data.length - 10) : 24
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 block">
      <g transform={`translate(${padding.left},${padding.top})`}>
        {data.map((d, i) => {
          const x = i * (bw + 10)
          const barH = (d.value / maxV) * h
          const y = h - barH
          return (
            <g key={i}>
              <rect x={x} y={y} width={bw} height={barH} fill="#7C6FF1" rx={4} />
              <text x={x + bw / 2} y={h + 14} textAnchor="middle" fontSize="10" fill="#cbd5e1">{d.name}</text>
              <text x={x + bw / 2} y={y - 4} textAnchor="middle" fontSize="10" fill="#ffffff">{d.value}</text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

// Donut pie chart
const AdminPieChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
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

// Line + Area chart
function LineAreaChart({ data }: { data: { label: string; value: number }[] }) {
  const width = 640
  const height = 220
  const padding = { left: 24, right: 24, top: 16, bottom: 34 }
  const w = width - padding.left - padding.right
  const h = height - padding.top - padding.bottom

  const nonZero = data?.some(d => d.value > 0)
  const series = (nonZero && data?.length) ? data : []

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
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
        </filter>
      </defs>

      <path d={areaD} fill={`url(#${gradId})`} />
      <path id={pathId} d={pathD} fill="none" stroke="#7C6FF1" strokeWidth={3} style={{ filter: 'url(#soft)' }}>
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

export default Analytics
