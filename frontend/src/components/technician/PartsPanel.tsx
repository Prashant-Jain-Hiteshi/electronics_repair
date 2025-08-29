import React, { useEffect, useMemo, useState } from 'react'
import { listInventory, listReservations, reservePart, cancelReservation, pickReservation, consumeReservation, scanBarcode, getReservationLabelUrl, type InventoryItem, type InventoryReservation } from '@/api/inventory'

export default function PartsPanel({ repairId, readOnly }: { repairId: string; readOnly?: boolean }) {
  const [inv, setInv] = useState<InventoryItem[]>([])
  const [reservations, setReservations] = useState<InventoryReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [qty, setQty] = useState<Record<string, string>>({})
  const [barcode, setBarcode] = useState('')
  const [scanResult, setScanResult] = useState<InventoryReservation | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [items, resvs] = await Promise.all([
        listInventory({ q: query || undefined }),
        listReservations({ repairOrderId: repairId }),
      ])
      setInv(Array.isArray(items) ? items : [])
      setReservations(Array.isArray(resvs) ? resvs.filter(r => r.repairOrderId === repairId) : [])
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load parts data')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repairId])

  const filteredInv = useMemo(() => {
    if (!query) return inv
    const q = query.toLowerCase()
    return inv.filter(i => [i.name, i.sku, i.brand, i.model].some(v => (v||'').toLowerCase().includes(q)))
  }, [inv, query])

  async function doReserve(itemId: string) {
    const n = Number(qty[itemId] || '1')
    if (!Number.isFinite(n) || n <= 0) {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: 'Enter a valid quantity' } }))
      return
    }
    setBusy(itemId)
    try {
      await reservePart(itemId, { repairOrderId: repairId, qty: n })
      setQty(prev => ({ ...prev, [itemId]: '' }))
      await load()
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'success', message: 'Part reserved' } }))
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: e?.response?.data?.message || 'Reserve failed' } }))
    } finally { setBusy(null) }
  }

  async function act(resId: string, fn: (id: string)=>Promise<any>, okMsg: string) {
    setBusy(resId)
    try {
      await fn(resId)
      await load()
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'success', message: okMsg } }))
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: e?.response?.data?.message || 'Action failed' } }))
    } finally { setBusy(null) }
  }

  async function handleScan() {
    if (!barcode.trim()) return
    setBusy('scan')
    try {
      const data = await scanBarcode(barcode.trim())
      const resv = data?.reservation || null
      setScanResult(resv)
      if (resv) {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'success', message: `Found reservation ${resv.id.slice(0,8)} (${resv.status})` } }))
      } else {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: 'No reservation matched barcode' } }))
      }
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { kind: 'error', message: e?.response?.data?.message || 'Scan failed' } }))
    } finally { setBusy(null) }
  }

  return (
    <div className="space-y-6">
      {/* Search & Inventory list */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <input className="rounded-md border px-3 py-1.5 text-sm grow min-w-[200px]" placeholder="Search parts (name, SKU, brand, model)" value={query} onChange={e=>setQuery(e.target.value)} />
          <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50" onClick={load} disabled={loading}>Search</button>
        </div>
        <div className="mt-3 text-xs text-slate-500">Showing {filteredInv.length} items</div>
        <div className="mt-2 border rounded-md divide-y">
          {loading ? (
            <div className="p-3 text-sm text-slate-600">Loading...</div>
          ) : filteredInv.length === 0 ? (
            <div className="p-3 text-sm text-slate-600">No items</div>
          ) : (
            filteredInv.slice(0, 20).map(it => (
              <div key={it.id} className="p-3 flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="min-w-0 shrink grow">
                  <div className="font-medium text-slate-800 truncate">{it.name} {it.sku ? `(${it.sku})` : ''}</div>
                  <div className="text-xs text-slate-500 truncate">{[it.brand, it.model, it.deviceType].filter(Boolean).join(' • ')}</div>
                </div>
                <div className="ml-auto text-sm text-slate-700">Avail: <span className="font-semibold">{it.availableQty ?? it.quantity ?? 0}</span></div>
                <input disabled={readOnly} type="number" min={1} className="rounded-md border px-2 py-1 text-sm w-20 sm:w-24" placeholder="Qty" value={qty[it.id] ?? ''} onChange={e=>setQty(prev=>({ ...prev, [it.id]: e.target.value }))} />
                <button disabled={readOnly || busy===it.id} onClick={()=>doReserve(it.id)} className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm hover:bg-emerald-700 disabled:opacity-50">{busy===it.id?'...':'Reserve'}</button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reservations */}
      <div>
        <div className="flex items-center justify-between">
          <div className="font-medium text-slate-800">Reservations</div>
          <div className="text-xs text-slate-500">{reservations.length} total</div>
        </div>
        <div className="mt-2 overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 px-3">Part</th>
                <th className="py-2 px-3">Qty</th>
                <th className="py-2 px-3">Barcode</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(r => (
                <tr key={r.id} className={`border-t ${scanResult?.id===r.id? 'bg-amber-50' : ''}`}>
                  <td className="py-2 px-3">
                    <div className="font-medium text-slate-800">{r.inventory?.name || r.inventoryId}</div>
                    <div className="text-xs text-slate-500">{r.inventory?.sku}</div>
                  </td>
                  <td className="py-2 px-3">{r.reservedQty}</td>
                  <td className="py-2 px-3"><code className="text-xs">{r.barcode || '-'}</code></td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${r.status==='reserved'?'bg-amber-100 text-amber-800': r.status==='picked'?'bg-blue-100 text-blue-800': r.status==='consumed'?'bg-emerald-100 text-emerald-800':'bg-rose-100 text-rose-800'}`}>{r.status}</span>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50" onClick={()=>window.open(getReservationLabelUrl(r.id), '_blank')}>Label</button>
                      <button disabled={readOnly || busy===r.id || r.status!=='reserved'} className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50" onClick={()=>act(r.id, pickReservation, 'Picked')}>Pick</button>
                      <button disabled={readOnly || busy===r.id || (r.status!=='reserved' && r.status!=='picked')} className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50" onClick={()=>act(r.id, consumeReservation, 'Consumed')}>Consume</button>
                      <button disabled={readOnly || busy===r.id || (r.status!=='reserved')} className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50" onClick={()=>act(r.id, cancelReservation, 'Cancelled')}>Cancel</button>
                    </div>
                  </td>
                </tr>
              ))}
              {reservations.length === 0 && !loading && (
                <tr><td colSpan={5} className="py-3 px-3 text-slate-600">No reservations yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barcode Scanner */}
      <div>
        <div className="font-medium text-slate-800">Barcode Scan</div>
        <div className="mt-2 flex items-center gap-2">
          <input className="rounded-md border px-3 py-1.5 text-sm w-full" placeholder="Focus here and scan barcode" value={barcode} onChange={e=>setBarcode(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); handleScan(); } }} />
          <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50" onClick={handleScan} disabled={busy==='scan'}>{busy==='scan'?'...':'Scan'}</button>
        </div>
        {scanResult && (
          <div className="mt-2 text-xs text-slate-600">Matched reservation: <code>{scanResult.id}</code> • Status: <span className="font-medium">{scanResult.status}</span></div>
        )}
      </div>

      {error && <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-700 text-sm">{error}</div>}
    </div>
  )
}
