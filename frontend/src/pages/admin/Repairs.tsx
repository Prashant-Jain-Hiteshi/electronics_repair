import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
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

// --- Small inline icons ---
const IconSave = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M17 3H7a2 2 0 0 0-2 2v14l7-3 7 3V5a2 2 0 0 0-2-2Z" />
  </svg>
)

const IconInfo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10v6" />
    <circle cx="12" cy="7.5" r="1" />
  </svg>
)

const IconDots = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
)

const IconUserPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M17 8h5M19.5 5.5v5" />
  </svg>
)

const IconFile = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
)

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
)

const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)

// Themed dark status pills (consistent with technician/details pages)
// Uses subtle bg + border with accent text colors
const statusPill = (s: string) => {
  switch (s) {
    case 'pending': return 'text-amber-300 bg-amber-400/10 border border-amber-400/20'
    case 'in_progress': return 'text-[#A48AFB] bg-[#A48AFB]/10 border border-[#A48AFB]/20'
    case 'awaiting_parts': return 'text-[#A48AFB] bg-[#A48AFB]/10 border border-[#A48AFB]/20'
    case 'completed': return 'text-emerald-300 bg-emerald-400/10 border border-emerald-400/20'
    case 'delivered': return 'text-slate-300 bg-white/5 border border-white/10'
    case 'cancelled': return 'text-rose-300 bg-rose-400/10 border border-rose-400/20'
    default: return 'text-slate-300 bg-white/5 border border-white/10'
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
  const [openMenu, setOpenMenu] = useState<string | null>(null) // kebab dropdown by repair id

  // Modal state (replaces browser alert/confirm)
  type ModalState =
    | { kind: 'none' }
    | { kind: 'confirm'; title: string; message: string; confirmText?: string; onConfirm: () => void }
    | { kind: 'alert'; title: string; message: string; okText?: string }
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const openConfirm = (opts: { title: string; message: string; confirmText?: string; onConfirm: () => void }) => setModal({ kind: 'confirm', ...opts })
  const openAlert = (opts: { title: string; message: string; okText?: string }) => setModal({ kind: 'alert', ...opts })
  const closeModal = () => setModal({ kind: 'none' })

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
    setError(null); setSuccess(null)
    try {
      await api.put(`/repairs/${id}/cancel`)
      setSuccess('Repair cancelled')
      await load()
    } catch (e: any) {
      const err = (e?.response?.data as ApiError) || {}
      const msg = err.message || 'Failed to cancel'
      setError(msg)
      openAlert({ title: 'Cancel failed', message: msg })
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
        openAlert({ title: 'Popup blocked', message: 'Please allow popups for this site to view the invoice.' })
      }
    } catch (e: any) {
      const err = (e?.response?.data as ApiError) || {}
      openAlert({ title: 'Invoice error', message: err.message || 'Failed to load invoice' })
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/repairs/${id}`)
      await load()
    } catch (e: any) {
      const err = (e?.response?.data as ApiError) || {}
      openAlert({ title: 'Delete error', message: err.message || 'Failed to delete' })
    }
  }

  return (
    <div className="space-y-4 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-white">Repairs</h1>
      </div>
      {error && <div className="text-red-400 text-sm">{error}</div>}
      {success && <div className="text-emerald-400 text-sm">{success}</div>}
      {/* Search repairs */}
      <div className="flex items-center justify-between gap-3">
        <input
          className="border border-[#A48AFB] bg-[#0f1218] text-white placeholder-slate-400 rounded-md p-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-[#A48AFB] focus:border-[#A48AFB] hover:border-[#A48AFB]/50 transition-colors"
          placeholder="Search repairs..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {loading ? (
        <div className="text-white">Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#12151d] shadow-card">
          <table className="min-w-full text-sm rounded-lg overflow-hidden text-white">
            <thead className="text-slate-300">
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
                <tr key={r.id} className={idx % 2 === 0 ? 'border-t border-white/10' : 'border-t border-white/10 hover:bg-white/5'}>
                  <td className="py-2 px-3 font-mono text-xs">{r.id}</td>
                  <td className="py-2 px-3">{r.deviceType} • {r.brand} {r.model}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusPill(r.status)}`}>{r.status}</span>
                        <select
                          className="border border-white/10 bg-[#0f1218] text-white rounded-md p-1 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-[#A48AFB] focus:border-[#A48AFB]"
                          value={editStatus[r.id] ?? r.status}
                          onChange={(e) => setEditStatus({ ...editStatus, [r.id]: e.target.value })}
                        >
                          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <button
                        className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10 p-2 text-slate-200 shrink-0"
                        onClick={() => handleStatusSave(r.id)}
                        title="Save status"
                        aria-label="Save status"
                      >
                        <IconSave />
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-3">{r.priority}</td>
                  <td className="py-2 px-3 flex items-center gap-2 whitespace-nowrap relative">
                    {/* Details - icon */}
                    <Link
                      className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10 p-2 text-slate-200"
                      to={`/admin/repairs/${r.id}`}
                      title="Details"
                      aria-label="Details"
                    >
                      <IconInfo />
                    </Link>

                    {/* Assign technician (kept inline in row) */}
                    <div className="flex items-center gap-2">
                      <select
                        className="border border-white/10 bg-[#0f1218] text-white rounded-md p-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#A48AFB] focus:border-[#A48AFB]"
                        value={assignChoice[r.id] ?? ''}
                        onChange={(e) => setAssignChoice({ ...assignChoice, [r.id]: e.target.value })}
                      >
                        <option value="">Assign technician...</option>
                        {technicians.map(t => (
                          <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.email})</option>
                        ))}
                      </select>
                      <button
                        className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10 p-2 text-slate-200"
                        onClick={() => handleAssign(r.id)}
                        disabled={assigning === r.id}
                        title={assigning === r.id ? 'Assigning…' : 'Assign technician'}
                        aria-label="Assign technician"
                      >
                        <IconUserPlus />
                      </button>
                    </div>

                    {/* Kebab dropdown for other actions */}
                    <div className="relative">
                      <button
                        className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10 p-2 text-slate-200"
                        title="More actions"
                        aria-haspopup="menu"
                        aria-expanded={openMenu === r.id}
                        onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)}
                      >
                        <IconDots />
                      </button>
                      {openMenu === r.id && (
                        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-white/10 bg-[#0f1218] shadow-xl z-20 p-2">
                          {r.status === 'pending' && (
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/5 text-left text-slate-200"
                              onClick={() => openConfirm({
                                title: 'Cancel repair?',
                                message: 'Only pending repairs can be cancelled. This action cannot be undone.',
                                confirmText: 'Cancel repair',
                                onConfirm: () => { closeModal(); handleCancel(r.id) },
                              })}
                              title="Cancel"
                              aria-label="Cancel"
                            >
                              <span className="text-rose-300"><IconX /></span>
                              <span>Cancel</span>
                            </button>
                          )}

                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/5 text-left text-slate-200"
                            onClick={() => { setOpenMenu(null); handleInvoice(r.id) }}
                            title="Invoice"
                            aria-label="Invoice"
                          >
                            <span className="text-slate-300"><IconFile /></span>
                            <span>Invoice</span>
                          </button>

                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/5 text-left text-slate-200"
                            onClick={() => { setOpenMenu(null); openConfirm({ title: 'Delete repair?', message: 'This will permanently delete the repair order.', confirmText: 'Delete', onConfirm: () => { closeModal(); handleDelete(r.id) } }) }}
                            title="Delete"
                            aria-label="Delete"
                          >
                            <span className="text-rose-300"><IconTrash /></span>
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Modals */}
      {modal.kind !== 'none' && createPortal(
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="fixed z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm max-h-[80vh] overflow-auto rounded-xl border border-white/10 bg-[#12151d] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-2">{modal.title}</h3>
            <p className="text-slate-300 text-sm mb-4">{modal.message}</p>
            {modal.kind === 'confirm' ? (
              <div className="flex justify-end gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-sm text-white"
                  onClick={closeModal}
                >
                  Close
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-md border border-[#A48AFB] bg-[#A48AFB]/20 hover:bg-[#A48AFB]/30 px-3 py-1.5 text-sm text-white"
                  onClick={(modal as any).onConfirm}
                >
                  {(modal as any).confirmText || 'Confirm'}
                </button>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-sm text-white"
                  onClick={closeModal}
                >
                  {(modal as any).okText || 'OK'}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default Repairs
