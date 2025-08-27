import React, { useEffect, useState } from 'react'
import { api, type ApiError } from '@/api/client'

type Payment = {
  id: string
  repairOrderId: string
  amount: number
  method: string
  status: string
  createdAt: string
}

// Map payment status to pill classes (dark theme friendly)
const statusPill = (s: string) => {
  switch (s) {
    case 'paid': return 'bg-emerald-500/20 text-emerald-300'
    case 'pending': return 'bg-amber-500/20 text-amber-300'
    case 'failed': return 'bg-rose-500/20 text-rose-300'
    case 'refunded': return 'bg-slate-500/20 text-slate-300'
    default: return 'bg-slate-500/20 text-slate-300'
  }
}

const Payments: React.FC = () => {
  const [repairId, setRepairId] = useState('')
  const [rows, setRows] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mode, setMode] = useState<'all' | 'byRepair'>('byRepair')

  // Create form
  const [form, setForm] = useState({
    repairOrderId: '',
    amount: '' as any,
    method: 'cash',
    transactionId: '',
    notes: '',
  })
  const [creating, setCreating] = useState(false)

  async function load() {
    if (mode === 'byRepair' && !repairId.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = mode === 'all'
        ? await api.get('/payments')
        : await api.get(`/payments/repair/${repairId.trim()}`)
      setRows(res.data.payments || res.data.items || [])
    } catch (e: any) {
      const err = (e?.response?.data as ApiError) || {}
      setError(err.message || 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (mode === 'all') void load() }, [mode])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-white">Payments</h1>
      </div>

      <div className="rounded-2xl p-4 space-y-3 shadow-card border border-white/10 bg-[#12151d] text-white">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-300 mb-1">View Mode</label>
            <select className="input" value={mode} onChange={e=>setMode(e.target.value as any)}>
              <option value="byRepair">By Repair ID</option>
              <option value="all">All Payments</option>
            </select>
          </div>
          {mode === 'byRepair' && (
            <div className="flex-1 min-w-[260px]">
              <label className="block text-xs text-slate-300 mb-1">Repair Order ID</label>
              <input className="input w-full" value={repairId} onChange={(e)=>setRepairId(e.target.value)} placeholder="e.g., repair UUID" />
            </div>
          )}
          <button className="btn" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Fetch'}</button>
        </div>
      </div>

      {error && <div className="text-rose-400 text-sm">{error}</div>}
      {success && <div className="text-emerald-400 text-sm">{success}</div>}

      {/* Create payment */}
      <div className="rounded-2xl p-4 space-y-3 shadow-card border border-white/10 bg-[#12151d] text-white">
        <h2 className="font-medium text-white">Create Payment</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="input" placeholder="Repair Order ID" value={form.repairOrderId} onChange={e=>setForm({...form, repairOrderId: e.target.value})} />
          <input className="input" placeholder="Amount" type="number" step="0.01" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} />
          <select className="input" value={form.method} onChange={e=>setForm({...form, method: e.target.value})}>
            <option value="cash">cash</option>
            <option value="card">card</option>
            <option value="upi">upi</option>
            <option value="bank_transfer">bank_transfer</option>
            <option value="other">other</option>
          </select>
          <input className="input" placeholder="Transaction ID (optional)" value={form.transactionId} onChange={e=>setForm({...form, transactionId: e.target.value})} />
          <input className="input md:col-span-2" placeholder="Notes (optional)" value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} />
        </div>
        <button className="btn" disabled={creating} onClick={async ()=>{
          setError(null); setSuccess(null); setCreating(true)
          try {
            const payload = {
              repairOrderId: form.repairOrderId.trim(),
              amount: Number(form.amount),
              method: form.method,
              transactionId: form.transactionId || undefined,
              notes: form.notes || undefined,
            }
            await api.post('/payments', payload)
            setSuccess('Payment created')
            setForm({ repairOrderId: '', amount: '', method: 'cash', transactionId: '', notes: '' })
            await load()
          } catch (e:any) {
            const err = (e?.response?.data as ApiError) || {}
            setError(err.message || 'Failed to create payment')
          } finally { setCreating(false) }
        }}>{creating ? 'Creating...' : 'Create Payment'}</button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0f1218] shadow-card">
        <table className="min-w-full text-sm rounded-lg overflow-hidden text-white">
          <thead className="text-slate-200">
            <tr>
              <th className="text-left py-2 px-3">ID</th>
              <th className="text-left py-2 px-3">Repair</th>
              <th className="text-left py-2 px-3">Amount</th>
              <th className="text-left py-2 px-3">Method</th>
              <th className="text-left py-2 px-3">Status</th>
              <th className="text-left py-2 px-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, idx) => (
              <tr key={p.id} className={idx % 2 === 0 ? 'border-t border-white/5 bg-[#12151d]' : 'border-t border-white/5 bg-[#0b0d12] hover:bg-[#10131a]'}>
                <td className="py-2 px-3 font-mono text-xs">{p.id}</td>
                <td className="py-2 px-3 font-mono text-xs">{p.repairOrderId}</td>
                <td className="py-2 px-3">₹{p.amount?.toFixed?.(2) ?? p.amount}</td>
                <td className="py-2 px-3">{p.method}</td>
                <td className="py-2 px-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusPill(p.status)}`}>{p.status}</span>
                </td>
                <td className="py-2 px-3">{new Date(p.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td className="p-4 text-center text-slate-300" colSpan={6}>No payments</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Payments
