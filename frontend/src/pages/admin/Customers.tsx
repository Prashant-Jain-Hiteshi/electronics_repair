import React, { useEffect, useState } from 'react'
import { api, type ApiError } from '@/api/client'

type Customer = {
  id: string
  userId: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  devicePreferences?: string
  notes?: string
  // minimal user info attached by backend for admin listing
  user?: {
    id: string
    firstName: string
    lastName: string
    phone?: string
    isActive: boolean
  }
}

type User = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  isActive: boolean
}

const Customers: React.FC = () => {
  const [rows, setRows] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ mobile: '', firstName: '', lastName: '', address: '' })
  const [formErrors, setFormErrors] = useState<{ firstName?: string; lastName?: string; mobile?: string }>({})
  const [q, setQ] = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/customers')
      setRows(res.data.customers || [])
    } catch (e: any) {
      const err = (e?.response?.data as ApiError) || {}
      setError(err.message || 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function validate() {
    const errs: typeof formErrors = {}
    if (!form.firstName.trim()) errs.firstName = 'First name is required.'
    if (!form.lastName.trim()) errs.lastName = 'Last name is required.'
    const m = form.mobile.trim()
    if (!m) errs.mobile = 'Mobile number is required.'
    else if (!/^[6-9]\d{9}$/.test(m)) errs.mobile = 'Enter a valid 10-digit Indian mobile (starts with 6-9).'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setCreating(true)
    setError(null)
    try {
      await api.post('/customers', form)
      setForm({ mobile: '', firstName: '', lastName: '', address: '' })
      setFormErrors({})
      setFormOpen(false)
      await load()
    } catch (e: any) {
      const err = (e?.response?.data as ApiError) || {}
      setError(err.message || 'Failed to create customer')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeactivate(customerId: string) {
    if (!confirm('Deactivate this customer?')) return
    try {
      await api.delete(`/customers/${customerId}`)
      await load()
    } catch (e: any) {
      const err = (e?.response?.data as ApiError) || {}
      alert(err.message || 'Failed to deactivate customer')
    }
  }

  return (
    <div className="space-y-4 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Customers</h1>
        <button className="btn" onClick={() => setFormOpen(true)}>New Customer</button>
      </div>
      {error && <div className="text-red-400 text-sm">{error}</div>}
      {/* Search */}
      <div className="flex items-center justify-between gap-3">
        <input
          className="border  border-[#A48AFB] bg-[#0f1218] text-white placeholder-slate-400 rounded-md p-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-[#A48AFB] focus:border-[#A48AFB] hover:border-[#A48AFB]/50 transition-colors"
          placeholder="Search customers..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {loading ? (
        <div className="text-white">Loading...</div>
      ) : (
        <div className="overflow-auto border border-white/10 rounded bg-[#12151d]">
          <table className="min-w-full text-sm text-white">
            <thead className=" text-slate-300">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Phone</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) => {
                  const s = q.trim().toLowerCase()
                  if (!s) return true
                  const hay = [
                    r.user?.firstName,
                    r.user?.lastName,
                    r.user?.phone,
                    r.address,
                    r.city,
                    r.state,
                    r.zipCode,
                  ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                  return hay.includes(s)
                })
                .map((r) => (
                <tr key={r.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="p-2">{r.user ? `${r.user.firstName} ${r.user.lastName}` : '-'}</td>
                  <td className="p-2">{r.user?.phone || '-'}</td>
                  <td className="p-2">
                    <button className="btn btn-sm" onClick={() => handleDeactivate(r.id)}>Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setFormOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#12151d] shadow-xl text-white" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold">Create Customer</h3>
            </div>
            <form className="p-4 space-y-3" onSubmit={handleCreate}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">First Name</label>
                  <input
                    className={`input border-white/10 bg-[#0f1218] text-white ${formErrors.firstName ? 'ring-2 ring-red-500 border-red-500' : ''}`}
                    value={form.firstName}
                    onChange={(e)=>{ setForm({...form, firstName: e.target.value}); if (formErrors.firstName) setFormErrors(prev=>({ ...prev, firstName: undefined })) }}
                  />
                  {formErrors.firstName && <p className="mt-1 text-xs text-red-400">{formErrors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Last Name</label>
                  <input
                    className={`input border-white/10 bg-[#0f1218] text-white ${formErrors.lastName ? 'ring-2 ring-red-500 border-red-500' : ''}`}
                    value={form.lastName}
                    onChange={(e)=>{ setForm({...form, lastName: e.target.value}); if (formErrors.lastName) setFormErrors(prev=>({ ...prev, lastName: undefined })) }}
                  />
                  {formErrors.lastName && <p className="mt-1 text-xs text-red-400">{formErrors.lastName}</p>}
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Mobile</label>
                  <input
                    className={`input border-white/10 bg-[#0f1218] text-white ${formErrors.mobile ? 'ring-2 ring-red-500 border-red-500' : ''}`}
                    placeholder="10-digit mobile"
                    value={form.mobile}
                    onChange={(e)=>{ setForm({...form, mobile: e.target.value}); if (formErrors.mobile) setFormErrors(prev=>({ ...prev, mobile: undefined })) }}
                  />
                  {formErrors.mobile && <p className="mt-1 text-xs text-red-400">{formErrors.mobile}</p>}
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Address</label>
                  <input className="input border-white/10 bg-[#0f1218] text-white" value={form.address} onChange={(e)=>setForm({...form, address: e.target.value})} />
                </div>
                {/* <div className="col-span-2 text-xs text-slate-400">Mobile is mandatory. Email/password are not required.</div> */}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-white/10 mt-2 pt-4">
                <button type="button" className="btn-outline" onClick={()=>setFormOpen(false)}>Cancel</button>
                <button className="btn" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Customers
