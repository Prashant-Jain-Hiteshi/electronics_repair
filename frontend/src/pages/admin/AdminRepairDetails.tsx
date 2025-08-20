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
          <a href={`/api/repairs/${repair.id}/invoice`} target="_blank" rel="noreferrer" className="rounded-md border border-white/10 px-3 py-2 text-sm bg-white/5 hover:bg-white/10">Invoice</a>
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
