import React, { useEffect, useRef, useState } from 'react'
import { api, type ApiError } from '@/api/client'
import { connectSocket, getSocket } from '@/api/socket'
import FormInput from '@/components/common/FormInput'
import FormSelect from '@/components/common/FormSelect'
import Toast from '@/components/common/Toast'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import Modal from '@/components/common/Modal'

type Item = {
  id: string
  partName: string
  partNumber: string
  description?: string
  category: string
  brand?: string
  supplier?: string
  quantity: number
  minStockLevel: number
  unitCost: number
  sellingPrice: number
  location?: string
  isActive: boolean
}

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
)
const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
)
const IconSave = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>
)
const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
)

const Inventory: React.FC = () => {
  const [rows, setRows] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Reservation modal state
  const [reserveFor, setReserveFor] = useState<Item | null>(null)
  const [reserveQty, setReserveQty] = useState<number>(1)
  const [reserveRepairId, setReserveRepairId] = useState<string>('')
  const [reserveNote, setReserveNote] = useState<string>('')
  const [reserving, setReserving] = useState(false)
  const [recentReservationId, setRecentReservationId] = useState<string | null>(null)

  // Scan modal state
  const [scanOpen, setScanOpen] = useState(false)
  const [scanCode, setScanCode] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [scanFound, setScanFound] = useState<any | null>(null)

  // Create form
  const [form, setForm] = useState<Partial<Item>>({
    partName: '',
    partNumber: '',
    category: '',
    quantity: 0,
    minStockLevel: 5,
    unitCost: 0,
    sellingPrice: 0,
    brand: '',
    supplier: '',
    location: '',
    description: '',
    isActive: true,
  })
  const [creating, setCreating] = useState(false)

  // Edit map: id -> editable fields
  const [edit, setEdit] = useState<Record<string, Partial<Item>>>({})
  const [confirm, setConfirm] = useState<{ open: boolean; id?: string; name?: string }>({ open: false })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/inventory')
      setRows(res.data.items || res.data.inventory || [])
    } catch (e: any) {
      const err = (e?.response?.data as ApiError) || {}
      setError(err.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Socket listener for real-time updates
  const lastEvent = useRef<number>(0)
  useEffect(() => {
    const token = localStorage.getItem('token') || ''
    const s = getSocket() || connectSocket(token)
    const handler = (_payload: any) => {
      const now = Date.now()
      // debounce rapid bursts
      if (now - lastEvent.current < 300) return
      lastEvent.current = now
      load()
    }
    s.on('inventory:changed', handler)
    return () => {
      try { s.off('inventory:changed', handler) } catch {}
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-white">Inventory</h1>
        <div className="flex gap-2">
          <button className="btn btn-sm" onClick={() => setScanOpen(true)}>Scan Barcode</button>
          <button
            className="btn btn-sm"
            onClick={() => {
              // Export CSV of current rows
              const headers = ['partName','partNumber','category','quantity','minStockLevel','unitCost','sellingPrice','brand','supplier','location','description','isActive']
              const csvRows = [
                headers.join(','),
                ...rows.map(r => headers.map(h => {
                  const val: any = (r as any)[h]
                  const s = val === undefined || val === null ? '' : String(val)
                  // basic CSV escaping
                  const needsQuote = s.includes(',') || s.includes('"') || s.includes('\n')
                  const esc = s.replace(/"/g, '""')
                  return needsQuote ? `"${esc}"` : esc
                }).join(','))
              ].join('\n')
              const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `inventory_${new Date().toISOString().slice(0,10)}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}
          >Export CSV</button>
          <label className="btn btn-sm cursor-pointer">
            Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const text = await file.text()
                  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
                  if (lines.length <= 1) return
                  const headers = lines[0].split(',').map(h => h.trim())
                  const toItem = (obj: any): Partial<Item> => ({
                    partName: obj.partName || obj.PartName,
                    partNumber: obj.partNumber || obj.SKU || obj.partNo,
                    category: obj.category || '',
                    quantity: Number(obj.quantity || 0),
                    minStockLevel: Number(obj.minStockLevel || 5),
                    unitCost: Number(obj.unitCost || 0),
                    sellingPrice: Number(obj.sellingPrice || 0),
                    brand: obj.brand || '',
                    supplier: obj.supplier || '',
                    location: obj.location || '',
                    description: obj.description || '',
                    isActive: String(obj.isActive ?? 'true').toLowerCase() !== 'false',
                  })
                  const items: Partial<Item>[] = []
                  for (let i = 1; i < lines.length; i++) {
                    const raw = [] as string[]
                    // basic CSV parse with quotes
                    let cur = ''
                    let inQ = false
                    for (const ch of lines[i]) {
                      if (ch === '"') { inQ = !inQ; cur += ch; continue }
                      if (ch === ',' && !inQ) { raw.push(cur); cur = ''; continue }
                      cur += ch
                    }
                    raw.push(cur)
                    const values = raw.map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))
                    const obj: any = {}
                    headers.forEach((h, idx) => obj[h] = values[idx])
                    items.push(toItem(obj))
                  }
                  // Persist by creating items individually to avoid relying on a bulk API
                  for (const it of items) {
                    try { await api.post('/inventory', it) } catch {}
                  }
                  await load()
                } catch {
                  // noop
                } finally {
                  e.currentTarget.value = ''
                }
              }}
            />
          </label>
        </div>
      </div>
      {/* Low-stock banner */}
      {rows.some(r => Number(r.quantity) <= Number(r.minStockLevel)) && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          Low stock alerts: {rows.filter(r => Number(r.quantity) <= Number(r.minStockLevel)).length} item(s) at or below minimum. Consider reordering.
        </div>
      )}
      {error && (
        <Toast kind="error" onClose={() => setError(null)} autoHideMs={5000}>
          {error}
        </Toast>
      )}
      {success && (
        <Toast kind="success" onClose={() => setSuccess(null)} autoHideMs={4000}>
          {success}
        </Toast>
      )}

      {/* Create new inventory item */}
      <div className="rounded-2xl p-4 space-y-3 shadow-card border border-white/10 bg-[#12151d] text-white">
        <h2 className="font-medium text-white">Add Item</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormInput label="Part Name" placeholder="e.g., Battery" value={form.partName as string} onChange={e=>setForm({...form, partName: e.currentTarget.value})} />
          <FormInput label="Part Number (SKU)" placeholder="e.g., BAT-IPH12" value={form.partNumber as string} onChange={e=>setForm({...form, partNumber: e.currentTarget.value})} />
          <FormInput label="Category" placeholder="e.g., Power" value={form.category as string} onChange={e=>setForm({...form, category: e.currentTarget.value})} />
          <FormInput label="Supplier (optional)" placeholder="e.g., ACME Parts" value={form.supplier as string} onChange={e=>setForm({...form, supplier: e.currentTarget.value})} />
          <FormInput label="Brand (optional)" placeholder="e.g., Apple" value={form.brand as string} onChange={e=>setForm({...form, brand: e.currentTarget.value})} />
          <FormInput label="Location (bin)" placeholder="e.g., A1-3" value={form.location as string} onChange={e=>setForm({...form, location: e.currentTarget.value})} />
        </div>
        <div className="text-xs text-slate-300">Tip: Use "Supplier" to quickly add a supplier name; no catalog required.</div>
        <button
          className="btn"
          disabled={creating}
          onClick={async () => {
            setError(null);
            setSuccess(null);
            setCreating(true);
            try {
              const payload = { ...form };
              await api.post('/inventory', payload);
              setSuccess('Item created');
              setForm({
                partName: '',
                partNumber: '',
                category: '',
                quantity: 0,
                minStockLevel: 5,
                unitCost: 0,
                sellingPrice: 0,
                brand: '',
                supplier: '',
                location: '',
                description: '',
                isActive: true,
              });
              await load();
            } catch (e: any) {
              const err = (e?.response?.data as ApiError) || {};
              setError(err.message || 'Failed to create item');
            } finally {
              setCreating(false);
            }
          }}
        >
          {creating ? 'Creating...' : 'Add Item'}
        </button>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0f1218] shadow-card">
          <table className="min-w-full text-sm rounded-lg overflow-hidden text-white">
            <thead className="text-slate-200">
              <tr>
                <th className="text-left py-2 px-3">Part</th>
                <th className="text-left py-2 px-3">SKU</th>
                <th className="text-left py-2 px-3">Category</th>
                <th className="text-left py-2 px-3">Qty</th>
                <th className="text-left py-2 px-3">Sell Price</th>
                <th className="text-left py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.id}
                  className={idx % 2 === 0 ? 'border-t border-white/5 bg-[#12151d]' : 'border-t border-white/5 bg-[#0b0d12] hover:bg-[#10131a]'}
                >
                  <td className="py-2 px-3">
                    {edit[r.id] ? (
                      <FormInput
                        value={(edit[r.id].partName as string) ?? r.partName}
                        onChange={ev =>
                          setEdit({
                            ...edit,
                            [r.id]: { ...edit[r.id], partName: ev.currentTarget.value },
                          })
                        }
                      />
                    ) : (
                      r.partName
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {edit[r.id] ? (
                      <FormInput
                        value={(edit[r.id].partNumber as string) ?? r.partNumber}
                        onChange={ev =>
                          setEdit({
                            ...edit,
                            [r.id]: { ...edit[r.id], partNumber: ev.currentTarget.value },
                          })
                        }
                      />
                    ) : (
                      r.partNumber
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {edit[r.id] ? (
                      <FormInput
                        value={(edit[r.id].category as string) ?? r.category}
                        onChange={ev =>
                          setEdit({
                            ...edit,
                            [r.id]: { ...edit[r.id], category: ev.currentTarget.value },
                          })
                        }
                      />
                    ) : (
                      r.category
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {edit[r.id] ? (
                      <FormInput
                        type="number"
                        value={(edit[r.id].quantity as number) ?? r.quantity}
                        onChange={ev =>
                          setEdit({
                            ...edit,
                            [r.id]: { ...edit[r.id], quantity: Number(ev.currentTarget.value) },
                          })
                        }
                      />
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <span>{r.quantity}</span>
                        {Number(r.quantity) <= Number(r.minStockLevel) && (
                          <span className="tooltip inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300" data-tip={`Low stock (min ${r.minStockLevel})`}>Low</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {edit[r.id] ? (
                      <FormInput
                        type="number"
                        step="0.01"
                        value={(edit[r.id].sellingPrice as number) ?? Number(r.sellingPrice)}
                        onChange={ev =>
                          setEdit({
                            ...edit,
                            [r.id]: { ...edit[r.id], sellingPrice: Number(ev.currentTarget.value) },
                          })
                        }
                      />
                    ) : (
                      <>${Number(r.sellingPrice).toFixed(2)}</>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {edit[r.id] ? (
                      <>
                        <button
                          className="icon-btn tooltip"
                          data-tip="Save"
                          onClick={async () => {
                            setError(null);
                            setSuccess(null);
                            try {
                              await api.put(`/inventory/${r.id}`, edit[r.id]);
                              setSuccess('Item updated');
                              setEdit(prev => {
                                const p = { ...prev };
                                delete p[r.id];
                                return p;
                              });
                              await load();
                            } catch (e: any) {
                              const err = (e?.response?.data as ApiError) || {};
                              setError(err.message || 'Failed to update');
                            }
                          }}
                        >
                          <IconSave />
                        </button>
                        <button
                          className="icon-btn tooltip"
                          data-tip="Cancel"
                          onClick={() =>
                            setEdit(prev => {
                              const p = { ...prev };
                              delete p[r.id];
                              return p;
                            })
                          }
                        >
                          <IconX />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          className="icon-btn tooltip"
                          data-tip="Edit"
                          onClick={() => setEdit({ ...edit, [r.id]: { ...r } })}
                        >
                          <IconEdit />
                        </button>
                        <button
                          className="btn btn-xs"
                          onClick={() => setReserveFor(r)}
                        >
                          Reserve
                        </button>
                        <button
                          className="icon-btn tooltip"
                          data-tip="Delete"
                          onClick={() => setConfirm({ open: true, id: r.id, name: r.partName })}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={!!confirm.open}
        title="Delete item?"
        message={`This will permanently remove ${confirm.name || 'this item'} from inventory.`}
        confirmText="Delete"
        onCancel={() => setConfirm({ open: false })}
        onConfirm={async () => {
          if (!confirm.id) return
          setError(null); setSuccess(null)
          try {
            await api.delete(`/inventory/${confirm.id}`)
            setSuccess('Item deleted')
            setConfirm({ open: false })
            await load()
          } catch (e: any) {
            const err = (e?.response?.data as ApiError) || {}
            setError(err.message || 'Failed to delete')
          }
        }}
      />

      {/* Reserve Modal */}
      {reserveFor && (
        <Modal
          open
          onClose={() => setReserveFor(null)}
          title={`Reserve ${reserveFor.partName}`}
          footer={(
            <div className="flex items-center justify-end gap-2">
              <button className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/5" onClick={() => setReserveFor(null)}>Close</button>
              <button
                className="btn btn-sm"
                disabled={reserving || !reserveRepairId || reserveQty <= 0}
                onClick={async () => {
                  if (!reserveFor) return
                  setError(null); setSuccess(null); setReserving(true)
                  try {
                    const res = await api.post(`/inventory/${reserveFor.id}/reserve`, {
                      repairOrderId: reserveRepairId,
                      qty: reserveQty,
                      note: reserveNote || undefined,
                    })
                    const reservation = res.data?.reservation
                    setRecentReservationId(reservation?.id)
                    setSuccess('Reserved successfully')
                    await load()
                  } catch (e: any) {
                    const err = (e?.response?.data as ApiError) || {}
                    setError(err.message || 'Failed to reserve')
                  } finally {
                    setReserving(false)
                  }
                }}
              >{reserving ? 'Reserving…' : 'Reserve'}</button>
              {recentReservationId && (
                <button
                  className="btn btn-sm"
                  onClick={async () => {
                    try {
                      const res = await api.get(`/inventory/labels/${recentReservationId}`)
                      const label = res.data?.label
                      const w = window.open('', '_blank')
                      if (w) {
                        w.document.write(`<!doctype html><html><head><meta charset=\"utf-8\" /><title>Label</title><style>body{font-family: ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial; padding:12px} .box{border:1px solid #ccc; padding:12px; width:320px} .barcode{font-family: monospace; font-size: 14px; letter-spacing: 2px}</style></head><body><div class=\"box\"><div><strong>${label?.title || 'Reservation'}</strong></div><div>Repair ID: ${label?.repairOrderId || ''}</div><div>Part: ${label?.partName || ''}</div><div>SKU: ${label?.partNumber || ''}</div><div>Qty: ${label?.qty || ''}</div><div>Barcode:</div><div class=\"barcode\">${label?.barcode || ''}</div><div style=\"margin-top:8px; font-size:11px; color:#666\">${label?.timestamp || ''}</div></div><script>window.onload = () => setTimeout(()=>window.print(), 200)</script></body></html>`)
                        w.document.close()
                      }
                    } catch (e: any) {
                      const err = (e?.response?.data as ApiError) || {}
                      setError(err.message || 'Failed to open label')
                    }
                  }}
                >Print Label</button>
              )}
            </div>
          )}
        >
          <div className="space-y-3">
            <FormInput label="Repair Order ID" placeholder="e.g., 94b7c0..." value={reserveRepairId} onChange={e=>setReserveRepairId(e.currentTarget.value)} />
            <FormInput label="Quantity" type="number" value={reserveQty as any} onChange={e=>setReserveQty(Number(e.currentTarget.value))} />
            <FormInput label="Note (optional)" value={reserveNote} onChange={e=>setReserveNote(e.currentTarget.value)} />
            <div className="text-xs text-slate-300">Available: {reserveFor.quantity}. Reserving will hold stock for the specified repair; consumption happens later when used.</div>
          </div>
        </Modal>
      )}

      {/* Scan Modal */}
      {scanOpen && (
        <Modal
          open
          onClose={() => { setScanOpen(false); setScanCode(''); setScanFound(null) }}
          title="Scan Reservation Barcode"
          footer={(
            <div className="flex items-center justify-end gap-2">
              <button className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/5" onClick={() => { setScanOpen(false); setScanCode(''); setScanFound(null) }}>Close</button>
              {scanFound && (
                <>
                  <button
                    className="btn btn-sm"
                    onClick={async () => {
                      try {
                        await api.post(`/inventory/reservations/${scanFound.id}/pick`, { barcode: scanFound.barcode })
                        setSuccess('Marked as picked')
                      } catch (e: any) {
                        const err = (e?.response?.data as ApiError) || {}
                        setError(err.message || 'Failed to pick')
                      }
                    }}
                  >Mark Picked</button>
                  <button
                    className="btn btn-sm"
                    onClick={async () => {
                      try {
                        await api.post(`/inventory/reservations/${scanFound.id}/consume`)
                        setSuccess('Marked as consumed')
                      } catch (e: any) {
                        const err = (e?.response?.data as ApiError) || {}
                        setError(err.message || 'Failed to consume')
                      }
                    }}
                  >Confirm Consume</button>
                </>
              )}
            </div>
          )}
        >
          <div className="space-y-3">
            <FormInput
              label="Barcode"
              placeholder="Focus here and scan"
              value={scanCode}
              onChange={e=>setScanCode(e.currentTarget.value)}
              onKeyDown={async (e: any) => {
                if (e.key === 'Enter') {
                  setScanLoading(true); setError(null); setScanFound(null)
                  try {
                    const res = await api.post('/inventory/scan', { barcode: scanCode.trim() })
                    setScanFound(res.data?.reservation)
                  } catch (er: any) {
                    const err = (er?.response?.data as ApiError) || {}
                    setError(err.message || 'Not found')
                  } finally {
                    setScanLoading(false)
                  }
                }
              }}
            />
            {scanLoading && <div className="text-sm text-slate-300">Searching…</div>}
            {scanFound && (
              <div className="rounded-lg border border-white/10 p-3 text-sm text-white bg-white/5">
                <div><span className="text-slate-300">Reservation:</span> {scanFound.id}</div>
                <div><span className="text-slate-300">Repair:</span> {scanFound.repairOrderId}</div>
                <div><span className="text-slate-300">Qty:</span> {scanFound.reservedQty || Math.abs(scanFound.quantityChange)}</div>
                <div><span className="text-slate-300">Status:</span> {scanFound.status || 'reserved'}</div>
                <div className="text-xs text-slate-300 mt-1">Workflow: Pick when part is retrieved from shelf, then Confirm Consume after installation.</div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Inventory
