import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

type Repair = {
  id: string;
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  brand?: string;
  model?: string;
  issueDescription?: string;
  diagnosis?: string | null;
  repairNotes?: string | null;
  status: string;
  priority?: string;
  estimatedCost?: number | string | null;
  actualCost?: number | string | null;
  estimatedCompletionDate?: string | null;
  actualCompletionDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type RepairPart = {
  id: string;
  repairOrderId: string;
  inventoryId: string;
  quantity: number;
  unitPrice?: number | string | null;
  Inventory?: { name?: string } | null;
};

type Payment = {
  id: string;
  repairOrderId: string;
  amount: number | string;
  method: 'cash' | 'card' | 'upi' | 'bank_transfer' | string;
  status?: string;
  transactionId?: string | null;
  paidAt?: string | null;
  notes?: string | null;
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  awaiting_parts: 'bg-purple-100 text-purple-800',
  completed: 'bg-emerald-100 text-emerald-800',
  delivered: 'bg-slate-100 text-slate-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

function formatCurrency(v: any) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n) || n === 0) return '-';
  return n.toLocaleString(undefined, { style: 'currency', currency: 'INR' });
}

const RepairOrderDetails: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [repair, setRepair] = useState<Repair | null>(null);
  const [parts, setParts] = useState<RepairPart[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payMethod, setPayMethod] = useState<'upi' | 'card' | 'cash' | 'bank_transfer'>('upi');
  const [attachments, setAttachments] = useState<Array<{ id: string; url: string; originalName: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [attIndex, setAttIndex] = useState(0);

  const placeholder =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="100%" height="100%" fill="#f1f5f9"/><path fill="#94a3b8" d="M4 5a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H4zm3.5 3A1.5 1.5 0 1 1 6 9.5 1.5 1.5 0 0 1 7.5 8zm11.5 9H5l4-5 3 3 5-6 2.5 3.333V17z"/></svg>`
    );
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src !== placeholder) {
      img.src = placeholder;
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [r, p, pay, atts] = await Promise.all([
          api.get(`/repairs/${id}`),
          api.get(`/repairs/${id}/parts`).catch(() => ({ data: { parts: [] } })),
          api.get(`/payments/repair/${id}`).catch(() => ({ data: { payments: [] } })),
          api.get(`/repairs/${id}/attachments`).catch(() => ({ data: { attachments: [] } })),
        ]);
        if (!mounted) return;
        setRepair(r.data.repair || r.data);
        setParts(p.data.parts || []);
        setPayments(pay.data.payments || []);
        setAttachments(atts.data.attachments || []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.response?.data?.message || 'Failed to load repair order');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  async function handleUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!id) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length > 3) {
      alert('Please select between 1 and 3 images.');
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    for (const f of files) {
      if (!allowed.includes(f.type)) {
        alert('Only JPG, PNG or WEBP images are allowed.');
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        alert('Each image must be under 5MB.');
        return;
      }
    }
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    try {
      setUploading(true);
      await api.post(`/repairs/${id}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // refresh attachments
      const atts = await api.get(`/repairs/${id}/attachments`);
      setAttachments(atts.data.attachments || []);
      // reset input
      e.target.value = '';
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const deviceText = useMemo(() => {
    if (!repair) return '-';
    const brand = (repair as any).deviceBrand ?? repair.brand;
    const model = (repair as any).deviceModel ?? repair.model;
    return [brand, model].filter(Boolean).join(' ') || repair.deviceType || '-';
  }, [repair]);

  const hasAttachments = attachments.length > 0;
  const currentAtt = hasAttachments ? attachments[Math.max(0, Math.min(attIndex, attachments.length - 1))] : null;
  const canShowUpload = user?.role === 'admin' || user?.role === 'technician';

  const totals = useMemo(() => {
    const partsTotal = parts.reduce((s, pr) => s + Number(pr.quantity || 0) * Number(pr.unitPrice || 0), 0);
    const repairCost = Number((repair as any)?.actualCost ?? (repair as any)?.estimatedCost ?? 0);
    const grandTotal = partsTotal + repairCost;
    const paymentsTotal = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const balance = Math.max(0, grandTotal - paymentsTotal);
    return { partsTotal, repairCost, grandTotal, paymentsTotal, balance };
  }, [parts, payments, repair]);

  const canInvoice = useMemo(() => totals.paymentsTotal > 0, [totals]);

  async function handleViewInvoice() {
    try {
      const res = await api.get(`/repairs/${id}/invoice`, { responseType: 'text' });
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(res.data as string);
        w.document.close();
      } else {
        alert('Popup blocked. Please allow popups for this site.');
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to load invoice');
    }
  }

  async function handleDownloadInvoicePDF() {
    try {
      const res = await api.get(`/repairs/${id}/invoice`, { responseType: 'text' });
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(res.data as string);
        w.document.close();
        // Give the new window a tick to render, then trigger print (user can Save as PDF)
        setTimeout(() => { try { w.print(); } catch (_) {} }, 300);
      } else {
        alert('Popup blocked. Please allow popups for this site.');
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to generate invoice PDF');
    }
  }

  async function handlePayNow() {
    if (!id) return;
    try {
      setPaying(true);
      await api.post('/payments', {
        repairOrderId: id,
        amount: totals.balance,
        method: payMethod,
      });
      // refresh payments
      const res = await api.get(`/payments/repair/${id}`);
      setPayments(res.data.payments || []);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <div className="p-4 sm:p-6">Loading...</div>;
  if (error) return <div className="p-4 sm:p-6 text-rose-700">{error}</div>;
  if (!repair) return <div className="p-4 sm:p-6">Not found</div>;

  return (
    <div className="p-3 sm:p-6 space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-lg sm:text-2xl font-semibold">Repair Details</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <Link to="/repairs" className="rounded-md border px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm hover:bg-slate-50">Back to My Orders</Link>
          {canInvoice ? (
            <>
              <button onClick={handleViewInvoice} className="rounded-md border px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm hover:bg-slate-50">View Invoice</button>
              <button onClick={handleDownloadInvoicePDF} className="rounded-md border px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm hover:bg-slate-50">Download PDF</button>
            </>
          ) : (
            <span className="text-xs text-slate-500">Invoice will be available after a payment is recorded.</span>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
        <div className="rounded-lg  p-3 sm:p-4 shadow-card sm:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500">Ticket</p>
              <p className="font-semibold">{repair.id.slice(0, 8)}</p>
            </div>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[repair.status] || 'bg-slate-100 text-slate-700'}`}>{repair.status}</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
            <div>
              <p className="text-slate-500 text-xs">Device</p>
              <p className="font-medium">{deviceText}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Priority</p>
              <p className="font-medium">{repair.priority || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Issue</p>
              <p className="font-medium">{repair.issueDescription || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">ETA</p>
              <p className="font-medium">{repair.estimatedCompletionDate ? new Date(repair.estimatedCompletionDate).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Estimate</p>
              <p className="font-medium">{formatCurrency(repair.estimatedCost ?? repair.actualCost)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg  p-3 sm:p-4 shadow-card">
          <p className="text-sm font-semibold mb-2">Payments</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Repair cost</span><span className="font-medium">{formatCurrency(totals.repairCost)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Parts</span><span className="font-medium">{formatCurrency(totals.partsTotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Payments</span><span className="font-medium">-{formatCurrency(totals.paymentsTotal)}</span></div>
            <div className="border-t pt-2 flex justify-between text-base"><span className="">Balance</span><span className="font-semibold">{formatCurrency(totals.balance)}</span></div>
          </div>
          <div className="mt-3 space-y-2">
            <label className="block text-xs text-slate-500">Method</label>
            <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value as any)}>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
            <button
              className="btn w-full disabled:opacity-50"
              disabled={paying || totals.balance <= 0}
              onClick={handlePayNow}
            >
              {paying ? 'Processing…' : `Pay ${formatCurrency(totals.balance)}`}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Attachments</p>
        </div>
        {!hasAttachments ? (
          <div className="text-slate-500 text-sm">No attachments yet.</div>
        ) : (
          <div>
            <div className="relative w-full">
              {currentAtt && (
                <img
                  src={currentAtt.url}
                  alt={currentAtt.originalName}
                  className="mx-auto w-auto max-w-full md:max-w-xl lg:max-w-2xl max-h-60 sm:max-h-80 md:max-h-96 object-contain rounded border bg-slate-50"
                  onError={handleImgError}
                />
              )}
              {attachments.length > 1 && (
                <>
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white"
                    onClick={() => setAttIndex((i) => (i - 1 + attachments.length) % attachments.length)}
                    aria-label="Previous"
                  >
                    ‹
                  </button>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white"
                    onClick={() => setAttIndex((i) => (i + 1) % attachments.length)}
                    aria-label="Next"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
            {attachments.length > 0 && (
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                {attachments.map((a, idx) => (
                  <button
                    key={a.id}
                    className={`shrink-0 rounded border ${idx===attIndex?'ring-2 ring-slate-500 border-slate-400':'border-slate-200'}`}
                    onClick={() => setAttIndex(idx)}
                    aria-label={`Preview image ${idx + 1}`}
                  >
                    <img src={a.url} alt={a.originalName} className="h-12 w-16 sm:h-14 sm:w-20 object-cover rounded" onError={handleImgError} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {canShowUpload && (
          <div className="mt-3">
            <label className="block text-xs text-slate-500 mb-1">Upload images (1–3, JPG/PNG/WEBP)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleUploadChange}
              className="block w-full text-sm file:mr-4 file:rounded-md file:border file:px-3 file:py-1.5 file:text-sm file:bg-white hover:file:bg-slate-50"
              disabled={uploading}
            />
            {uploading && <p className="text-xs text-slate-500 mt-1">Uploading…</p>}
          </div>
        )}
      </div>

      <div className="rounded-lg bg-white p-4 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Parts</p>
        </div>
        {parts.length === 0 ? (
          <div className="text-slate-500 text-sm">No parts added.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="py-2 px-3">Item</th>
                  <th className="py-2 px-3">Qty</th>
                  <th className="py-2 px-3">Unit Price</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2 px-3">{p?.Inventory?.name || p.inventoryId}</td>
                    <td className="py-2 px-3">{p.quantity}</td>
                    <td className="py-2 px-3">{formatCurrency(p.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-white p-4 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Payment history</p>
        </div>
        {payments.length === 0 ? (
          <div className="text-slate-500 text-sm">No payments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3">Txn ID</th>
                  <th className="py-2 px-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((pm) => (
                  <tr key={pm.id} className="border-t">
                    <td className="py-2 px-3">{pm.paidAt ? new Date(pm.paidAt).toLocaleString() : '-'}</td>
                    <td className="py-2 px-3 capitalize">{pm.method.replace('_', ' ')}</td>
                    <td className="py-2 px-3">{pm.transactionId || '-'}</td>
                    <td className="py-2 px-3">{formatCurrency(pm.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RepairOrderDetails;
