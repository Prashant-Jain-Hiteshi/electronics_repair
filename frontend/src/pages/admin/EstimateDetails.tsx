import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '@/api/client'

type Estimate = {
  id: string
  customerId: string
  deviceType: string
  brand: string
  model: string
  issueDescription?: string | null
  notes?: string | null
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED'
  subtotal: string
  tax: string
  discount: string
  total: string
  lineItems?: Array<{ type: 'part'|'labor'; description: string; qty?: number; unitPrice?: number; hours?: number; rate?: number }>
  validityUntil?: string | null
  attachments?: any
  repairOrderId?: string | null
  createdAt: string
}

type Customer = { id: string, userId: string }

type ApiGet = { estimate: Estimate, customer?: Customer | null }

const StatusPill: React.FC<{ status: Estimate['status'] }> = ({ status }) => (
  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs border ${status==='APPROVED'?'border-emerald-400 text-emerald-300': status==='REJECTED'?'border-rose-400 text-rose-300': status==='SENT'?'border-indigo-400 text-indigo-300':'border-slate-400 text-slate-300'}`}>{status}</span>
)

const EstimateDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [est, setEst] = useState<Estimate | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [busy, setBusy] = useState<'approve'|'reject'|null>(null)

  const fetchData = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get<ApiGet>(`/estimates/${id}`)
      setEst(data.estimate)
      setCustomer((data as any).customer || null)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load estimate')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [id])

  const onApprove = async () => {
    if (!id) return
    if (!confirm('Approve this estimate and convert to a repair order?')) return
    setBusy('approve')
    setError('')
    try {
      const { data } = await api.patch(`/estimates/${id}/approve`)
      await fetchData()
      if (data?.repairOrderId) {
        if (confirm('Estimate approved and converted. Open the new repair order?')) {
          navigate(`/admin/repairs/${data.repairOrderId}`)
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to approve estimate')
    } finally {
      setBusy(null)
    }
  }

  const onReject = async () => {
    if (!id) return
    if (!confirm('Reject this estimate?')) return
    setBusy('reject')
    setError('')
    try {
      await api.patch(`/estimates/${id}/reject`)
      await fetchData()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reject estimate')
    } finally {
      setBusy(null)
    }
  }

  const lineItems = useMemo(() => est?.lineItems || [], [est?.lineItems])

  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xl font-semibold">Estimate</h2>
          <div className="text-slate-300 text-sm">ID: <span className="font-mono">{id}</span></div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/estimates" className="rounded-md border border-white/10 px-3 py-1.5 hover:bg-white/5">Back</Link>
          {est && (
            <>
              <StatusPill status={est.status} />
              <button onClick={onApprove} disabled={busy!==null || est.status==='APPROVED'} className="rounded-md bg-emerald-500/90 text-white px-3 py-1.5 hover:bg-emerald-500 disabled:opacity-50">Approve</button>
              <button onClick={onReject} disabled={busy!==null || est.status==='REJECTED'} className="rounded-md bg-rose-500/90 text-white px-3 py-1.5 hover:bg-rose-500 disabled:opacity-50">Reject</button>
            </>
          )}
        </div>
      </div>

      {loading && <div className="text-slate-300">Loading...</div>}
      {error && <div className="text-rose-400 mb-2">{error}</div>}

      {est && (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 p-3">
            <div className="font-medium">Device</div>
            <div className="text-slate-300 text-sm">{est.deviceType} • {est.brand} • {est.model}</div>
            {est.issueDescription && <div className="text-slate-400 text-sm mt-1">Issue: {est.issueDescription}</div>}
          </div>

          <div className="rounded-lg border border-white/10 overflow-hidden">
            <div className="px-3 py-2 bg-white/5 text-slate-200 text-sm">Line Items</div>
            <table className="min-w-full text-sm">
              <thead className="text-slate-300">
                <tr>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Description</th>
                  <th className="text-right px-3 py-2">Qty/Hours</th>
                  <th className="text-right px-3 py-2">Unit/Rate</th>
                  <th className="text-right px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-slate-400 px-3 py-6">No items</td></tr>
                )}
                {lineItems.map((li, idx) => {
                  const qty = li.type==='part' ? Number(li.qty || 0) : Number(li.hours || 0)
                  const price = li.type==='part' ? Number(li.unitPrice || 0) : Number(li.rate || 0)
                  const amt = qty * price
                  return (
                    <tr key={idx} className="border-t border-white/10">
                      <td className="px-3 py-2">{li.type}</td>
                      <td className="px-3 py-2">{li.description}</td>
                      <td className="px-3 py-2 text-right">{qty}</td>
                      <td className="px-3 py-2 text-right">${price.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">${amt.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-white/10 p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="font-medium">Totals</div>
              <div className="text-sm text-slate-300 space-y-1 mt-1">
                <div className="flex items-center justify-between"><span>Subtotal</span><span>${Number(est.subtotal||0).toFixed(2)}</span></div>
                <div className="flex items-center justify-between"><span>Tax</span><span>${Number(est.tax||0).toFixed(2)}</span></div>
                <div className="flex items-center justify-between"><span>Discount</span><span>-${Number(est.discount||0).toFixed(2)}</span></div>
                <div className="flex items-center justify-between font-semibold"><span>Total</span><span>${Number(est.total||0).toFixed(2)}</span></div>
              </div>
            </div>
            <div>
              <div className="font-medium">Meta</div>
              <div className="text-sm text-slate-300 space-y-1 mt-1">
                <div>Customer: <span className="font-mono">{customer?.id?.slice(0,8)}…</span></div>
                <div>Created: {new Date(est.createdAt).toLocaleString()}</div>
                {!!est.validityUntil && <div>Valid until: {new Date(est.validityUntil).toLocaleDateString()}</div>}
                {!!est.repairOrderId && (
                  <div>Linked Repair: <Link to={`/admin/repairs/${est.repairOrderId}`} className="underline">{est.repairOrderId}</Link></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EstimateDetails
