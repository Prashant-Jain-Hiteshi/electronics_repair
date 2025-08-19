import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

type Repair = {
  id: string;
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  brand?: string;
  model?: string;
  issueDescription?: string;
  status: string;
  priority?: string;
  estimatedCost?: number | string | null;
  actualCost?: number | string | null;
  estimatedCompletionDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

const MyRepairOrders: React.FC = () => {
  const { token } = useAuth();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attMap, setAttMap] = useState<Record<string, Array<{ id: string; url: string; originalName: string }>>>({});
  const [query, setQuery] = useState('');
  const placeholder =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="100%" height="100%" fill="#f1f5f9"/><path fill="#94a3b8" d="M4 5a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H4zm3.5 3A1.5 1.5 0 1 1 6 9.5 1.5 1.5 0 0 1 7.5 8zm11.5 9H5l4-5 3 3 5-6 2.5 3.333V17z"/></svg>`
    );
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src !== placeholder) img.src = placeholder;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/repairs/mine');
        if (mounted) setRepairs(data.repairs || []);
      } catch (e: any) {
        if (mounted) setError(e?.response?.data?.message || 'Failed to fetch');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  // Load first attachments for each repair to show thumbnail
  useEffect(() => {
    let mounted = true;
    async function loadAtt(ids: string[]) {
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const { data } = await api.get(`/repairs/${id}/attachments`);
              return { id, atts: (data.attachments || []) as Array<{ id: string; url: string; originalName: string }> };
            } catch {
              return { id, atts: [] as Array<{ id: string; url: string; originalName: string }> };
            }
          })
        );
        if (!mounted) return;
        setAttMap((prev) => {
          const next = { ...prev } as typeof prev;
          for (const r of results) next[r.id] = r.atts;
          return next;
        });
      } catch {
        /* ignore */
      }
    }
    const ids = repairs.map((r) => r.id);
    if (ids.length) loadAtt(ids);
    return () => { mounted = false };
  }, [repairs]);

  const onCancel = async (id: string) => {
    if (!confirm('Cancel this repair request?')) return;
    try {
      await api.put(`/repairs/${id}/cancel`);
      setRepairs((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)));
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to cancel');
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repairs;
    return repairs.filter((r) =>
      [
        r.id.slice(0, 8),
        (r as any).deviceBrand ?? r.brand,
        (r as any).deviceModel ?? r.model,
        r.issueDescription,
        r.status,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [repairs, query]);

  return (
    <div className="p-4 sm:p-6 overflow-x-hidden">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold">My Repair Orders</h1>
        <Link to="/repairs/new" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + New Order
        </Link>
      </div>

      <div className="mb-4">
        <div className="relative max-w-xl">
          <input
            className="input w-full border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Search by ticket, device, issue, status..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-rose-50 p-3 text-rose-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-slate-500">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-slate-500">
          No repair orders yet. <Link to="/repairs/new" className="text-blue-600 hover:underline">Create one</Link>.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[70vh]">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-600">
              <th className="py-2 px-3 whitespace-nowrap">Preview</th>
              <th className="py-2 px-3 whitespace-nowrap">Ticket</th>
              <th className="py-2 px-3 whitespace-nowrap">Device</th>
              <th className="py-2 px-3 whitespace-nowrap">Status</th>
              <th className="py-2 px-3 whitespace-nowrap">ETA</th>
              <th className="py-2 px-3 whitespace-nowrap">Estimate</th>
              <th className="py-2 px-3 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 px-3 whitespace-nowrap">
                    {attMap[r.id]?.length ? (
                      <img
                        src={attMap[r.id][0].url}
                        alt={attMap[r.id][0].originalName}
                        className="h-12 w-16 object-cover rounded border bg-slate-50"
                        onError={handleImgError}
                      />
                    ) : (
                      <div className="h-12 w-16 flex items-center justify-center rounded border bg-slate-50 text-slate-400">
                        {/* camera/image placeholder icon (inline svg) */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                          <path d="M9 3a1 1 0 0 0-.894.553L7.382 5H5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3h-2.382l-.724-1.447A1 1 0 0 0 15 3H9zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3 font-medium whitespace-nowrap">{r.id.slice(0, 8)}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{[(r as any).deviceBrand ?? r.brand, (r as any).deviceModel ?? r.model].filter(Boolean).join(' ') || r.deviceType || '-'}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[r.status] || 'bg-slate-100 text-slate-700'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">{r.estimatedCompletionDate ? new Date(r.estimatedCompletionDate).toLocaleDateString() : '-'}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{formatCurrency(r.estimatedCost ?? r.actualCost)}</td>
                  <td className="py-2 px-3 flex gap-2 whitespace-nowrap">
                    <Link to={`/repairs/${r.id}`} className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50">Details</Link>
                    {r.status === 'pending' && (
                      <button onClick={() => onCancel(r.id)} className="rounded-md border px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyRepairOrders;
