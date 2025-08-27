import React, { useEffect, useRef, useState } from 'react'
import { api, type ApiError } from '@/api/client'
import { connectSocket, getSocket } from '@/api/socket'

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
      </div>
      {error && <div className="text-rose-400 text-sm">{error}</div>}
      {success && <div className="text-emerald-400 text-sm">{success}</div>}

      {/* Create new inventory item */}
      <div className="rounded-2xl p-4 space-y-3 shadow-card border border-white/10 bg-[#12151d] text-white">
        <h2 className="font-medium text-white">Add Item</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="input" placeholder="Part Name" value={form.partName as string} onChange={e=>setForm({...form, partName: e.target.value})} />
          <input className="input" placeholder="Part Number (SKU)" value={form.partNumber as string} onChange={e=>setForm({...form, partNumber: e.target.value})} />
          <input className="input" placeholder="Category" value={form.category as string} onChange={e=>setForm({...form, category: e.target.value})} />
        </div>
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
                      <input
                        className="input"
                        value={(edit[r.id].partName as string) ?? r.partName}
                        onChange={ev =>
                          setEdit({
                            ...edit,
                            [r.id]: { ...edit[r.id], partName: ev.target.value },
                          })
                        }
                      />
                    ) : (
                      r.partName
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {edit[r.id] ? (
                      <input
                        className="input"
                        value={(edit[r.id].partNumber as string) ?? r.partNumber}
                        onChange={ev =>
                          setEdit({
                            ...edit,
                            [r.id]: { ...edit[r.id], partNumber: ev.target.value },
                          })
                        }
                      />
                    ) : (
                      r.partNumber
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {edit[r.id] ? (
                      <input
                        className="input"
                        value={(edit[r.id].category as string) ?? r.category}
                        onChange={ev =>
                          setEdit({
                            ...edit,
                            [r.id]: { ...edit[r.id], category: ev.target.value },
                          })
                        }
                      />
                    ) : (
                      r.category
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {edit[r.id] ? (
                      <input
                        className="input"
                        type="number"
                        value={(edit[r.id].quantity as number) ?? r.quantity}
                        onChange={ev =>
                          setEdit({
                            ...edit,
                            [r.id]: { ...edit[r.id], quantity: Number(ev.target.value) },
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
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        value={(edit[r.id].sellingPrice as number) ?? Number(r.sellingPrice)}
                        onChange={ev =>
                          setEdit({
                            ...edit,
                            [r.id]: { ...edit[r.id], sellingPrice: Number(ev.target.value) },
                          })
                        }
                      />
                    ) : (
                      `₹${Number(r.sellingPrice)}`
                    )}
                  </td>
                  <td className="py-2 px-3 flex gap-2 flex-wrap">
                    {!edit[r.id] ? (
                      <>
                        <button
                          className="icon-btn tooltip"
                          data-tip="Edit"
                          aria-label="Edit item"
                          onClick={() => setEdit({ ...edit, [r.id]: { ...r } })}
                        >
                          <IconEdit />
                        </button>
                        <button
                          className="icon-btn tooltip"
                          data-tip="Delete"
                          aria-label="Delete item"
                          onClick={() => setConfirm({ open: true, id: r.id, name: r.partName })}
                        >
                          <IconTrash />
                        </button>
                      </>
                    ) : (
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
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Confirm Delete Modal */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirm({ open: false })} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#12151d] p-5 shadow-xl text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Delete item?</h3>
                <p className="mt-1 text-sm text-slate-300">This will permanently remove <span className="text-white">{confirm.name}</span> from inventory.</p>
              </div>
              <button className="icon-btn" aria-label="Close" onClick={() => setConfirm({ open: false })}><IconX /></button>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/5" onClick={() => setConfirm({ open: false })}>Cancel</button>
              <button
                className="btn"
                onClick={async () => {
                  if (!confirm.id) return
                  setError(null);
                  setSuccess(null);
                  try {
                    await api.delete(`/inventory/${confirm.id}`);
                    setSuccess('Item deleted');
                    setConfirm({ open: false });
                    await load();
                  } catch (e: any) {
                    const err = (e?.response?.data as ApiError) || {};
                    setError(err.message || 'Failed to delete');
                  }
                }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory
