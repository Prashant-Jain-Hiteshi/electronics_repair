import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/api/client'

type Repair = {
  id: string
  deviceType?: string
  brand?: string
  model?: string
  issueDescription?: string
  status: string
  priority?: string
  estimatedCost?: number | string | null
  actualCost?: number | string | null
  estimatedCompletionDate?: string | null
  actualCompletionDate?: string | null
}

type Customer = {
  id: string
  userId: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
}

type User = {
  id: string
  mobile: string
  firstName: string
  lastName: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  awaiting_parts: 'bg-purple-100 text-purple-800',
  completed: 'bg-emerald-100 text-emerald-800',
  delivered: 'bg-slate-100 text-slate-800',
  cancelled: 'bg-rose-100 text-rose-800',
}

function formatCurrency(v: any) {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n) || n === 0) return '-'
  return n.toLocaleString(undefined, { style: 'currency', currency: 'INR' })
}

const AdminRepairDetails: React.FC = () => {
  const { id } = useParams()
  const [repair, setRepair] = useState<Repair | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Payments
  type Payment = {
    id: string
    repairOrderId: string
    amount: number
    method: 'cash'|'card'|'upi'|'bank_transfer'
    status: 'PENDING'|'COMPLETED'|'FAILED'|'REFUNDED'
    provider?: 'manual'|'stripe'|'upi'|null
    kind?: 'deposit'|'partial'|'final'|'refund'|null
    currencyCode?: string | null
    transactionId?: string | null
    intentId?: string | null
    linkUrl?: string | null
    paidAt?: string | null
    notes?: string | null
    createdAt?: string
  }
  const [payments, setPayments] = useState<Payment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [payErr, setPayErr] = useState<string | null>(null)

  // Create intent form
  const [intentAmount, setIntentAmount] = useState<string>('')
  const [intentMethod, setIntentMethod] = useState<'cash'|'card'|'upi'|'bank_transfer'>('upi')
  const [intentProvider, setIntentProvider] = useState<'manual'|'stripe'|'upi'>('upi')
  const [intentKind, setIntentKind] = useState<'deposit'|'partial'|'final'>('partial')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await api.get(`/repairs/${id}`)
        if (!mounted) return
        const d = res.data || {}
        setRepair(d.repair || null)
        setCustomer(d.customer || null)
        setUser(d.user || null)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.response?.data?.message || 'Failed to load repair details')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  // Load payments for this repair
  useEffect(() => {
    if (!id) return
    let mounted = true
    ;(async () => {
      try {
        setLoadingPayments(true)
        setPayErr(null)
        const res = await api.get(`/payments/repair/${id}`)
        if (!mounted) return
        setPayments(res.data?.payments || [])
      } catch (e: any) {
        if (!mounted) return
        setPayErr(e?.response?.data?.message || 'Failed to load payments')
      } finally {
        if (mounted) setLoadingPayments(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  async function refreshPayments() {
    if (!id) return
    try {
      const res = await api.get(`/payments/repair/${id}`)
      setPayments(res.data?.payments || [])
    } catch (_) {}
  }

  async function createIntent() {
    if (!id) return
    const amt = Number(intentAmount)
    if (!Number.isFinite(amt) || amt <= 0) { setPayErr('Enter a valid amount'); return }
    setPayErr(null)
    try {
      const res = await api.post('/payments/intents', {
        repairOrderId: id,
        amount: amt,
        method: intentMethod,
        provider: intentProvider,
        kind: intentKind,
      })
      await refreshPayments()
      const link = res.data?.intent?.linkUrl as string | undefined
      if (link) window.open(link, '_blank')
    } catch (e: any) {
      setPayErr(e?.response?.data?.message || 'Failed to create payment link')
    }
  }

  async function confirmIntent(intentId: string) {
    try {
      await api.post(`/payments/intents/${intentId}/confirm`, { transactionId: `txn_${Date.now()}` })
      await refreshPayments()
    } catch (e: any) {
      setPayErr(e?.response?.data?.message || 'Failed to confirm payment')
    }
  }

  async function cancelIntent(intentId: string) {
    try {
      await api.post(`/payments/intents/${intentId}/cancel`)
      await refreshPayments()
    } catch (e: any) {
      setPayErr(e?.response?.data?.message || 'Failed to cancel intent')
    }
  }

  async function refundPayment(paymentId: string) {
    const s = window.prompt('Refund amount (leave blank for full):')
    const amt = s ? Number(s) : undefined
    if (s && (!Number.isFinite(amt!) || (amt as number) <= 0)) { setPayErr('Invalid refund amount'); return }
    try {
      await api.post(`/payments/${paymentId}/refund`, amt ? { amount: amt } : {})
      await refreshPayments()
    } catch (e: any) {
      setPayErr(e?.response?.data?.message || 'Refund failed')
    }
  }

  const deviceText = useMemo(() => {
    if (!repair) return '-'
    return [repair.brand, repair.model].filter(Boolean).join(' ') || repair.deviceType || '-'
  }, [repair])

  if (loading) return <div className="text-white">Loading...</div>
  if (error) return <div className="text-rose-400">{error}</div>
  if (!repair) return <div className="text-white">Not found</div>

  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Repair Details (Admin)</h1>
        <div className="flex gap-2">
          <Link to="/admin/repairs" className="rounded-md border border-white/10 px-3 py-2 text-sm bg-white/5 hover:bg-white/10">Back</Link>
          <a href={`/api/payments/invoice/repair/${repair.id}`} target="_blank" rel="noreferrer" className="rounded-md border border-white/10 px-3 py-2 text-sm bg-white/5 hover:bg-white/10">Invoice</a>
        </div>
      </div>

      {/* Payments Timeline */}
      <div className="rounded-lg bg-[#12151d] border border-white/10 p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-white">Payments</p>
          <div className="text-xs text-slate-300">{loadingPayments ? 'Loading…' : `${payments.length} records`}</div>
        </div>
        {payErr && <div className="text-xs text-rose-300 mb-2">{payErr}</div>}

        {/* Create Payment Link / Intent */}
        <div className="rounded-md border border-white/10 bg-white/5 p-3 mb-3 grid sm:grid-cols-5 gap-2 items-end">
          <div>
            <label className="block text-xs text-slate-300 mb-1">Amount</label>
            <input className="w-full rounded-md bg-[#0f1218] border border-white/10 px-2 py-1.5 text-sm text-white" value={intentAmount} onChange={e=>setIntentAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1">Method</label>
            <select className="w-full rounded-md bg-[#0f1218] border border-white/10 px-2 py-1.5 text-sm text-white" value={intentMethod} onChange={e=>setIntentMethod(e.target.value as any)}>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1">Provider</label>
            <select className="w-full rounded-md bg-[#0f1218] border border-white/10 px-2 py-1.5 text-sm text-white" value={intentProvider} onChange={e=>setIntentProvider(e.target.value as any)}>
              <option value="upi">UPI</option>
              <option value="stripe">Stripe</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1">Kind</label>
            <select className="w-full rounded-md bg-[#0f1218] border border-white/10 px-2 py-1.5 text-sm text-white" value={intentKind} onChange={e=>setIntentKind(e.target.value as any)}>
              <option value="deposit">Deposit</option>
              <option value="partial">Partial</option>
              <option value="final">Final</option>
            </select>
          </div>
          <div>
            <button onClick={createIntent} className="w-full rounded-md border border-sky-400/30 bg-sky-400/10 text-sky-300 hover:bg-sky-400/20 px-3 py-2 text-sm">Create Payment Link</button>
          </div>
        </div>

        <div className="space-y-2">
          {payments.length === 0 && !loadingPayments && (
            <div className="text-sm text-slate-300">No payments yet.</div>
          )}
          {payments.map(p => (
            <div key={p.id} className="flex items-start justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-3">
              <div className="space-y-0.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{p.kind || 'payment'}</span>
                  <span className="text-xs rounded-full px-2 py-0.5 border border-white/10 bg-white/5 text-slate-200">{p.status}</span>
                  {p.intentId && <span className="text-[10px] text-slate-400">intent: {p.intentId}</span>}
                  {p.transactionId && <span className="text-[10px] text-slate-400">txn: {p.transactionId}</span>}
                </div>
                <div className="text-slate-300 text-xs">
                  {p.method?.toUpperCase()} • {p.provider || 'manual'} • {new Date(p.createdAt || p.paidAt || Date.now()).toLocaleString()} • Amount: {(Number(p.amount)||0).toLocaleString(undefined,{style:'currency',currency:'INR'})}
                </div>
                {p.linkUrl && (
                  <div className="text-xs"><a className="text-sky-300 hover:underline" href={p.linkUrl} target="_blank" rel="noreferrer">Open payment link</a></div>
                )}
                {p.notes && <div className="text-xs text-slate-400">{p.notes}</div>}
              </div>
              <div className="flex gap-2">
                {p.status === 'PENDING' && p.intentId && (
                  <>
                    <button onClick={() => confirmIntent(p.intentId!)} className="rounded-md border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 px-2 py-1 text-xs">Mark Paid</button>
                    <button onClick={() => cancelIntent(p.intentId!)} className="rounded-md border border-rose-400/30 bg-rose-400/10 text-rose-300 hover:bg-rose-400/20 px-2 py-1 text-xs">Cancel</button>
                  </>
                )}
                {p.status === 'COMPLETED' && (
                  <button onClick={() => refundPayment(p.id)} className="rounded-md border border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 px-2 py-1 text-xs">Refund</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-[#12151d] border border-white/10 p-4 shadow-card sm:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-300">Ticket</p>
              <p className="font-semibold text-white">{repair.id.slice(0,8)}</p>
            </div>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[repair.status] || 'bg-slate-100 text-slate-700'}`}>{repair.status}</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-300 text-xs">Device</p>
              <p className="font-medium text-white">{deviceText}</p>
            </div>
            <div>
              <p className="text-slate-300 text-xs">Priority</p>
              <p className="font-medium text-white">{repair.priority || '-'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-slate-300 text-xs">Issue</p>
              <p className="font-medium text-white">{repair.issueDescription || '-'}</p>
            </div>
            <div>
              <p className="text-slate-300 text-xs">Estimate</p>
              <p className="font-medium text-white">{formatCurrency(repair.estimatedCost ?? repair.actualCost)}</p>
            </div>
            <div>
              <p className="text-slate-300 text-xs">ETA</p>
              <p className="font-medium text-white">{repair.estimatedCompletionDate ? new Date(repair.estimatedCompletionDate).toLocaleDateString() : '-'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-[#12151d] border border-white/10 p-4 shadow-card">
          <p className="text-sm font-semibold mb-2 text-white">Customer</p>
          {!user ? (
            <div className="text-sm text-slate-300">No customer info</div>
          ) : (
            <div className="space-y-1 text-sm">
              <div className="font-medium text-white">{user.firstName} {user.lastName}</div>
              <div className="text-slate-300">{user.mobile}</div>
              {customer && (
                <div className="text-slate-300 text-xs">
                  {[customer.address, customer.city, customer.state, customer.zipCode].filter(Boolean).join(', ') || '-'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminRepairDetails
