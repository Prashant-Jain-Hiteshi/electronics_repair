import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type ApiError } from '@/api/client'

export type Repair = {
  id: string
  customerId: string
  technicianId?: string
  deviceType: string
  brand: string
  model: string
  status: string
  priority: string
}

type Technician = {
  id: string
  firstName: string
  lastName: string
  email: string
}

// Map admin status -> pill classes (matching customer palette)
const statusPill = (s: string) => {
  switch (s) {
    case 'completed': return 'bg-emerald-200 text-emerald-800'
    case 'delivered': return 'bg-teal-200 text-teal-800'
    case 'pending': return 'bg-amber-200 text-amber-800'
    case 'in_progress': return 'bg-blue-200 text-blue-800'
    case 'awaiting_parts': return 'bg-yellow-200 text-yellow-800'
    case 'cancelled': return 'bg-rose-200 text-rose-800'
    default: return 'bg-slate-200 text-slate-700'
  }
}

const Repairs: React.FC = () => {
  const [rows, setRows] = useState<Repair[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [assigning, setAssigning] = useState<string | null>(null) // repair id being assigned
  const [assignChoice, setAssignChoice] = useState<Record<string, string>>({}) // repairId -> technicianId

  const statuses = useMemo(() => (
    ['pending','in_progress','awaiting_parts','completed','delivered','cancelled']
  ), [])
  const [editStatus, setEditStatus] = useState<Record<string, string>>({}) // repairId -> status

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/repairs')
      setRows(res.data.repairs || [])
    } catch (e: any) {
      const err = (e?.response?.data as ApiError) || {}
      setError(err.message || 'Failed to load repairs')
    } finally {
      setLoading(false)
    }
  }

  async function loadTechs() {
    try {
      const res = await api.get('/auth/technicians')
      setTechnicians(res.data.technicians || [])
    } catch (_) { /* ignore */ }
  }

  useEffect(() => { load(); loadTechs() }, [])

  async function handleAssign(repairId: string) {
    const techId = assignChoice[repairId]
    if (!techId) { setError('Select a technician'); return }
    setError(null); setSuccess(null); setAssigning(repairId)
    try {
      await api.put(`/repairs/${repairId}/assign`, { technicianId: techId })
      setSuccess('Technician assigned')
      await load()
    } catch (e: any) {
      const err = (e?.response?.data as ApiError) || {}
      setError(err.message || 'Failed to assign technician')
    } finally {
      setAssigning(null)
    }
  }

  async function handleStatusSave(repairId: string) {
    const val = editStatus[repairId]
    if (!val) return
    setError(null); setSuccess(null)
    try {
      await api.put(`/repairs/${repairId}`, { status: val })
      setSuccess('Status updated')
      await load()
    } catch (e: any) {
      const err = (e?.response?.data as ApiError) || {}
      setError(err.message || 'Failed to update status')
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this repair order? Only pending repairs can be cancelled.')) return
    setError(null); setSuccess(null)
    try {
      await api.put(`/repairs/${id}/cancel`)
      setSuccess('Repair cancelled')
      await load()
    } catch (e: any) {
      const err = (e?.response?.data as ApiError) || {}
      setError(err.message || 'Failed to cancel')
    }
  }

  async function handleInvoice(id: string) {
    try {
      const res = await api.get(`/repairs/${id}/invoice`, { responseType: 'text' })
      const w = window.open('', '_blank')
      if (w) {
        w.document.write(res.data as string)
        w.document.close()
      } else {
        alert('Popup blocked. Please allow popups for this site.')
      }
    } catch (e: any) {
      const err = (e?.response?.data as ApiError) || {}
      alert(err.message || 'Failed to load invoice')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this repair order?')) return
    try {
      await api.delete(`/repairs/${id}`)
      await load()
    } catch (e: any) {
      const err = (e?.response?.data as ApiError) || {}
      alert(err.message || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-800">Repairs</h1>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {success && <div className="text-green-700 text-sm">{success}</div>}
      {/* Search repairs */}
      <div className="flex items-center justify-between gap-3">
        <input
          className="border rounded-md p-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="Search repairs..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border shadow-card">
          <table className="min-w-full text-sm rounded-lg overflow-hidden">
            <thead className="text-slate-600">
              <tr>
                <th className="text-left py-2 px-3">ID</th>
                <th className="text-left py-2 px-3">Device</th>
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-left py-2 px-3">Priority</th>
                <th className="text-left py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) => {
                  const s = q.trim().toLowerCase()
                  if (!s) return true
                  const hay = [
                    r.id,
                    r.deviceType,
                    r.brand,
                    r.model,
                    r.status,
                    r.priority,
                  ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                  return hay.includes(s)
                })
                .map((r, idx) => (
                <tr key={r.id} className={idx % 2 === 0 ? 'border-t' : 'border-t  hover:bg-slate-100'}>
                  <td className="py-2 px-3 font-mono text-xs">{r.id}</td>
                  <td className="py-2 px-3">{r.deviceType} • {r.brand} {r.model}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusPill(r.status)}`}>{r.status}</span>
                        <select
                          className="border rounded-md p-1 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          value={editStatus[r.id] ?? r.status}
                          onChange={(e) => setEditStatus({ ...editStatus, [r.id]: e.target.value })}
                        >
                          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <button className="btn btn-sm shrink-0" onClick={() => handleStatusSave(r.id)}>Save</button>
                    </div>
                  </td>
                  <td className="py-2 px-3">{r.priority}</td>
                  <td className="py-2 px-3 flex gap-2 whitespace-nowrap">
                    {/* Details */}
                    <Link className="btn btn-sm" to={`/admin/repairs/${r.id}`}>Details</Link>
                    {/* Assign technician */}
                    <div className="flex items-center gap-2">
                      <select
                        className="border rounded-md p-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={assignChoice[r.id] ?? ''}
                        onChange={(e) => setAssignChoice({ ...assignChoice, [r.id]: e.target.value })}
                      >
                        <option value="">Assign technician...</option>
                        {technicians.map(t => (
                          <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.email})</option>
                        ))}
                      </select>
                      <button
                        className="btn btn-sm"
                        disabled={assigning === r.id}
                        onClick={() => handleAssign(r.id)}
                      >{assigning === r.id ? 'Assigning...' : 'Assign'}</button>
                    </div>

                    {/* Cancel */}
                    {r.status === 'pending' && (
                      <button className="btn btn-sm" onClick={() => handleCancel(r.id)}>Cancel</button>
                    )}

                    {/* Invoice */}
                    <button className="btn btn-sm" onClick={() => handleInvoice(r.id)}>Invoice</button>

                    {/* Delete */}
                    <button className="btn btn-sm" onClick={() => handleDelete(r.id)}>Delete</button>
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

export default Repairs
