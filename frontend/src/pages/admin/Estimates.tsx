import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '@/api/client'

export type Estimate = {
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
  lineItems?: any[]
  validityUntil?: string | null
  attachments?: any
  repairOrderId?: string | null
  createdAt: string
}

const statusOptions = ['DRAFT','SENT','APPROVED','REJECTED'] as const

const EstimatesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [rows, setRows] = useState<Estimate[]>([])

  const q = searchParams.get('q') || ''
  const status = searchParams.get('status') || ''

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/estimates', { params: { q: q || undefined, status: status || undefined } })
      setRows(data.estimates || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load estimates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [q, status])

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    const next = new URLSearchParams(searchParams)
    const nq = String(formData.get('q') || '')
    next.set('q', nq)
    setSearchParams(next)
  }

  const onStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(searchParams)
    const v = e.target.value
    if (v) {
      next.set('status', v)
    } else {
      next.delete('status')
    }
    setSearchParams(next)
  }

  const items = useMemo(() => rows, [rows])

  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Estimates</h2>
        <Link to="/admin/repairs" className="rounded-md border border-white/10 px-3 py-1.5 hover:bg-white/5">Repairs</Link>
      </div>

      <form onSubmit={onSearch} className="flex flex-wrap items-center gap-2 mb-3">
        <input name="q" defaultValue={q} placeholder="Search by ID, device, brand, model..." className="min-w-[260px] rounded-md bg-[#0b0d12] border border-white/10 px-3 py-1.5 text-white placeholder:text-slate-400" />
        <select value={status} onChange={onStatusChange} className="rounded-md bg-[#0b0d12] border border-white/10 px-3 py-1.5 text-white">
          <option value="">All statuses</option>
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="rounded-md bg-[#A48AFB] text-white px-3 py-1.5 hover:bg-[#9a80ff]">Search</button>
        <button type="button" onClick={() => { setSearchParams(new URLSearchParams()); }} className="rounded-md border border-white/10 px-3 py-1.5 hover:bg-white/5">Reset</button>
      </form>

      {loading && <div className="text-slate-300">Loading...</div>}
      {error && <div className="text-rose-400 mb-2">{error}</div>}

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-slate-200">
            <tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Device</th>
              <th className="text-left px-3 py-2">Customer</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Total</th>
              <th className="text-right px-3 py-2">Created</th>
              <th className="text-right px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(e => (
              <tr key={e.id} className="border-t border-white/10 hover:bg-white/5">
                <td className="px-3 py-2 font-mono text-xs">{e.id}</td>
                <td className="px-3 py-2">{e.deviceType} • {e.brand} • {e.model}</td>
                <td className="px-3 py-2">{e.customerId.slice(0,8)}…</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs border ${e.status==='APPROVED'?'border-emerald-400 text-emerald-300': e.status==='REJECTED'?'border-rose-400 text-rose-300': e.status==='SENT'?'border-indigo-400 text-indigo-300':'border-slate-400 text-slate-300'}`}>{e.status}</span>
                </td>
                <td className="px-3 py-2 text-right">${Number(e.total||0).toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">
                  <Link to={`/admin/estimates/${e.id}`} className="rounded-md border border-white/10 px-2 py-1 hover:bg-white/5">Open</Link>
                </td>
              </tr>
            ))}
            {items.length===0 && !loading && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-400">No estimates found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default EstimatesPage
