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

const TechnicianDashboard: React.FC = () => {
  const { user } = useAuth()
  const [repairs, setRepairs] = useState<RepairOrderLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sp, setSp] = useSearchParams()
  const initialTab = (sp.get('tab') as 'pending'|'in_progress'|'completed') || 'pending'
  const [tab, setTab] = useState<'pending' | 'in_progress' | 'completed'>(initialTab)
  const [busyId, setBusyId] = useState<string | null>(null)

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

  return (
    <div className="space-y-5 text-white">
      {/* Greeting and actions */}
      <header className="rounded-xl border border-white/10 bg-[#0f1218]/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Hi, {user?.firstName} {user?.lastName}</h1>
            <p className="text-sm text-slate-300">Track your assigned repairs and manage jobs.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            {(['pending','in_progress','completed'] as const)
              .filter(t => t !== tab)
              .map(t => (
                <button key={t}
                  onClick={()=>setTabUrl(t)}
                  className={`btn btn-outline`}
                >{t === 'in_progress' ? 'In Progress' : t.charAt(0).toUpperCase()+t.slice(1)}</button>
              ))}
          </div>
        </div>
      </header>

      {/* Overview cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Completed', value: counts.completed },
          { label: 'Delivered', value: counts.delivered },
          { label: 'Pending', value: counts.pending },
          { label: 'In Progress', value: counts.in_progress },
          { label: 'Total', value: counts.total },
        ].map(c => (
          <div key={c.label} className="rounded-lg border border-white/10 bg-[#12151d] p-3">
            <div className="text-sm text-slate-300">{c.label}</div>
            <div className="mt-1 text-2xl font-semibold">{c.value}</div>
          </div>
        ))}
      </section>

      {loading ? (
        <div className="py-10 text-center text-slate-300">Loading jobs...</div>
      ) : error ? (
        <div className="py-3 text-rose-400">{error}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#12151d]">
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
              {filtered.map(r => (
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
        </div>
      )}
    </div>
  )
}

export default TechnicianDashboard
