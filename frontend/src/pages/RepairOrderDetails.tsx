import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import ThemedSelect from '@/components/common/ThemedSelect';

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
  // Dark-friendly pills with subtle borders. Purple accent for progress states.
  pending: 'text-amber-300 bg-amber-400/10 border border-amber-400/20',
  in_progress: 'text-[#A48AFB] bg-[#A48AFB]/10 border border-[#A48AFB]/20',
  awaiting_parts: 'text-[#A48AFB] bg-[#A48AFB]/10 border border-[#A48AFB]/20',
  completed: 'text-emerald-300 bg-emerald-400/10 border border-emerald-400/20',
  delivered: 'text-slate-300 bg-white/5 border border-white/10',
  cancelled: 'text-rose-300 bg-rose-400/10 border border-rose-400/20',
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
  

  

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [r, p, pay] = await Promise.all([
          api.get(`/repairs/${id}`),
          api.get(`/repairs/${id}/parts`).catch(() => ({ data: { parts: [] } })),
          api.get(`/payments/repair/${id}`).catch(() => ({ data: { payments: [] } })),
        ]);
        if (!mounted) return;
        setRepair(r.data.repair || r.data);
        setParts(p.data.parts || []);
        setPayments(pay.data.payments || []);
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

  

  const deviceText = useMemo(() => {
    if (!repair) return '-';
    const brand = (repair as any).deviceBrand ?? repair.brand;
    const model = (repair as any).deviceModel ?? repair.model;
    return [brand, model].filter(Boolean).join(' ') || repair.deviceType || '-';
  }, [repair]);

  

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
          <Link to="/repairs" className="rounded-md border border-white/10 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-white hover:bg-white/5">Back to My Orders</Link>
          {canInvoice ? (
            <>
              <button onClick={handleViewInvoice} className="rounded-md border border-white/10 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-white hover:bg-white/5">View Invoice</button>
              <button onClick={handleDownloadInvoicePDF} className="rounded-md border border-white/10 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-white hover:bg-white/5">Download PDF</button>
            </>
          ) : (
            <span className="text-xs text-slate-500">Invoice will be available after a payment is recorded.</span>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 p-3 sm:p-4 shadow-card sm:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500">Ticket</p>
              <p className="font-semibold">{repair.id.slice(0, 8)}</p>
            </div>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[repair.status] || 'bg-slate-100 text-slate-700'}`}>{repair.status}</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
            <div className="border-b border-white/10 pb-2">
              <p className="text-slate-500 text-xs">Device</p>
              <p className="font-medium">{deviceText}</p>
            </div>
            <div className="border-b border-white/10 pb-2">
              <p className="text-slate-500 text-xs">Priority</p>
              <p className="font-medium">{repair.priority || '-'}</p>
            </div>
            <div className="border-b border-white/10 pb-2">
              <p className="text-slate-500 text-xs">Issue</p>
              <p className="font-medium">{repair.issueDescription || '-'}</p>
            </div>
            <div className="border-b border-white/10 pb-2">
              <p className="text-slate-500 text-xs">ETA</p>
              <p className="font-medium">{repair.estimatedCompletionDate ? new Date(repair.estimatedCompletionDate).toLocaleDateString() : '-'}</p>
            </div>
            <div className="border-b border-white/10 pb-2 sm:border-b-0">
              <p className="text-slate-500 text-xs">Estimate</p>
              <p className="font-medium">{formatCurrency(repair.estimatedCost ?? repair.actualCost)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 p-3 sm:p-4 shadow-card">
          <p className="text-sm font-semibold mb-2">Payments</p>
          <div className="space-y-0.5 text-sm divide-y divide-white/10 rounded-md overflow-hidden">
            <div className="flex justify-between py-2 px-1"><span className="text-slate-400">Repair cost</span><span className="font-medium">{formatCurrency(totals.repairCost)}</span></div>
            <div className="flex justify-between py-2 px-1"><span className="text-slate-400">Parts</span><span className="font-medium">{formatCurrency(totals.partsTotal)}</span></div>
            <div className="flex justify-between py-2 px-1"><span className="text-slate-400">Payments</span><span className="font-medium">-{formatCurrency(totals.paymentsTotal)}</span></div>
            <div className="flex justify-between py-2 px-1 text-base"><span className="text-white">Balance</span><span className="font-semibold">{formatCurrency(totals.balance)}</span></div>
          </div>
          <div className="mt-3 space-y-2">
            <label className="block text-xs text-slate-500">Method</label>
            <ThemedSelect
              options={[
                { label: 'UPI', value: 'upi' },
                { label: 'Card', value: 'card' },
                { label: 'Cash', value: 'cash' },
                { label: 'Bank Transfer', value: 'bank_transfer' },
              ]}
              value={payMethod}
              onChange={(v) => setPayMethod(v as any)}
              placeholder="Select method"
            />
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

      

      <div className="rounded-lg border border-white/10 p-4 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Parts</p>
        </div>
        {parts.length === 0 ? (
          <div className="text-slate-500 text-sm">No parts added.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-300 border-b border-white/10">
                  <th className="py-2 px-3">Item</th>
                  <th className="py-2 px-3">Qty</th>
                  <th className="py-2 px-3">Unit Price</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p.id} className="border-t border-white/10 hover:bg-white/5">
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

      <div className="rounded-lg border border-white/10 p-4 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Payment history</p>
        </div>
        {payments.length === 0 ? (
          <div className="text-slate-500 text-sm">No payments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-300 border-b border-white/10">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3">Txn ID</th>
                  <th className="py-2 px-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((pm) => (
                  <tr key={pm.id} className="border-t border-white/10 hover:bg-white/5">
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
