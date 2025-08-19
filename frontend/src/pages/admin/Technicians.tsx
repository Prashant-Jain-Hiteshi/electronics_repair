import React, { useEffect, useState } from 'react'
import { api, type ApiError } from '@/api/client'

type Technician = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  isActive: boolean
}

const Technicians: React.FC = () => {
  const [rows, setRows] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [q, setQ] = useState('')

  // Create technician form state
  const [newTech, setNewTech] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  })
  const [creating, setCreating] = useState(false)

  // Promote existing user form state
  const [promoteEmail, setPromoteEmail] = useState('')
  const [promoting, setPromoting] = useState(false)

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-800">Technicians</h1>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {success && <div className="text-green-700 text-sm">{success}</div>}

      {/* Search technicians */}
      <div className="flex items-center justify-between gap-3">
        <input
          className="border rounded-md p-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="Search technicians..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Create new Technician */}
      <div className=" border rounded-2xl p-4 space-y-3 shadow-card">
        <h2 className="font-medium">Create New Technician</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="First name"
            value={newTech.firstName}
            onChange={(e) => setNewTech({ ...newTech, firstName: e.target.value })}
          />
          <input
            className="border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Last name"
            value={newTech.lastName}
            onChange={(e) => setNewTech({ ...newTech, lastName: e.target.value })}
          />
          <input
            className="border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Email"
            type="email"
            value={newTech.email}
            onChange={(e) => setNewTech({ ...newTech, email: e.target.value })}
          />
          <input
            className="border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Phone (optional)"
            value={newTech.phone}
            onChange={(e) => setNewTech({ ...newTech, phone: e.target.value })}
          />
          <input
            className="border rounded-md p-2 md:col-span-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Temporary password"
            type="password"
            value={newTech.password}
            onChange={(e) => setNewTech({ ...newTech, password: e.target.value })}
          />
        </div>
        <button
          className="px-3 py-2 bg-slate-800 text-white rounded disabled:opacity-60"
          disabled={creating}
          onClick={async () => {
            setError(null)
            setSuccess(null)
            setCreating(true)
            try {
              // Step 1: register user (defaults to customer)
              const reg = await api.post('/auth/register', {
                email: newTech.email,
                password: newTech.password,
                firstName: newTech.firstName,
                lastName: newTech.lastName,
                phone: newTech.phone || undefined,
              })
              const userId = reg.data?.user?.id as string | undefined
              if (!userId) throw new Error('Register succeeded but no user id returned')
              // Step 2: promote to technician (admin-only)
              await api.post('/auth/promote', { userId, role: 'technician' })
              setSuccess('Technician created successfully')
              setNewTech({ firstName: '', lastName: '', email: '', phone: '', password: '' })
              await load()
            } catch (e: any) {
              const err = (e?.response?.data as ApiError) || {}
              setError(err.message || 'Failed to create technician')
            } finally {
              setCreating(false)
            }
          }}
        >
          {creating ? 'Creating...' : 'Create Technician'}
        </button>
      </div>

      {/* Promote existing user to Technician */}
      <div className=" border rounded-2xl p-4 space-y-3 shadow-card">
        <h2 className="font-medium">Promote Existing User to Technician</h2>
        <div className="flex gap-3 items-center">
          <input
            className="border rounded-md p-2 flex-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="User email"
            type="email"
            value={promoteEmail}
            onChange={(e) => setPromoteEmail(e.target.value)}
          />
          <button
            className="px-3 py-2 bg-slate-700 text-white rounded disabled:opacity-60"
            disabled={promoting || !promoteEmail}
            onClick={async () => {
              setError(null)
              setSuccess(null)
              setPromoting(true)
              try {
                await api.post('/auth/promote', { email: promoteEmail, role: 'technician' })
                setSuccess('User promoted to technician')
                setPromoteEmail('')
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
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border shadow-card">
          <table className="min-w-full text-sm rounded-lg overflow-hidden">
            <thead className="text-slate-600">
              <tr>
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-left py-2 px-3">Email</th>
                <th className="text-left py-2 px-3">Phone</th>
                <th className="text-left py-2 px-3">Active</th>
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
                    r.email,
                    r.phone,
                    r.isActive ? 'active' : 'inactive',
                  ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                  return hay.includes(s)
                })
                .map((r, idx) => (
                <tr key={r.id} className={idx % 2 === 0 ? 'border-t' : 'border-t bg-white hover:bg-slate-100'}>
                  <td className="py-2 px-3">{r.firstName} {r.lastName}</td>
                  <td className="py-2 px-3">{r.email}</td>
                  <td className="py-2 px-3">{r.phone || '-'}</td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>{r.isActive ? 'active' : 'inactive'}</span>
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

export default Technicians
