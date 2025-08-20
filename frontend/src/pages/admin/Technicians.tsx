import React, { useEffect, useState } from 'react'
import { api, type ApiError } from '@/api/client'

type Technician = {
  id: string
  mobile: string
  firstName: string
  lastName: string
  address?: string
  isActive: boolean
}

const Technicians: React.FC = () => {
  const [rows, setRows] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [q, setQ] = useState('')

  // Promote existing user by mobile
  const [promoteMobile, setPromoteMobile] = useState('')
  const [promoting, setPromoting] = useState(false)
  const [demotingId, setDemotingId] = useState<string | null>(null)
  const [confirmRevert, setConfirmRevert] = useState<{ id: string; name: string } | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/auth/technicians')
      setRows((res.data.technicians || []) as Technician[])
    } catch (e: any) {
      const err = (e?.response?.data as ApiError) || {}
      setError(err.message || 'Failed to load technicians')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-white">Technicians</h1>
      </div>
      {error && <div className="text-red-400 text-sm">{error}</div>}
      {success && <div className="text-emerald-400 text-sm">{success}</div>}

      {/* Search technicians */}
      <div className="flex items-center justify-between gap-3">
        <input
          className="border  border-[#A48AFB] bg-[#0f1218] text-white placeholder-slate-400 rounded-md p-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-[#A48AFB] focus:border-[#A48AFB] hover:border-[#A48AFB]/50 transition-colors"
          placeholder="Search technicians..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Promote existing user to Technician by Mobile */}
      <div className=" border border-white/10 rounded-2xl p-4 space-y-3 shadow-card bg-[#12151d]">
        <h2 className="font-medium text-white">Promote Existing User to Technician</h2>
        <div className="flex gap-3 items-center">
          <input
            className="border border-[#A48AFB]/30 bg-[#0f1218] text-white rounded-md p-2 flex-1 focus:outline-none focus:ring-2 focus:ring-[#A48AFB] focus:border-[#A48AFB] hover:border-[#A48AFB]/50 transition-colors"
            placeholder="User mobile (10 digits)"
            type="tel"
            pattern="^[6-9]\d{9}$"
            value={promoteMobile}
            onChange={(e) => setPromoteMobile(e.target.value)}
          />
          <button
            className="btn"
            disabled={promoting || !promoteMobile}
            onClick={async () => {
              setError(null)
              setSuccess(null)
              setPromoting(true)
              try {
                await api.post('/auth/promote', { mobile: promoteMobile, role: 'technician' })
                setSuccess('User promoted to technician')
                setPromoteMobile('')
                await load()
              } catch (e: any) {
                const err = (e?.response?.data as ApiError) || {}
                setError(err.message || 'Failed to promote user')
              } finally {
                setPromoting(false)
              }
            }}
          >
            {promoting ? 'Promoting...' : 'Promote'}
          </button>
        </div>
      </div>
      {loading ? (
        <div className="text-white">Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#12151d] shadow-card">
          <table className="min-w-full text-sm rounded-lg overflow-hidden text-white">
            <thead className="text-slate-300">
              <tr>
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-left py-2 px-3">Mobile</th>
                <th className="text-left py-2 px-3">Active</th>
                <th className="text-left py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) => {
                  const s = q.trim().toLowerCase()
                  if (!s) return true
                  const hay = [
                    r.firstName,
                    r.lastName,
                    r.mobile,
                    r.isActive ? 'active' : 'inactive',
                  ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                  return hay.includes(s)
                })
                .map((r, idx) => (
                <tr key={r.id} className={idx % 2 === 0 ? 'border-t border-white/10' : 'border-t border-white/10 hover:bg-white/5'}>
                  <td className="py-2 px-3">{r.firstName} {r.lastName}</td>
                  <td className="py-2 px-3">{r.mobile}</td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>{r.isActive ? 'active' : 'inactive'}</span>
                  </td>
                  <td className="py-2 px-3">
                    <button
                      className="btn"
                      disabled={demotingId === r.id}
                      onClick={() => setConfirmRevert({ id: r.id, name: `${r.firstName} ${r.lastName}` })}
                    >
                      {demotingId === r.id ? 'Reverting...' : 'Revert to Customer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Themed confirmation modal for revert */}
      {confirmRevert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmRevert(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#12151d] shadow-xl text-white">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold">Revert Technician</h3>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-slate-300 text-sm">Are you sure you want to revert <span className="font-medium text-white">{confirmRevert.name}</span> back to a customer?</p>
              <p className="text-slate-400 text-xs">This will change their role to customer. You can promote again later if needed.</p>
            </div>
            <div className="p-4 border-t border-white/10 flex items-center justify-end gap-2">
              <button className="btn-outline" onClick={() => setConfirmRevert(null)}>Cancel</button>
              <button
                className="btn"
                disabled={!!demotingId}
                onClick={async () => {
                  if (!confirmRevert) return
                  setError(null)
                  setSuccess(null)
                  setDemotingId(confirmRevert.id)
                  try {
                    await api.post('/auth/promote', { userId: confirmRevert.id, role: 'customer' })
                    setSuccess('Technician reverted to customer')
                    setConfirmRevert(null)
                    await load()
                  } catch (e: any) {
                    const err = (e?.response?.data as ApiError) || {}
                    setError(err.message || 'Failed to revert role')
                  } finally {
                    setDemotingId(null)
                  }
                }}
              >
                {demotingId ? 'Reverting...' : 'Confirm Revert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Technicians
