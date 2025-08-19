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
    email: string
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
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '' })
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await api.post('/customers', form)
      setForm({ email: '', password: '', firstName: '', lastName: '', phone: '' })
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Customers</h1>
        <button className="btn" onClick={() => setFormOpen(true)}>New Customer</button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {/* Search */}
      <div className="flex items-center justify-between gap-3">
        <input
          className="border rounded-md p-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="Search customers..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className=" text-slate-600">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Email</th>
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
                    r.user?.email,
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
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.user ? `${r.user.firstName} ${r.user.lastName}` : '-'}</td>
                  <td className="p-2">{r.user?.email || '-'}</td>
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setFormOpen(false)}>
          <div className="bg-white rounded shadow-lg w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b font-semibold">Create Customer</div>
            <form className="p-4 space-y-3" onSubmit={handleCreate}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">First Name</label>
                  <input className="input" value={form.firstName} onChange={(e)=>setForm({...form, firstName: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Last Name</label>
                  <input className="input" value={form.lastName} onChange={(e)=>setForm({...form, lastName: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Email</label>
                  <input className="input" type="email" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Phone</label>
                  <input className="input" value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-600 mb-1">Password</label>
                  <input className="input" type="password" value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} required />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
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
