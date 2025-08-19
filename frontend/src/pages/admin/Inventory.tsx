import React, { useEffect, useState } from 'react'
import { api, type ApiError } from '@/api/client'

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-800">Inventory</h1>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {success && <div className="text-green-700 text-sm">{success}</div>}

      {/* Create new inventory item */}
      <div className=" border rounded-2xl p-4 space-y-3 shadow-card">
        <h2 className="font-medium">Add Item</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="input" placeholder="Part Name" value={form.partName as string} onChange={e=>setForm({...form, partName: e.target.value})} />
          <input className="input" placeholder="Part Number (SKU)" value={form.partNumber as string} onChange={e=>setForm({...form, partNumber: e.target.value})} />
          <input className="input" placeholder="Category" value={form.category as string} onChange={e=>setForm({...form, category: e.target.value})} />
        </div>
        <button
          className="px-3 py-2 bg-slate-800 text-white rounded disabled:opacity-60"
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
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-card">
          <table className="min-w-full text-sm rounded-lg overflow-hidden">
            <thead className="text-slate-600">
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
                  className={idx % 2 === 0 ? 'border-t bg-white' : 'border-t bg-slate-50 hover:bg-slate-100'}
                >
                  <td className="py-2 px-3">
                    {edit[r.id] ? (
                      <input
                        className="border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                        className="border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                        className="border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                        className="border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                      r.quantity
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {edit[r.id] ? (
                      <input
                        className="border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                          className="btn btn-sm"
                          onClick={() => setEdit({ ...edit, [r.id]: { ...r } })}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={async () => {
                            if (!confirm('Delete this item?')) return;
                            setError(null);
                            setSuccess(null);
                            try {
                              await api.delete(`/inventory/${r.id}`);
                              setSuccess('Item deleted');
                              await load();
                            } catch (e: any) {
                              const err = (e?.response?.data as ApiError) || {};
                              setError(err.message || 'Failed to delete');
                            }
                          }}
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-sm"
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
                          Save
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() =>
                            setEdit(prev => {
                              const p = { ...prev };
                              delete p[r.id];
                              return p;
                            })
                          }
                        >
                          Cancel
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
    </div>
  )
}

export default Inventory
