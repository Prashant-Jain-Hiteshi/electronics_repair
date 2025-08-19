import React, { useEffect, useMemo, useState } from 'react'
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

const TechnicianDashboard: React.FC = () => {
  const { user } = useAuth()
  const [repairs, setRepairs] = useState<RepairOrderLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'pending' | 'in_progress' | 'completed'>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [attMap, setAttMap] = useState<Record<string, Array<{ id: string; url: string; originalName: string }>>>({})
  const [attIdx, setAttIdx] = useState<Record<string, number>>({})

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

  // Load attachments for currently visible (assigned to me) repairs
  useEffect(() => {
    let mounted = true
    async function loadAttachments(ids: string[]) {
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const { data } = await api.get(`/repairs/${id}/attachments`)
              return { id, atts: data.attachments || [] }
            } catch {
              return { id, atts: [] as any[] }
            }
          })
        )
        if (!mounted) return
        setAttMap((prev) => {
          const next = { ...prev }
          for (const r of results) next[r.id] = r.atts
          return next
        })
      } catch {}
    }
    const techId = user?.id
    const ids = repairs.filter(r => r.technicianId === techId).map(r => r.id)
    if (ids.length) loadAttachments(ids)
    return () => { mounted = false }
  }, [repairs, user?.id])

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

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Technician Dashboard</h1>
        <div className="flex items-center gap-2">
          <button className={`px-3 py-1.5 rounded border ${tab==='pending'?'bg-white':'bg-slate-50'}`} onClick={()=>setTab('pending')}>Pending</button>
          <button className={`px-3 py-1.5 rounded border ${tab==='in_progress'?'bg-white':'bg-slate-50'}`} onClick={()=>setTab('in_progress')}>In Progress</button>
          <button className={`px-3 py-1.5 rounded border ${tab==='completed'?'bg-white':'bg-slate-50'}`} onClick={()=>setTab('completed')}>Completed</button>
        </div>
      </header>

      {loading ? (
        <div className="py-10 text-center text-slate-600">Loading jobs...</div>
      ) : error ? (
        <div className="py-3 text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto bg-white border rounded">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="py-2 px-3">Ticket</th>
                <th className="py-2 px-3">Device</th>
                <th className="py-2 px-3">Issue</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Estimate</th>
                <th className="py-2 px-3">Attachments</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t align-top">
                  <td className="py-2 px-3 font-medium">{r.ticketNumber || r.id.slice(0,8)}</td>
                  <td className="py-2 px-3">{[r.brand, r.model].filter(Boolean).join(' ') || r.deviceType || '-'}</td>
                  <td className="py-2 px-3 max-w-[300px] truncate" title={r.issueDescription || ''}>{r.issueDescription || '-'}</td>
                  <td className="py-2 px-3"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${statusBadge[r.status]||'bg-slate-100 text-slate-700'}`}>{r.status}</span></td>
                  <td className="py-2 px-3">{fmtInr(r.estimatedCost)}</td>
                  <td className="py-2 px-3">
                    {attMap[r.id]?.length ? (
                      <div className="relative w-28 h-20">
                        <a href={attMap[r.id][(attIdx[r.id] ?? 0) % attMap[r.id].length].url} target="_blank" rel="noreferrer">
                          <img
                            src={attMap[r.id][(attIdx[r.id] ?? 0) % attMap[r.id].length].url}
                            alt={attMap[r.id][(attIdx[r.id] ?? 0) % attMap[r.id].length].originalName}
                            className="w-28 h-20 object-cover rounded border bg-slate-50"
                          />
                        </a>
                        {attMap[r.id].length > 1 && (
                          <>
                            <button
                              className="absolute left-1 top-1/2 -translate-y-1/2 rounded bg-white/80 px-1 text-xs shadow"
                              onClick={() => setAttIdx(prev => ({ ...prev, [r.id]: ((prev[r.id] ?? 0) - 1 + attMap[r.id].length) % attMap[r.id].length }))}
                              aria-label="Prev"
                            >‹</button>
                            <button
                              className="absolute right-1 top-1/2 -translate-y-1/2 rounded bg-white/80 px-1 text-xs shadow"
                              onClick={() => setAttIdx(prev => ({ ...prev, [r.id]: ((prev[r.id] ?? 0) + 1) % attMap[r.id].length }))}
                              aria-label="Next"
                            >›</button>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-2 px-3 space-y-2">
                    {tab === 'pending' && (
                      <div className="flex gap-2">
                        <button disabled={busyId===r.id} className="btn" onClick={()=>acceptJob(r.id)}>{busyId===r.id?'...':'Accept'}</button>
                        <button disabled={busyId===r.id} className="btn-outline" onClick={()=>rejectJob(r.id)}>{busyId===r.id?'...':'Reject'}</button>
                      </div>
                    )}

                    {tab === 'in_progress' && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input className="input" placeholder="Amount" type="number" value={estimateForm[r.id]?.amount ?? ''} onChange={e=>setEstimateForm(prev=>({ ...prev, [r.id]: { ...(prev[r.id]||{amount:'',serviceCharge:'',timeRequired:''}), amount: e.target.value } }))} />
                          <input className="input" placeholder="Service Charge" type="number" value={estimateForm[r.id]?.serviceCharge ?? ''} onChange={e=>setEstimateForm(prev=>({ ...prev, [r.id]: { ...(prev[r.id]||{amount:'',serviceCharge:'',timeRequired:''}), serviceCharge: e.target.value } }))} />
                          <input className="input" placeholder="Time Required (e.g., 2 days)" value={estimateForm[r.id]?.timeRequired ?? ''} onChange={e=>setEstimateForm(prev=>({ ...prev, [r.id]: { ...(prev[r.id]||{amount:'',serviceCharge:'',timeRequired:''}), timeRequired: e.target.value } }))} />
                        </div>
                        <div className="flex gap-2">
                          <button disabled={busyId===r.id} className="btn" onClick={()=>saveEstimate(r.id)}>{busyId===r.id?'Saving...':'Save Estimate'}</button>
                          <button disabled={busyId===r.id} className="btn-outline" onClick={()=>markCompleted(r.id)}>{busyId===r.id?'...':'Mark Completed'}</button>
                        </div>
                      </div>
                    )}

                    {tab === 'completed' && (
                      <span className="text-slate-500">Updated: {new Date(r.updatedAt).toLocaleDateString()}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default TechnicianDashboard
