import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createDevice, getDeviceHistory, listMyDevices, type CustomerDeviceDto, type DeviceHistoryItem } from '@/api/devices'
import FormInput from '@/components/common/FormInput'

const MyDevices: React.FC = () => {
  const [devices, setDevices] = useState<CustomerDeviceDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [histories, setHistories] = useState<Record<string, { device: CustomerDeviceDto; repairs: DeviceHistoryItem[] }>>({})

  // create form state
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [cErrors, setCErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<{ deviceType: string; brand: string; model: string; serialNumber?: string; notes?: string }>({ deviceType: '', brand: '', model: '', serialNumber: '', notes: '' })

  useEffect(() => {
    (async () => {
      setLoading(true)
      setError(null)
      try {
        const items = await listMyDevices()
        setDevices(items)
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load devices')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const validateCreate = () => {
    const errs: Record<string, string> = {}
    if (!form.deviceType.trim()) errs.deviceType = 'Device type is required'
    if (!form.brand.trim()) errs.brand = 'Brand is required'
    if (!form.model.trim()) errs.model = 'Model is required'
    setCErrors(errs)
    return Object.keys(errs).length === 0
  }

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateCreate()) return
    setCreating(true)
    try {
      const created = await createDevice({
        deviceType: form.deviceType,
        brand: form.brand,
        model: form.model,
        serialNumber: form.serialNumber || undefined,
        notes: form.notes || undefined,
      })
      setDevices(prev => [created, ...prev])
      setShowCreate(false)
      setForm({ deviceType: '', brand: '', model: '', serialNumber: '', notes: '' })
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'success', message: 'Device saved' } }))
    } catch (e: any) {
      const normalized = e?.response?.data as { message?: string; errors?: Record<string, string[]> }
      if (normalized?.errors && typeof normalized.errors === 'object') {
        const next: Record<string, string> = {}
        for (const [key, msgs] of Object.entries(normalized.errors)) {
          if (Array.isArray(msgs) && msgs.length) next[key] = msgs[0]
        }
        setCErrors(next)
      }
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: normalized?.message || 'Failed to save device' } }))
    } finally {
      setCreating(false)
    }
  }

  const toggleExpand = async (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
    if (!histories[id]) {
      try {
        const data = await getDeviceHistory(id)
        setHistories(prev => ({ ...prev, [id]: data }))
      } catch (e: any) {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: 'Failed to load device history' } }))
      }
    }
  }

  const base = (import.meta as any)?.env?.BASE_URL || '/'

  return (
    <div className="max-w-5xl mx-auto text-white">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">My Devices</h1>
        <p className="text-sm text-slate-300 mt-1">Manage your saved devices and view their repair history.</p>
      </div>

      <div className="rounded-2xl border border-white/10 auth-card backdrop-blur shadow-lg overflow-hidden">
        <div className="p-4 md:p-5 flex items-center justify-between bg-[#12151d] border-b border-white/10">
          <div className="text-sm text-slate-300">Saved Devices</div>
          <button className="rounded-md border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5" onClick={() => setShowCreate(s => !s)}>
            {showCreate ? 'Close' : 'Add Device'}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={onCreate} className="p-4 md:p-5 border-b border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0f1117]">
            <div>
              <FormInput
                label="Device Type"
                placeholder="Laptop, Phone, TV..."
                value={form.deviceType}
                onChange={(e) => setForm(f => ({ ...f, deviceType: (e.target as HTMLInputElement).value }))}
                error={cErrors.deviceType}
              />
              {cErrors.deviceType && <p className="text-xs text-red-400 mt-1">{cErrors.deviceType}</p>}
            </div>
            <div>
              <FormInput
                label="Brand"
                placeholder="Apple, Samsung..."
                value={form.brand}
                onChange={(e) => setForm(f => ({ ...f, brand: (e.target as HTMLInputElement).value }))}
                error={cErrors.brand}
              />
              {cErrors.brand && <p className="text-xs text-red-400 mt-1">{cErrors.brand}</p>}
            </div>
            <div>
              <FormInput
                label="Model"
                placeholder="Model name/number"
                value={form.model}
                onChange={(e) => setForm(f => ({ ...f, model: (e.target as HTMLInputElement).value }))}
                error={cErrors.model}
              />
              {cErrors.model && <p className="text-xs text-red-400 mt-1">{cErrors.model}</p>}
            </div>
            <div>
              <FormInput
                label="Serial Number (optional)"
                placeholder="SN..."
                value={form.serialNumber}
                onChange={(e) => setForm(f => ({ ...f, serialNumber: (e.target as HTMLInputElement).value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-white mb-1">Notes (optional)</label>
              <textarea className="input border bg-transparent text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A48AFB] focus:border-[#A48AFB] border-white/10" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any details you'd like to save about this device" />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <button className="btn" disabled={creating}>{creating ? 'Saving...' : 'Save Device'}</button>
              <button type="button" className="inline-flex items-center justify-center rounded-md border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="p-4 md:p-5 bg-[#0f1117]">
          {loading ? (
            <div className="text-sm text-slate-300">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-400">{error}</div>
          ) : devices.length === 0 ? (
            <div className="text-sm text-slate-300">
              No devices yet. Add your frequently repaired devices for faster intake.
            </div>
          ) : (
            <ul className="space-y-3">
              {devices.map(d => (
                <li key={d.id} className="rounded-lg border border-white/10 bg-[#12151d] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">{d.deviceType} • {d.brand} {d.model}</div>
                      {d.serialNumber && <div className="text-xs text-slate-400 truncate">SN: {d.serialNumber}</div>}
                      {d.notes && <div className="text-xs text-slate-400 truncate">{d.notes}</div>}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <button className="rounded-md border border-white/10 px-2 py-1 text-xs text-white hover:bg-white/5" onClick={() => toggleExpand(d.id)}>
                        {expandedId === d.id ? 'Hide History' : 'View History'}
                      </button>
                      <Link to="/repairs/new" state={{ preselectDeviceId: d.id }} className="rounded-md bg-[#A48AFB] text-white px-2 py-1 text-xs hover:bg-[#9a80ff]">Repair this</Link>
                    </div>
                  </div>

                  {expandedId === d.id && (
                    <div className="mt-3 border-t border-white/10 pt-3">
                      {!histories[d.id] ? (
                        <div className="text-xs text-slate-300">Loading history...</div>
                      ) : histories[d.id].repairs.length === 0 ? (
                        <div className="text-xs text-slate-300">No repair history yet.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-slate-300">
                                <th className="py-1 pr-3">Date</th>
                                <th className="py-1 pr-3">Status</th>
                                <th className="py-1 pr-3">Invoice</th>
                              </tr>
                            </thead>
                            <tbody className="text-slate-200">
                              {histories[d.id].repairs.map(r => (
                                <tr key={r.id} className="border-t border-white/5">
                                  <td className="py-1 pr-3">{new Date(r.createdAt).toLocaleString()}</td>
                                  <td className="py-1 pr-3">{r.status}</td>
                                  <td className="py-1 pr-3">
                                    <a href={r.invoiceUrl} target="_blank" rel="noreferrer" className="text-[#A48AFB] hover:underline">View Invoice</a>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default MyDevices
